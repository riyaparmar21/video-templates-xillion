#!/usr/bin/env python3
"""
analyze-ground-perspective.py

Analyzes an image to detect the ground plane angle and automatically
compute the correct CSS 3D perspective parameters (rotateX, scaleY,
perspective distance, text position) for the GroundCaptions template.

The pipeline:
  1. Detect the horizon line / ground plane using vanishing point estimation
  2. Compute a camera tilt angle from the detected geometry
  3. Map that tilt to CSS rotateX + scaleY values
  4. Find the best empty area for text placement
  5. Output a JSON snippet to merge into the spec

Usage:
  python3 scripts/analyze-ground-perspective.py <image_path> [--output spec.json]

This is designed to run as a preprocessing step before Remotion rendering.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def detect_vanishing_point(img_bgr):
    """
    Estimate the vertical vanishing point from line segments.
    Returns the vanishing point Y as a fraction of image height (0=top, 1=bottom),
    or None if not enough lines found.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Hough line detection
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=50,
                            minLineLength=w * 0.05, maxLineGap=20)

    if lines is None or len(lines) < 3:
        return None

    # Filter for lines that could indicate ground perspective
    # (not perfectly horizontal or vertical)
    perspective_lines = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = abs(math.atan2(y2 - y1, x2 - x1) * 180 / math.pi)
        # Keep lines between 10° and 80° from horizontal
        if 10 < angle < 80:
            perspective_lines.append((x1, y1, x2, y2))

    if len(perspective_lines) < 2:
        return None

    # Find intersections of perspective lines to estimate vanishing point
    intersections_y = []
    for i in range(len(perspective_lines)):
        for j in range(i + 1, min(i + 20, len(perspective_lines))):
            x1, y1, x2, y2 = perspective_lines[i]
            x3, y3, x4, y4 = perspective_lines[j]

            denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
            if abs(denom) < 1e-6:
                continue

            t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
            iy = y1 + t * (y2 - y1)

            # Only count intersections within reasonable range
            if -h < iy < 2 * h:
                intersections_y.append(iy / h)

    if not intersections_y:
        return None

    # Use median to reject outliers
    vp_y = float(np.median(intersections_y))
    return max(0.0, min(1.0, vp_y))


