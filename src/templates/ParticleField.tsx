import React from "react";
import {
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Easing,
	random,
} from "remotion";
import { TemplateProps } from "../engine/schema";
import { rgba, hexToRgb, fadeIn, glowShadow } from "../lib/animations";

interface Particle {
	x: number;
	y: number;
	size: number;
	speed: number;
	delay: number;
	opacity: number;
	hue: number;
}

interface MatrixChar {
	char: string;
	column: number;
	index: number;
}

export const ParticleField: React.FC<TemplateProps> = ({ params, palette }) => {
	const frame = useCurrentFrame();
	const { fps, width, height } = useVideoConfig();

	// Parse parameters with defaults
	const preset = (params.preset as string) || "stars";
	const count = (params.count as number) || 60;
	const speed = (params.speed as number) || 1;
	const title = (params.title as string) || "";
	const subtitle = (params.subtitle as string) || "";
	const overlayText = (params.overlayText as string) || "";
	const opacity = (params.opacity as number) || 1;
	const colorMode = (params.colorMode as string) || "palette";

	// Color palette
	const defaultPalette: string[] = [
		palette.primary,
		palette.secondary,
		palette.accent,
		palette.text,
	].filter(Boolean);
	const fallbackPalette: string[] = [
		"#00ff88",
		"#00ccff",
		"#ff00ff",
		"#ffff00",
		"#ff6600",
		"#00ffff",
		"#ff0088",
		"#88ff00",
	];
	const colorPalette = defaultPalette.length >= 3 ? defaultPalette : fallbackPalette;
	const backgroundColor =
		(params.backgroundColor as string) ||
		(params.background as string) ||
		palette.background ||
		"#000000";

	// Generate particles deterministically
	const particles: Particle[] = React.useMemo(() => {
		return Array.from({ length: count }, (_, i: number) => ({
			x: random(`x-${i}`) * width,
			y: random(`y-${i}`) * height,
			size: 2 + random(`s-${i}`) * 6,
			speed: 0.5 + random(`sp-${i}`) * 1.5,
			delay: random(`d-${i}`) * 60,
			opacity: 0.3 + random(`o-${i}`) * 0.7,
			hue: random(`h-${i}`) * 360,
		}));
	}, [count, width, height]);

	// Get color for a particle
	const getParticleColor = (particle: Particle, index: number): string => {
		if (colorMode === "white") {
			return "#ffffff";
		} else if (colorMode === "rainbow") {
			return `hsl(${particle.hue}, 100%, 60%)`;
		} else {
			// palette mode
			return colorPalette[index % colorPalette.length];
		}
	};

	// PRESET: Stars
	const renderStars = (): React.ReactNode => {
		const heroCount = Math.ceil(count * 0.1); // 10% are hero stars
		return particles.map((particle: Particle, i: number) => {
			const isHero = i < heroCount;
			const adjustedFrame = frame - particle.delay;
			const visibility = adjustedFrame < 0 ? 0 : 1;

			// Twinkle effect
			const twinklePhase = adjustedFrame * 0.05 + (particle.delay * 0.5) / 60;
			const twinkleOpacity =
				0.5 + 0.5 * Math.sin(twinklePhase) * particle.opacity;

			// Parallax: hero stars move slower (parallax depth)
			const parallaxFactor = isHero ? 0.3 : 0.7;
			const driftY =
				(adjustedFrame * particle.speed * parallaxFactor * speed) / 60;

			const color = getParticleColor(particle, i);
			const size = isHero ? particle.size * 1.5 : particle.size;

			return (
				<div
					key={`star-${i}`}
					style={{
						position: "absolute",
						left: particle.x,
						top: particle.y - driftY,
						width: size,
						height: size,
						backgroundColor: color,
						borderRadius: "50%",
						opacity: twinkleOpacity * visibility,
						boxShadow: isHero
							? `0 0 ${size * 3}px ${color}, 0 0 ${size * 6}px ${color}80`
							: `0 0 ${size * 1.5}px ${color}`,
						transition: "none",
					}}
				/>
			);
		});
	};

	// PRESET: Snow
	const renderSnow = (): React.ReactNode => {
		return particles.map((particle: Particle, i: number) => {
			const adjustedFrame = frame - particle.delay;
			const visibility = adjustedFrame < 0 ? 0 : 1;

			// Vertical fall
			const fallDistance =
				(adjustedFrame * particle.speed * speed * height) / (60 * 5);
			const wrappedY = (particle.y + fallDistance) % (height + particle.size);

			// Horizontal wobble
			const wobblePhase = adjustedFrame * 0.02 + (particle.delay * 0.1) / 60;
			const wobbleX = Math.sin(wobblePhase) * 20;

			// Depth-of-field blur based on size
			const blur = (particle.size / 8) * 2;
			const color = getParticleColor(particle, i);

			return (
				<div
					key={`snow-${i}`}
					style={{
						position: "absolute",
						left: particle.x + wobbleX,
						top: wrappedY,
						width: particle.size,
						height: particle.size,
						backgroundColor: color,
						borderRadius: "50%",
						opacity: particle.opacity * visibility,
						filter: `blur(${blur}px)`,
						transition: "none",
					}}
				/>
			);
		});
	};

	// PRESET: Fireflies
	const renderFireflies = (): React.ReactNode => {
		return particles.map((particle: Particle, i: number) => {
			const adjustedFrame = frame - particle.delay;
			const visibility = adjustedFrame < 0 ? 0 : 1;

			// Multi-sine noise approximation for drift
			const noiseSeed1 = Math.sin((adjustedFrame * 0.01 + i) * 0.5) * 40;
			const noiseSeed2 =
				Math.sin((adjustedFrame * 0.007 + i * 2) * 0.3) * 30;
			const noiseSeed3 =
				Math.sin((adjustedFrame * 0.003 + i * 3) * 0.2) * 20;

			const driftX = noiseSeed1 + noiseSeed2;
			const driftY = noiseSeed3 + Math.sin(adjustedFrame * 0.015 + i) * 10;

			// Glow pulse
			const glowPhase = adjustedFrame * 0.05 + (i * Math.PI) / count;
			const glowIntensity = 0.6 + 0.4 * Math.sin(glowPhase);

			// Warm colors for fireflies
			const warmHues = [45, 60, 75]; // Yellows and greens
			const hue = warmHues[i % warmHues.length];
			const color = `hsl(${hue}, 100%, 50%)`;

			const size = particle.size * 0.8;

			return (
				<div
					key={`firefly-${i}`}
					style={{
						position: "absolute",
						left: particle.x + driftX,
						top: particle.y + driftY,
						width: size,
						height: size,
						backgroundColor: color,
						borderRadius: "50%",
						opacity: (particle.opacity * glowIntensity * visibility) / 1.5,
						boxShadow: `
              0 0 ${size * 2}px ${color},
              0 0 ${size * 4}px ${color}80,
              0 0 ${size * 8}px ${color}40
            `,
						transition: "none",
					}}
				/>
			);
		});
	};

	// PRESET: Matrix
	const renderMatrix = (): React.ReactNode => {
		const charPool = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン".split(
			""
		);
		const columns = Math.ceil(Math.sqrt(count));
		const columnWidth = width / columns;

		const matrixChars: MatrixChar[] = [];
		for (let col = 0; col < columns; col++) {
			for (let idx = 0; idx < Math.ceil(count / columns); idx++) {
				if (matrixChars.length < count) {
					matrixChars.push({
						char: charPool[random(`char-${col}-${idx}`) * charPool.length | 0],
						column: col,
						index: idx,
					});
				}
			}
		}

		return (
			<div style={{ position: "relative", width: "100%", height: "100%" }}>
				{matrixChars.map((entry: MatrixChar, idx: number) => {
					const adjustedFrame = frame - random(`delay-${idx}`) * 30;
					const visibility = adjustedFrame < 0 ? 0 : 1;

					// Column-specific speed variation
					const columnSpeed = 0.5 + random(`colspeed-${entry.column}`) * 1.5;
					const fallDistance = (adjustedFrame * columnSpeed * speed * height) / 60;
					const wrappedY = (entry.index * 20 + fallDistance) % (height + 100);

					// Character changes periodically
					const charChangeFrame = (adjustedFrame * 0.1) | 0;
					const charIndex = (charChangeFrame + idx) % charPool.length;
					const currentChar = charPool[charIndex];

					// Head is bright, trailing fades
					const distFromHead = (adjustedFrame / (height / 20)) % 1;
					const trailOpacity = Math.max(
						0,
						1 - distFromHead * distFromHead
					);

					const color = getParticleColor(
						particles[idx % particles.length],
						idx
					);

					return (
						<div
							key={`matrix-${idx}`}
							style={{
								position: "absolute",
								left: entry.column * columnWidth,
								top: wrappedY,
								fontSize: "14px",
								fontFamily: "monospace",
								color: color,
								opacity: trailOpacity * visibility,
								fontWeight: "bold",
								letterSpacing: "2px",
								textShadow: `0 0 10px ${color}`,
								transition: "none",
							}}
						>
							{currentChar}
						</div>
					);
				})}
			</div>
		);
	};

	// PRESET: Bubbles
	const renderBubbles = (): React.ReactNode => {
		return particles.map((particle: Particle, i: number) => {
			const adjustedFrame = frame - particle.delay;
			const visibility = adjustedFrame < 0 ? 0 : 1;

			// Float upward
			const floatDistance =
				(adjustedFrame * particle.speed * speed * height) / (60 * 3);
			const currentY = Math.max(-particle.size, particle.y - floatDistance);

			// Wobble side to side
			const wobblePhase = adjustedFrame * 0.03 + (particle.delay * 0.1) / 60;
			const wobbleX = Math.sin(wobblePhase) * 15;

			// Pop effect at top
			const popThreshold = height * 0.1;
			const distToTop = currentY;
			const popScale =
				distToTop < popThreshold
					? interpolate(distToTop, [popThreshold, -10], [1, 0], {
							easing: Easing.out(Easing.cubic),
						})
					: 1;

			const color = getParticleColor(particle, i);
			const size = particle.size * 3;

			// Glossy gradient effect
			const gradientColor = `radial-gradient(circle at 30% 30%, ${color}, ${color}80)`;

			return (
				<div
					key={`bubble-${i}`}
					style={{
						position: "absolute",
						left: particle.x + wobbleX,
						top: currentY,
						width: size * popScale,
						height: size * popScale,
						borderRadius: "50%",
						background: gradientColor,
						opacity: (particle.opacity * 0.6 * visibility) / 1.5,
						boxShadow: `
              inset -2px -2px 5px rgba(0,0,0,0.3),
              0 0 ${size * 0.5}px ${color}40
            `,
						transition: "none",
					}}
				/>
			);
		});
	};

	// PRESET: Dust
	const renderDust = (): React.ReactNode => {
		// Macro wind direction that shifts over time
		const windPhase = (frame * 0.001) % (Math.PI * 2);
		const macroWind = Math.sin(windPhase) * width * 0.3;

		return particles.map((particle: Particle, i: number) => {
			const adjustedFrame = frame - particle.delay;
			const visibility = adjustedFrame < 0 ? 0 : 1;

			// Gentle drift with macro wind
			const driftX = macroWind + Math.sin(adjustedFrame * 0.005 + i) * 10;
			const driftY = Math.sin(adjustedFrame * 0.003 + i * 0.5) * 20;

			const color = getParticleColor(particle, i);
			const size = particle.size * 0.4; // Tiny particles

			return (
				<div
					key={`dust-${i}`}
					style={{
						position: "absolute",
						left: particle.x + driftX,
						top: particle.y + driftY,
						width: size,
						height: size,
						backgroundColor: color,
						borderRadius: "50%",
						opacity: (particle.opacity * 0.15 * visibility) / 2,
						filter: "blur(0.5px)",
						transition: "none",
					}}
				/>
			);
		});
	};

	// PRESET: Constellation
	const renderConstellation = (): React.ReactNode => {
		// Update particle positions for constellation
		const constellationParticles = particles.map((particle: Particle, i: number) => {
			const adjustedFrame = frame - particle.delay;
			const driftX = Math.sin(adjustedFrame * 0.01 + i) * 30;
			const driftY = Math.cos(adjustedFrame * 0.008 + i) * 20;
			return {
				...particle,
				x: particle.x + driftX,
				y: particle.y + driftY,
				index: i,
			};
		});

		// Calculate distances for lines
		const connectionDistance = Math.sqrt(width * width + height * height) * 0.15;
		const lines: Array<{
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			distance: number;
		}> = [];

		for (let i = 0; i < constellationParticles.length; i++) {
			for (let j = i + 1; j < constellationParticles.length; j++) {
				const p1 = constellationParticles[i];
				const p2 = constellationParticles[j];
				const dx = p2.x - p1.x;
				const dy = p2.y - p1.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < connectionDistance) {
					lines.push({
						x1: p1.x,
						y1: p1.y,
						x2: p2.x,
						y2: p2.y,
						distance: distance,
					});
				}
			}
		}

		const color = getParticleColor(particles[0], 0);

		return (
			<>
				{/* SVG lines overlay */}
				<svg
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						pointerEvents: "none",
					}}
				>
					{lines.map((line, idx: number) => {
						const lineOpacity = interpolate(
							line.distance,
							[0, connectionDistance],
							[0.6, 0.1],
							{ easing: Easing.linear }
						);
						return (
							<line
								key={`line-${idx}`}
								x1={line.x1}
								y1={line.y1}
								x2={line.x2}
								y2={line.y2}
								stroke={color}
								strokeWidth="1"
								opacity={lineOpacity}
							/>
						);
					})}
				</svg>

				{/* Particles as dots */}
				{constellationParticles.map((p, i: number) => {
					const adjustedFrame = frame - p.delay;
					const visibility = adjustedFrame < 0 ? 0 : 1;
					const color = getParticleColor(particles[i], i);

					return (
						<div
							key={`const-dot-${i}`}
							style={{
								position: "absolute",
								left: p.x,
								top: p.y,
								width: p.size,
								height: p.size,
								backgroundColor: color,
								borderRadius: "50%",
								opacity: p.opacity * visibility,
								boxShadow: `0 0 ${p.size * 1.5}px ${color}`,
								transition: "none",
							}}
						/>
					);
				})}
			</>
		);
	};

	// Render based on preset
	const renderPreset = (): React.ReactNode => {
		switch (preset) {
			case "snow":
				return renderSnow();
			case "fireflies":
				return renderFireflies();
			case "matrix":
				return renderMatrix();
			case "bubbles":
				return renderBubbles();
			case "dust":
				return renderDust();
			case "constellation":
				return renderConstellation();
			case "stars":
			default:
				return renderStars();
		}
	};

	return (
		<div
			style={{
				position: "relative",
				width: "100%",
				height: "100%",
				overflow: "hidden",
				backgroundColor: backgroundColor,
			}}
		>
			{/* Particle field background */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					pointerEvents: "none",
				}}
			>
				{renderPreset()}
			</div>

			{/* Title overlay */}
			{title && (
				<div
					style={{
						position: "absolute",
						top: "20%",
						left: 0,
						width: "100%",
						textAlign: "center",
						color: "#ffffff",
						fontSize: "48px",
						fontWeight: "bold",
						zIndex: 10,
						textShadow: "0 0 20px rgba(0,0,0,0.8)",
					}}
				>
					{title}
				</div>
			)}

			{/* Subtitle overlay */}
			{subtitle && (
				<div
					style={{
						position: "absolute",
						top: "50%",
						left: 0,
						width: "100%",
						textAlign: "center",
						color: "#cccccc",
						fontSize: "28px",
						fontWeight: "300",
						zIndex: 10,
						textShadow: "0 0 15px rgba(0,0,0,0.8)",
					}}
				>
					{subtitle}
				</div>
			)}

			{/* Overlay text */}
			{overlayText && (
				<div
					style={{
						position: "absolute",
						bottom: "10%",
						left: 0,
						width: "100%",
						textAlign: "center",
						color: "#ffffff",
						fontSize: "20px",
						zIndex: 10,
						textShadow: "0 0 10px rgba(0,0,0,0.8)",
					}}
				>
					{overlayText}
				</div>
			)}
		</div>
	);
};
