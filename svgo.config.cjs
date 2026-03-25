/**
 * SVGO Configuration — Remotion-Safe
 *
 * Custom config that optimizes SVGs without breaking animation capabilities.
 * Key principle: strip bloat, keep structure needed for stroke animation + morphing.
 *
 * Usage:
 *   npx svgo -f assets/svg -r --config assets/svgo.config.js
 *   npx svgo -i single-file.svg --config assets/svgo.config.js
 */

module.exports = {
  multipass: true, // Run multiple passes for better optimization

  plugins: [
    // === ENABLED (safe for Remotion) ===

    // Remove XML declaration, comments, metadata
    "removeDoctype",
    "removeXMLProcInst",
    "removeComments",
    "removeMetadata",
    "removeEditorsNSData",        // Strip Inkscape/Illustrator namespace data
    "removeDesc",                  // Remove <desc> elements
    "removeTitle",                 // Remove <title> elements (we don't need accessibility in video)

    // Clean up attributes
    "removeEmptyAttrs",
    "removeEmptyContainers",
    "removeUnusedNS",              // Remove unused namespace declarations
    "removeUselessDefs",           // Remove empty <defs>
    "removeUselessStrokeAndFill",  // Remove stroke/fill when they have no effect

    // Optimize values
    {
      name: "cleanupNumericValues",
      params: {
        floatPrecision: 2,         // Round to 2 decimal places (good balance)
      },
    },
    "cleanupListOfValues",
    {
      name: "cleanupIds",
      params: {
        minify: false,             // Don't minify IDs — we may reference them in Remotion
      },
    },

    // Optimize paths
    {
      name: "convertPathData",
      params: {
        floatPrecision: 2,
        transformPrecision: 3,
        makeArcs: {
          threshold: 2.5,
          tolerance: 0.5,
        },
      },
    },

    // Collapse useless transforms
    "convertTransform",

    // Sort attributes for consistency
    "sortAttrs",

    // Remove default attribute values that browsers assume anyway
    "removeUnknownsAndDefaults",


    // === DISABLED (would break Remotion animation) ===

    // DO NOT remove viewBox — Remotion needs it for scaling
    {
      name: "removeViewBox",
      active: false,
    },

    // DO NOT merge paths — breaks individual path animation & morphing
    {
      name: "mergePaths",
      active: false,
    },

    // DO NOT convert shapes to paths — we want <circle>, <rect> etc.
    // to stay as-is for targeted animation (e.g., animate r on circle)
    {
      name: "convertShapeToPath",
      active: false,
    },

    // DO NOT collapse groups — groups may be animation targets
    {
      name: "collapseGroups",
      active: false,
    },

    // DO NOT inline styles — Remotion handles styles via React props
    {
      name: "inlineStyles",
      active: false,
    },

    // DO NOT minify styles — keep them readable for debugging
    {
      name: "minifyStyles",
      active: false,
    },

    // DO NOT remove hidden elements — they might be revealed by animation
    {
      name: "removeHiddenElems",
      active: false,
    },

    // DO NOT move group attrs to elements — keeps animation hierarchy
    {
      name: "moveGroupAttrsToElems",
      active: false,
    },

    // DO NOT move elements attrs to group — same reason
    {
      name: "moveElemsAttrsToGroup",
      active: false,
    },

    // DO NOT remove dimensions — keep width/height if present
    {
      name: "removeDimensions",
      active: false,
    },
  ],
};