def estimate_camera_tilt(img_bgr):
    """
    Estimate camera tilt angle (degrees from horizontal ground plane).
    Returns angle in degrees:
      - 90° = looking straight down (top-down / drone shot)
      - 45° = typical eye-level looking at ground
      - 10° = nearly eye-level, ground barely visible

    Uses multiple heuristics:
    1. Vanishing point position (high VP = steep camera angle)
    2. Edge direction histogram (top-down has mostly horizontal/vertical edges)
    3. Texture gradient (ground gets finer toward horizon in angled shots)
    """
    h, w = img_bgr.shape[:2]

    # Heuristic 1: Vanishing point
    vp_y = detect_vanishing_point(img_bgr)

    # Heuristic 2: Edge direction analysis
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Sobel gradients
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    magnitudes = np.sqrt(gx**2 + gy**2)
    angles = np.arctan2(gy, gx) * 180 / np.pi

    # Strong edges only
    mask = magnitudes > np.percentile(magnitudes, 75)

    if np.sum(mask) > 0:
        strong_angles = angles[mask]
        # In top-down shots, edges are more uniformly distributed
        # In angled shots, there's a strong convergence toward vanishing point
        angle_hist, _ = np.histogram(strong_angles, bins=36, range=(-180, 180))
        angle_hist = angle_hist.astype(float)
        angle_hist /= angle_hist.sum() + 1e-6

        # Entropy of angle distribution: high = top-down, low = strong vanishing
        entropy = -np.sum(angle_hist * np.log2(angle_hist + 1e-10))
        max_entropy = np.log2(36)  # uniform distribution
        uniformity = entropy / max_entropy  # 0 to 1, higher = more top-down
    else:
        uniformity = 0.5

    # Heuristic 3: Texture density gradient
    # In angled shots, the top of the image (farther) has denser texture
    top_third = gray[:h // 3, :]
    bot_third = gray[2 * h // 3:, :]

    top_var = np.var(cv2.Laplacian(top_third, cv2.CV_64F))
    bot_var = np.var(cv2.Laplacian(bot_third, cv2.CV_64F))
    texture_ratio = top_var / (bot_var + 1e-6)
    # ratio > 1 means top is more detailed → angled view
    # ratio ≈ 1 means uniform → top-down view

    # Combine heuristics into a camera tilt estimate
    scores = []

    # Vanishing point score
    if vp_y is not None:
        # VP near top of image → steep angle (looking down)
        # VP near middle → moderate angle
        # VP below image → very shallow angle
        vp_score = 90 * (1 - vp_y) + 10  # maps 0→100°, 1→10°
        vp_score = max(10, min(90, vp_score))
        scores.append(("vanishing_point", vp_score, 0.4))

    # Edge uniformity score
    uni_tilt = 20 + uniformity * 70  # maps 0→20°, 1→90°
    scores.append(("edge_uniformity", uni_tilt, 0.3))

    # Texture gradient score
    if texture_ratio > 1.5:
        # Strong gradient → angled view
        tex_tilt = 30 + min(40, (texture_ratio - 1) * 15)
    elif texture_ratio < 0.7:
        # Reverse gradient → likely top-down or unusual
        tex_tilt = 70
    else:
        # Uniform → likely top-down
        tex_tilt = 65 + (1 - abs(texture_ratio - 1)) * 20
    scores.append(("texture_gradient", tex_tilt, 0.3))

    # Weighted average
    total_weight = sum(s[2] for s in scores)
    tilt = sum(s[1] * s[2] for s in scores) / total_weight

    details = {s[0]: round(s[1], 1) for s in scores}
    details["vp_y"] = round(vp_y, 3) if vp_y is not None else None
    details["uniformity"] = round(uniformity, 3)
    details["texture_ratio"] = round(texture_ratio, 3)

    return round(tilt, 1), details


def find_empty_region(img_bgr):
    """
    Find the largest empty (low-detail) region in the image for text placement.
    Returns (x%, y%) center of the best region as fractions of image dimensions.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Compute detail map using Laplacian
    detail = cv2.Laplacian(gray, cv2.CV_64F)
    detail = np.abs(detail)

    # Block-based analysis (divide into grid)
    grid_rows, grid_cols = 8, 6
    block_h = h // grid_rows
    block_w = w // grid_cols

    block_scores = np.zeros((grid_rows, grid_cols))
    for r in range(grid_rows):
        for c in range(grid_cols):
            region = detail[r * block_h:(r + 1) * block_h,
                           c * block_w:(c + 1) * block_w]
            block_scores[r, c] = np.mean(region)

    # Find the block with minimum detail (most empty)
    # Also consider a 2x2 neighborhood for larger empty areas
    best_score = float("inf")
    best_r, best_c = grid_rows // 2, grid_cols // 2

    for r in range(grid_rows - 1):
        for c in range(grid_cols - 1):
            # Average of 2x2 block region
            score = np.mean(block_scores[r:r + 2, c:c + 2])
            if score < best_score:
                best_score = score
                best_r = r
                best_c = c

    # Center of the best 2x2 region
    center_y = (best_r + 1) * block_h / h
    center_x = (best_c + 1) * block_w / w

    # Convert to percentage
    return round(center_x * 100, 1), round(center_y * 100, 1)


def tilt_to_css_params(camera_tilt_deg):
    """
    Map a camera tilt angle to CSS 3D perspective parameters.

    camera_tilt_deg: how steeply the camera looks down at the ground
      - 90° = straight down → rotateX needs to be very high (75-85°)
      - 45° = moderate angle → rotateX ~60°
      - 20° = shallow angle → rotateX ~40°

    Returns: (rotateX, scaleY, perspective_distance)
    """
    # rotateX: the steeper the camera, the more tilt needed
    # Maps camera tilt [20°-90°] → rotateX [40°-82°]
    rotateX = 30 + (camera_tilt_deg - 20) * (52 / 70)
    rotateX = max(35, min(82, rotateX))

    # scaleY: compensate for foreshortening
    # At rotateX degrees, apparent height = original * cos(rotateX)
    # We need scaleY ≈ 1 / cos(rotateX) but capped for readability
    cos_val = math.cos(math.radians(rotateX))
    scaleY = 1.0 / max(cos_val, 0.1)
    # Cap at 5.0 for readability, floor at 1.5
    scaleY = max(1.5, min(5.0, scaleY))

    # Perspective distance: closer camera → shorter perspective
    # Steeper camera → larger perspective value (more subtle convergence)
    perspective = 600 + (camera_tilt_deg - 20) * (600 / 70)
    perspective = max(500, min(1200, perspective))

    return round(rotateX, 1), round(scaleY, 2), round(perspective)


def analyze_image(image_path):
    """Full analysis pipeline. Returns the recommended spec values."""
    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    h, w = img_bgr.shape[:2]

    # 1. Estimate camera tilt
    camera_tilt, tilt_details = estimate_camera_tilt(img_bgr)

    # 2. Map to CSS parameters
    rotateX, scaleY, perspective_dist = tilt_to_css_params(camera_tilt)

    # 3. Find best text placement
    pos_x, pos_y = find_empty_region(img_bgr)

    result = {
        "perspective": {
            "distance": perspective_dist,
            "rotateX": rotateX,
            "scaleY": scaleY,
        },
        "position": {
            "x": pos_x,
            "y": pos_y,
        },
        "_analysis": {
            "image": str(image_path),
            "dimensions": f"{w}x{h}",
            "estimated_camera_tilt_deg": camera_tilt,
            "heuristics": tilt_details,
        },
    }

    return result


def main():
    parser = argparse.ArgumentParser(
        description="Analyze image ground plane for GroundCaptions template"
    )
    parser.add_argument("image", help="Path to the background image")
    parser.add_argument("--output", "-o", help="Write full spec JSON to this path")
    parser.add_argument("--merge", "-m", help="Merge into existing spec JSON file")
    args = parser.parse_args()

    result = analyze_image(args.image)

    print("\n── Ground Perspective Analysis ──")
    print(f"  Image:        {result['_analysis']['image']}")
    print(f"  Dimensions:   {result['_analysis']['dimensions']}")
    print(f"  Camera tilt:  {result['_analysis']['estimated_camera_tilt_deg']}°")
    print(f"  Heuristics:   {json.dumps(result['_analysis']['heuristics'], indent=2)}")
    print()
    print(f"  → rotateX:    {result['perspective']['rotateX']}°")
    print(f"  → scaleY:     {result['perspective']['scaleY']}")
    print(f"  → perspective: {result['perspective']['distance']}px")
    print(f"  → position:   ({result['position']['x']}%, {result['position']['y']}%)")
    print()

    # Remove internal analysis from output
    output = {k: v for k, v in result.items() if not k.startswith("_")}

    if args.merge:
        # Merge into existing spec
        with open(args.merge) as f:
            spec = json.load(f)
        spec["perspective"] = output["perspective"]
        spec["position"] = output["position"]
        with open(args.merge, "w") as f:
            json.dump(spec, f, indent=2)
        print(f"Merged into: {args.merge}")

    elif args.output:
        with open(args.output, "w") as f:
            json.dump(output, f, indent=2)
        print(f"Written to: {args.output}")

    else:
        print("Spec snippet (copy into your ground-captions-spec.json):")
        print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
