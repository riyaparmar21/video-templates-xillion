import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  random,
} from "remotion";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "../engine/schema";
import {
  fadeIn,
  slideIn,
  scaleIn,
  rgba,
  hexToRgb,
  glowShadow,
  depthShadow,
  staggerDelay,
  float,
  breathe,
  pulseGlow,
} from "../lib/animations";

// Chart item type
interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

// Resolved item (color always assigned)
interface ResolvedItem {
  label: string;
  value: number;
  color: string;
}

export const AnimatedChart: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ── Chart params with defaults ──
  const rawChartType: string = (params.chartType as string) || "bar";
  const chartType: string = rawChartType === "area" ? "line" : rawChartType;
  const title: string = (params.title as string) || "Data Overview";
  const subtitle: string = (params.subtitle as string) || "";
  const items: ChartItem[] =
    (params.items as ChartItem[]) ||
    (params.data as ChartItem[]) ||
    [
      { label: "Category A", value: 75 },
      { label: "Category B", value: 55 },
      { label: "Category C", value: 90 },
      { label: "Category D", value: 40 },
      { label: "Category E", value: 65 },
    ];
  const showLabels: boolean = params.showLabels !== false;
  const showValues: boolean = params.showValues !== false;
  const animate: boolean = params.animate !== false;
  const valuePrefix: string = (params.prefix as string) || "";
  const valueSuffix: string = (params.suffix as string) || "";
  const maxValue: number =
    (params.maxValue as number) || Math.max(...items.map((i) => i.value));

  const formatValue = (v: number) => `${valuePrefix}${Math.round(v)}${valueSuffix}`;

  // ── Default color palette for items ──
  const defaultColors: string[] = [
    palette.primary,
    palette.secondary,
    palette.accent,
    palette.text,
  ];

  // Assign colors to items
  const coloredItems: ResolvedItem[] = items.map((item: ChartItem, idx: number) => ({
    label: item.label,
    value: item.value,
    color: item.color || defaultColors[idx % defaultColors.length],
  }));

  // ── Scene-level animations ──
  const titleSlide = slideIn(frame, 0, "up", 40, 25);
  const titleOp: number = fadeIn(frame, 0, 20);
  const subtitleOp: number = fadeIn(frame, 5, 15);

  // ── Chart dimensions (responsive to canvas) ──
  const chartCenterX: number = width / 2;
  const chartCenterY: number = height / 2 + 40;
  const chartRadius: number = Math.min(200, width * 0.2);
  const responsiveChartWidth: number = Math.min(900, width * 0.88);
  const responsiveChartHeight: number = Math.min(600, height * 0.35);

  // ── Render title and subtitle ──
  const renderHeader = (): JSX.Element => (
    <div
      style={{
        position: "absolute",
        top: "12%",
        left: 0,
        right: 0,
        textAlign: "center",
        zIndex: 20,
        padding: "0 40px",
      }}
    >
      <h1
        style={{
          fontSize: "64px",
          fontWeight: 700,
          color: palette.text,
          fontFamily: typography.heading,
          opacity: titleOp,
          transform: `translateY(${titleSlide.y}px)`,
          margin: 0,
          letterSpacing: "-0.5px",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            fontSize: "28px",
            fontWeight: 400,
            color: rgba(palette.text, 0.7),
            fontFamily: typography.body,
            opacity: subtitleOp,
            margin: "12px 0 0 0",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );

  // ── Bar Chart Component ──
  const renderBarChart = (): JSX.Element => {
    const chartWidth: number = responsiveChartWidth;
    const chartHeight: number = responsiveChartHeight;
    const barSpacing: number = (chartHeight - 40) / coloredItems.length;

    return (
      <svg
        width={chartWidth}
        height={chartHeight}
        style={{
          position: "relative",
          margin: "40px 0",
        }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const x: number = ratio * chartWidth;
          return (
            <line
              key={`grid-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={chartHeight}
              stroke={rgba(palette.text, 0.1)}
              strokeWidth="1"
            />
          );
        })}

        {/* Bars */}
        {coloredItems.map((item, idx) => {
          const delay: number = staggerDelay(idx, coloredItems.length, 30);
          const itemProgress: number = animate
            ? interpolate(
                Math.max(0, frame - delay - 10),
                [0, 20],
                [0, 1],
                {
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                }
              )
            : 1;

          const barValue: number = item.value * itemProgress;
          const barWidth: number = (barValue / maxValue) * (chartWidth - 80);
          const barY: number = idx * barSpacing + 20;
          const barHeight: number = 24;

          const glowAmount: number = pulseGlow(frame - delay - 10, 30, 0.2, 0.6);
          const floatAmount: number = float(
            frame - delay - 30,
            40,
            2,
            idx * 5
          );

          return (
            <g key={`bar-${idx}`} opacity={fadeIn(frame, delay, 15)}>
              {/* Bar background */}
              <rect
                x="70"
                y={barY}
                width={chartWidth - 100}
                height={barHeight}
                fill={rgba(palette.text, 0.05)}
                rx="4"
              />

              {/* Animated bar */}
              <rect
                x="70"
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={item.color}
                rx="4"
                style={{
                  filter: `drop-shadow(0 0 12px ${rgba(item.color, glowAmount)})`,
                  transform: `translateY(${floatAmount}px)`,
                  transformOrigin: `70px ${barY + barHeight / 2}px`,
                  transition: animate ? "none" : "width 0.3s ease-out",
                }}
              />

              {/* Gradient overlay on bar */}
              <defs>
                <linearGradient
                  id={`bar-gradient-${idx}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={rgba(item.color, 0.3)} />
                  <stop offset="100%" stopColor={rgba(item.color, 0)} />
                </linearGradient>
              </defs>
              <rect
                x="70"
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={`url(#bar-gradient-${idx})`}
                rx="4"
              />

              {/* Label */}
              {showLabels && (
                <text
                  x="65"
                  y={barY + barHeight / 2 + 6}
                  fontSize="22"
                  fontFamily={typography.body}
                  fill={rgba(palette.text, 0.8)}
                  textAnchor="end"
                  opacity={fadeIn(frame, delay + 10, 15)}
                >
                  {item.label}
                </text>
              )}

              {/* Value */}
              {showValues && barWidth > 30 && (
                <text
                  x={70 + barWidth - 8}
                  y={barY + barHeight / 2 + 6}
                  fontSize="20"
                  fontFamily={typography.body}
                  fontWeight="600"
                  fill={palette.background}
                  textAnchor="end"
                  opacity={fadeIn(frame, delay + 15, 15)}
                >
                  {formatValue(barValue)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // ── Pie Chart Component ──
  const renderPieChart = (): JSX.Element => {
    const total: number = coloredItems.reduce((sum, item) => sum + item.value, 0);
    let currentAngle: number = -90;
    const pieSize = Math.min(600, width * 0.6);

    return (
      <svg
        width={pieSize}
        height={pieSize}
        viewBox="0 0 400 400"
        style={{
          position: "relative",
          margin: "40px 0",
        }}
      >
        <defs>
          {/* Gradients for segments */}
          {coloredItems.map((item, idx) => (
            <radialGradient key={`pie-grad-${idx}`} id={`pie-gradient-${idx}`}>
              <stop
                offset="0%"
                stopColor={rgba(item.color, 0.9)}
                stopOpacity="1"
              />
              <stop
                offset="100%"
                stopColor={rgba(item.color, 1)}
                stopOpacity="1"
              />
            </radialGradient>
          ))}
        </defs>

        {/* Pie segments */}
        {coloredItems.map((item, idx) => {
          const delay: number = staggerDelay(idx, coloredItems.length, 30);
          const itemProgress: number = animate
            ? interpolate(
                Math.max(0, frame - delay - 15),
                [0, 25],
                [0, 1],
                {
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic),
                }
              )
            : 1;

          const percentage: number = item.value / total;
          const sliceAngle: number = percentage * 360 * itemProgress;
          const startAngle: number = currentAngle;
          const endAngle: number = startAngle + sliceAngle;

          const startRad: number = (startAngle * Math.PI) / 180;
          const endRad: number = (endAngle * Math.PI) / 180;

          const x1: number = 200 + 120 * Math.cos(startRad);
          const y1: number = 200 + 120 * Math.sin(startRad);
          const x2: number = 200 + 120 * Math.cos(endRad);
          const y2: number = 200 + 120 * Math.sin(endRad);

          const largeArc: number = sliceAngle > 180 ? 1 : 0;
          const pathData: string = [
            `M 200 200`,
            `L ${x1} ${y1}`,
            `A 120 120 0 ${largeArc} 1 ${x2} ${y2}`,
            "Z",
          ].join(" ");

          const glowAmount: number = pulseGlow(
            frame - delay - 15,
            35,
            0.2,
            0.5
          );
          const breatheAmount: number = breathe(frame - delay - 40, 45, 0.05);

          currentAngle = endAngle;

          return (
            <g key={`pie-${idx}`}>
              <path
                d={pathData}
                fill={`url(#pie-gradient-${idx})`}
                opacity={fadeIn(frame, delay, 15)}
                style={{
                  filter: `drop-shadow(0 0 15px ${rgba(item.color, glowAmount)})`,
                  transform: `scale(${breatheAmount})`,
                  transformOrigin: "200px 200px",
                  transition: animate ? "none" : "all 0.3s ease-out",
                }}
              />
            </g>
          );
        })}

        {/* Center circle for donut effect (pie only - no hole) */}
        <circle
          cx="200"
          cy="200"
          r="35"
          fill={palette.background}
          opacity={fadeIn(frame, 10, 20)}
        />

        {/* Center text */}
        <text
          x="200"
          y="200"
          fontSize="20"
          fontWeight="700"
          fontFamily={typography.heading}
          fill={palette.text}
          textAnchor="middle"
          dy="0.3em"
          opacity={fadeIn(frame, 15, 15)}
        >
          {total}
        </text>
      </svg>
    );
  };

  // ── Line Chart Component ──
  const renderLineChart = (): JSX.Element => {
    const chartWidth: number = responsiveChartWidth;
    const chartHeight: number = responsiveChartHeight;
    const padding: number = 60;
    const innerWidth: number = chartWidth - 2 * padding;
    const innerHeight: number = chartHeight - 2 * padding;

    // Calculate points
    const points: Array<{ x: number; y: number }> = coloredItems.map(
      (item, idx) => ({
        x: padding + (idx / (coloredItems.length - 1)) * innerWidth,
        y:
          padding +
          innerHeight -
          (item.value / maxValue) * innerHeight,
      })
    );

    // Total path length for animation
    let totalLength: number = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx: number = points[i + 1].x - points[i].x;
      const dy: number = points[i + 1].y - points[i].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    const lineProgress: number = animate
      ? interpolate(Math.max(0, frame - 15), [0, 35], [0, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
      : 1;

    const pathD: string = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;

    return (
      <svg
        width={chartWidth}
        height={chartHeight}
        style={{
          position: "relative",
          margin: "40px 0",
        }}
      >
        <defs>
          <linearGradient
            id="line-gradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor={rgba(palette.primary, 0.3)} />
            <stop offset="100%" stopColor={rgba(palette.primary, 0)} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y: number = padding + (1 - ratio) * innerHeight;
          return (
            <line
              key={`grid-h-${i}`}
              x1={padding}
              y1={y}
              x2={chartWidth - padding}
              y2={y}
              stroke={rgba(palette.text, 0.1)}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Line chart area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x},${chartHeight - padding} L ${padding},${chartHeight - padding} Z`}
          fill="url(#line-gradient)"
          opacity={fadeIn(frame, 15, 20)}
        />

        {/* Line stroke */}
        <path
          d={pathD}
          stroke={palette.primary}
          strokeWidth="3"
          fill="none"
          opacity={fadeIn(frame, 15, 20)}
          style={{
            strokeDasharray: totalLength,
            strokeDashoffset: totalLength * (1 - lineProgress),
            transition: animate ? "none" : "stroke-dashoffset 0.3s ease-out",
          }}
        />

        {/* Data points */}
        {points.map((point, idx) => {
          const delay: number = 15 + staggerDelay(idx, coloredItems.length, 20);
          const dotProgress: number = animate
            ? interpolate(Math.max(0, frame - delay), [0, 12], [0, 1], {
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              })
            : 1;

          const glowAmount: number = pulseGlow(frame - delay, 30, 0.3, 0.8);
          const scaleAmount: number = breathe(frame - delay, 40, 0.1);

          return (
            <g key={`dot-${idx}`}>
              {/* Glow circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r={8 * dotProgress}
                fill={rgba(palette.primary, glowAmount * 0.4)}
                opacity={fadeIn(frame, delay - 5, 12)}
              />

              {/* Dot */}
              <circle
                cx={point.x}
                cy={point.y}
                r={5 * dotProgress * scaleAmount}
                fill={palette.primary}
                opacity={fadeIn(frame, delay, 12)}
                style={{
                  filter: `drop-shadow(0 0 10px ${rgba(palette.primary, glowAmount)})`,
                }}
              />
            </g>
          );
        })}

        {/* Labels */}
        {showLabels &&
          coloredItems.map((item, idx) => {
            const point = points[idx];
            const delay: number = staggerDelay(idx, coloredItems.length, 30) + 25;
            return (
              <text
                key={`label-${idx}`}
                x={point.x}
                y={chartHeight - padding + 30}
                fontSize="22"
                fontFamily={typography.body}
                fill={rgba(palette.text, 0.7)}
                textAnchor="middle"
                opacity={fadeIn(frame, delay, 12)}
              >
                {item.label}
              </text>
            );
          })}

        {/* Values */}
        {showValues &&
          coloredItems.map((item, idx) => {
            const point = points[idx];
            const delay: number = staggerDelay(idx, coloredItems.length, 30) + 28;
            return (
              <text
                key={`value-${idx}`}
                x={point.x}
                y={point.y - 18}
                fontSize="22"
                fontFamily={typography.body}
                fontWeight="600"
                fill={palette.text}
                textAnchor="middle"
                opacity={fadeIn(frame, delay, 12)}
              >
                {formatValue(item.value)}
              </text>
            );
          })}
      </svg>
    );
  };

  // ── Donut Chart Component ──
  const renderDonutChart = (): JSX.Element => {
    const total: number = coloredItems.reduce((sum, item) => sum + item.value, 0);
    let currentAngle: number = -90;
    const donutSize = Math.min(600, width * 0.6);

    return (
      <svg
        width={donutSize}
        height={donutSize}
        viewBox="0 0 400 400"
        style={{
          position: "relative",
          margin: "40px 0",
        }}
      >
        <defs>
          {/* Gradients for donut segments */}
          {coloredItems.map((item, idx) => (
            <linearGradient
              key={`donut-grad-${idx}`}
              id={`donut-gradient-${idx}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={rgba(item.color, 0.8)} />
              <stop offset="100%" stopColor={item.color} />
            </linearGradient>
          ))}
        </defs>

        {/* Donut segments */}
        {coloredItems.map((item, idx) => {
          const delay: number = staggerDelay(idx, coloredItems.length, 25);
          const itemProgress: number = animate
            ? spring({
                frame: Math.max(0, frame - delay - 10),
                fps,
                config: {
                  damping: 10,
                  stiffness: 100,
                  mass: 0.5,
                },
              })
            : 1;

          const percentage: number = item.value / total;
          const sliceAngle: number = percentage * 360 * itemProgress;
          const startAngle: number = currentAngle;
          const endAngle: number = startAngle + sliceAngle;

          const startRad: number = (startAngle * Math.PI) / 180;
          const endRad: number = (endAngle * Math.PI) / 180;

          const outerRadius: number = 140;
          const innerRadius: number = 80;

          const x1: number = 200 + outerRadius * Math.cos(startRad);
          const y1: number = 200 + outerRadius * Math.sin(startRad);
          const x2: number = 200 + outerRadius * Math.cos(endRad);
          const y2: number = 200 + outerRadius * Math.sin(endRad);

          const x3: number = 200 + innerRadius * Math.cos(endRad);
          const y3: number = 200 + innerRadius * Math.sin(endRad);
          const x4: number = 200 + innerRadius * Math.cos(startRad);
          const y4: number = 200 + innerRadius * Math.sin(startRad);

          const largeArc: number = sliceAngle > 180 ? 1 : 0;
          const pathData: string = [
            `M ${x1} ${y1}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${x3} ${y3}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
            "Z",
          ].join(" ");

          const glowAmount: number = pulseGlow(frame - delay - 10, 30, 0.2, 0.6);

          currentAngle = endAngle;

          return (
            <path
              key={`donut-${idx}`}
              d={pathData}
              fill={`url(#donut-gradient-${idx})`}
              opacity={fadeIn(frame, delay, 15)}
              style={{
                filter: `drop-shadow(0 0 15px ${rgba(item.color, glowAmount)})`,
                transition: animate ? "none" : "all 0.3s ease-out",
              }}
            />
          );
        })}

        {/* Center content */}
        <circle
          cx="200"
          cy="200"
          r={80}
          fill={palette.background}
          opacity={fadeIn(frame, 10, 20)}
        />

        {/* Center metric */}
        <text
          x="200"
          y="190"
          fontSize="32"
          fontWeight="700"
          fontFamily={typography.heading}
          fill={palette.text}
          textAnchor="middle"
          opacity={fadeIn(frame, 15, 15)}
        >
          {total}
        </text>

        <text
          x="200"
          y="215"
          fontSize="12"
          fontFamily={typography.body}
          fill={rgba(palette.text, 0.7)}
          textAnchor="middle"
          opacity={fadeIn(frame, 18, 12)}
        >
          Total
        </text>
      </svg>
    );
  };

  // ── Render appropriate chart type ──
  const renderChart = (): JSX.Element => {
    switch (chartType.toLowerCase()) {
      case "bar":
        return renderBarChart();
      case "pie":
        return renderPieChart();
      case "line":
        return renderLineChart();
      case "donut":
        return renderDonutChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Background ambient glow */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse 80% 60% at 50% 50%, ${rgba(palette.primary, 0.1)} 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.accent, 0.06)} 0%, transparent 55%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* Header with title and subtitle */}
      {renderHeader()}

      {/* Chart container */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          marginTop: subtitle ? "140px" : "80px",
        }}
      >
        {renderChart()}
      </div>

      {/* Legend (optional) */}
      {showLabels && chartType.toLowerCase() !== "line" && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "90%",
            opacity: fadeIn(frame, 50, 20),
          }}
        >
          {coloredItems.slice(0, 5).map((item, idx) => (
            <div
              key={`legend-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "20px",
                fontFamily: typography.body,
                color: rgba(palette.text, 0.8),
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "2px",
                  background: item.color,
                  boxShadow: glowShadow(item.color, 0.3, 8),
                }}
              />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};
