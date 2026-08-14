"use client";

import { useState, useEffect } from "react";

interface CandlePoint {
  time: string;
  price: number;
  high: number;
  low: number;
  vol: string;
}

const TIMEFRAME_CONFIGS: Record<string, { count: number; intervalText: string; timeStepMinutes: number; baseTrend: number[] }> = {
  "1H": {
    count: 20,
    intervalText: "3m candles",
    timeStepMinutes: 3,
    baseTrend: [2.462, 2.466, 2.464, 2.470, 2.476, 2.473, 2.480, 2.478, 2.484, 2.481, 2.487, 2.491, 2.488, 2.483, 2.487, 2.482, 2.486, 2.484, 2.487, 2.4852],
  },
  "24H": {
    count: 24,
    intervalText: "1h candles",
    timeStepMinutes: 60,
    baseTrend: [2.385, 2.392, 2.405, 2.418, 2.412, 2.425, 2.438, 2.430, 2.445, 2.460, 2.452, 2.468, 2.482, 2.475, 2.490, 2.505, 2.495, 2.512, 2.520, 2.508, 2.495, 2.488, 2.482, 2.4852],
  },
  "7D": {
    count: 28,
    intervalText: "6h candles",
    timeStepMinutes: 360,
    baseTrend: [2.220, 2.245, 2.230, 2.260, 2.290, 2.275, 2.310, 2.340, 2.325, 2.360, 2.385, 2.370, 2.410, 2.435, 2.420, 2.450, 2.475, 2.460, 2.485, 2.510, 2.495, 2.525, 2.540, 2.515, 2.490, 2.480, 2.482, 2.4852],
  },
  "30D": {
    count: 30,
    intervalText: "1d candles",
    timeStepMinutes: 1440,
    baseTrend: [1.950, 1.980, 2.020, 2.060, 2.040, 2.090, 2.140, 2.110, 2.180, 2.220, 2.190, 2.250, 2.300, 2.270, 2.340, 2.390, 2.360, 2.420, 2.460, 2.430, 2.480, 2.520, 2.490, 2.540, 2.560, 2.530, 2.500, 2.480, 2.482, 2.4852],
  },
  "ALL": {
    count: 32,
    intervalText: "1w candles",
    timeStepMinutes: 10080,
    baseTrend: [0.550, 0.620, 0.580, 0.710, 0.840, 0.790, 0.950, 1.120, 1.050, 1.280, 1.450, 1.380, 1.620, 1.850, 1.740, 1.980, 2.150, 2.050, 2.240, 2.380, 2.280, 2.420, 2.550, 2.460, 2.580, 2.620, 2.540, 2.490, 2.470, 2.480, 2.482, 2.4852],
  },
};

function createStableSeries(tf: string): CandlePoint[] {
  const config = TIMEFRAME_CONFIGS[tf] ?? TIMEFRAME_CONFIGS["24H"]!;
  const now = Date.now();
  const stepMs = config.timeStepMinutes * 60 * 1000;

  return config.baseTrend.map((price, idx) => {
    const timeMs = now - (config.baseTrend.length - 1 - idx) * stepMs;
    const timeObj = new Date(timeMs);
    
    let timeStr = "";
    if (tf === "1H" || tf === "24H") {
      timeStr = timeObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      timeStr = timeObj.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    const high = Number((price + price * 0.006).toFixed(4));
    const low = Number((price - price * 0.006).toFixed(4));
    const vol = (Math.floor(price * 12500 + idx * 820)).toLocaleString();

    return {
      time: timeStr,
      price: Number(price.toFixed(4)),
      high,
      low,
      vol,
    };
  });
}

// Generates smooth cubic bezier spline through all points
function getSmoothCurvePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0]!.x.toFixed(1)},${points[0]!.y.toFixed(1)}`;

  let path = `M ${points[0]!.x.toFixed(1)},${points[0]!.y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]!;
    const next = points[i + 1]!;
    
    const cpX1 = current.x + (next.x - current.x) * 0.45;
    const cpY1 = current.y;
    const cpX2 = current.x + (next.x - current.x) * 0.55;
    const cpY2 = next.y;

    path += ` C ${cpX1.toFixed(1)},${cpY1.toFixed(1)} ${cpX2.toFixed(1)},${cpY2.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
  }

  return path;
}

export function InteractiveMarketChart() {
  const [selectedTf, setSelectedTf] = useState<keyof typeof TIMEFRAME_CONFIGS>("24H");
  const [series, setSeries] = useState<CandlePoint[]>(() => createStableSeries("24H"));
  const [livePrice, setLivePrice] = useState(2.4852);
  const [priceFlash, setPriceFlash] = useState<"UP" | "DOWN" | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<(CandlePoint & { x: number; y: number }) | null>(null);

  // Switch timeframe stably
  useEffect(() => {
    const newSeries = createStableSeries(selectedTf);
    if (newSeries.length > 0) {
      newSeries[newSeries.length - 1]!.price = livePrice;
    }
    setSeries(newSeries);
  }, [selectedTf]);

  // Smooth live micro-ticking on last candle
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePrice((prev) => {
        const delta = (Math.random() - 0.49) * 0.0015;
        const nextPrice = Number((prev + delta).toFixed(4));

        setPriceFlash(nextPrice >= prev ? "UP" : "DOWN");
        setTimeout(() => setPriceFlash(null), 400);

        setSeries((currentSeries) => {
          if (currentSeries.length === 0) return currentSeries;
          const copy = [...currentSeries];
          const lastIdx = copy.length - 1;
          const lastPoint = copy[lastIdx]!;
          copy[lastIdx] = {
            ...lastPoint,
            price: nextPrice,
            high: Math.max(lastPoint.high, nextPrice),
            low: Math.min(lastPoint.low, nextPrice),
          };
          return copy;
        });

        return nextPrice;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Stable Y-Axis Bounds Calculation with 15% headroom
  const rawMin = Math.min(...series.map((p) => p.low));
  const rawMax = Math.max(...series.map((p) => p.high));
  const priceRange = rawMax - rawMin || 0.1;
  const yMin = Number((rawMin - priceRange * 0.15).toFixed(4));
  const yMax = Number((rawMax + priceRange * 0.15).toFixed(4));

  const svgWidth = 720;
  const svgHeight = 240;
  
  // Dedicated breathing margins
  const padLeft = 16;
  const padRight = 85; // dedicated clean area for Y-axis labels
  const padTop = 18;
  const padBottom = 32; // dedicated clean area for X-axis timestamps

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;
  const baselineY = (padTop + plotHeight).toFixed(1);

  // Curve extends naturally right up to the Y-axis boundary (tight 4px buffer)
  const innerCurveWidth = plotWidth - 4;

  // Format coordinates strictly inside plot box with tight right buffer
  const plottedPoints = series.map((pt, idx) => {
    const x = padLeft + (idx / (series.length - 1)) * innerCurveWidth;
    const norm = (pt.price - yMin) / (yMax - yMin);
    const y = padTop + (1 - norm) * plotHeight;
    return { ...pt, x, y };
  });

  // Calculate smooth matching Bézier curve for both line and integral area
  const smoothPath = getSmoothCurvePath(plottedPoints);
  
  const firstX = plottedPoints[0] ? plottedPoints[0].x.toFixed(1) : padLeft.toFixed(1);
  const lastX = plottedPoints[plottedPoints.length - 1] ? plottedPoints[plottedPoints.length - 1]!.x.toFixed(1) : (padLeft + innerCurveWidth).toFixed(1);

  // The integral area fill: follows smoothPath exactly 1:1, drops to baseline, and closes
  const exactAreaD = `${smoothPath} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;

  const activePoint = hoveredPoint ?? plottedPoints[plottedPoints.length - 1];
  const latestPlottedPoint = plottedPoints[plottedPoints.length - 1];

  // 3 Fixed Y-axis grid levels
  const yLevels = [
    { price: yMax - (yMax - yMin) * 0.18, y: padTop + plotHeight * 0.18 },
    { price: yMax - (yMax - yMin) * 0.50, y: padTop + plotHeight * 0.50 },
    { price: yMax - (yMax - yMin) * 0.82, y: padTop + plotHeight * 0.82 },
  ];

  // 4 X-axis time markers
  const xMarkers = [
    plottedPoints[0],
    plottedPoints[Math.floor(plottedPoints.length * 0.33)],
    plottedPoints[Math.floor(plottedPoints.length * 0.66)],
    plottedPoints[plottedPoints.length - 1],
  ].filter(Boolean);

  return (
    <div className="interactive-chart-container">
      {/* Chart Top Stats Bar */}
      <div className="pro-panel-header">
        <div className="chart-title-group">
          <div className="chart-price-row">
            <span className={`chart-main-price ${priceFlash === "UP" ? "flash-green" : priceFlash === "DOWN" ? "flash-red" : ""}`}>
              ${activePoint ? activePoint.price.toFixed(4) : livePrice.toFixed(4)}
            </span>
            <span className="chart-currency">USDT0 / FXRP</span>
          </div>
          {activePoint && (
            <div className="chart-meta-details">
              <span>H: ${activePoint.high.toFixed(4)}</span>
              <span>L: ${activePoint.low.toFixed(4)}</span>
              <span>Vol: {activePoint.vol} FXRP</span>
              <span style={{ color: "var(--text-tertiary)" }}>Time: {activePoint.time}</span>
            </div>
          )}
        </div>

        {/* Timeframe Buttons */}
        <div className="chart-timeframe-selector">
          {(Object.keys(TIMEFRAME_CONFIGS) as Array<keyof typeof TIMEFRAME_CONFIGS>).map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTf(tf)}
              className={`tf-btn ${selectedTf === tf ? "active" : ""}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Canvas Box */}
      <div
        className="pro-chart-canvas-box"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <svg
          width="100%"
          height="240"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="pro-chart-svg"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;

            // Constrain mouse to plot area
            if (mouseX < padLeft || mouseX > padLeft + innerCurveWidth + 10) return;

            let closest = plottedPoints[0]!;
            let minDist = Math.abs(closest.x - mouseX);
            for (const pt of plottedPoints) {
              const dist = Math.abs(pt.x - mouseX);
              if (dist < minDist) {
                minDist = dist;
                closest = pt;
              }
            }
            setHoveredPoint(closest);
          }}
        >
          <defs>
            <linearGradient id="exactIntegralGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4f40" stopOpacity="0.32" />
              <stop offset="85%" stopColor="#ff4f40" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#ff4f40" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Y-Axis Grid Lines & Price Labels */}
          {yLevels.map((lvl, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={lvl.y}
                x2={padLeft + plotWidth}
                y2={lvl.y}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padLeft + plotWidth + 6}
                y={lvl.y + 3.5}
                fill="var(--text-tertiary)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="start"
              >
                ${lvl.price.toFixed(4)}
              </text>
            </g>
          ))}

          {/* Vertical Divider separating plot area from Y-axis labels */}
          <line
            x1={padLeft + plotWidth}
            y1={padTop}
            x2={padLeft + plotWidth}
            y2={padTop + plotHeight}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />

          {/* Baseline separator above time markers */}
          <line
            x1={padLeft}
            y1={padTop + plotHeight}
            x2={padLeft + plotWidth}
            y2={padTop + plotHeight}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />

          {/* Bottom X-Axis Time Markers (Uncluttered, cleanly above baseline) */}
          {xMarkers.map((marker, idx) => (
            <g key={idx}>
              <line
                x1={marker!.x}
                y1={padTop + plotHeight}
                x2={marker!.x}
                y2={padTop + plotHeight + 4}
                stroke="rgba(255, 255, 255, 0.2)"
              />
              <text
                x={marker!.x}
                y={padTop + plotHeight + 18}
                fill="var(--text-tertiary)"
                fontSize="9.5"
                fontFamily="var(--font-mono)"
                textAnchor={idx === 0 ? "start" : idx === xMarkers.length - 1 ? "end" : "middle"}
              >
                {marker!.time}
              </text>
            </g>
          ))}

          {/* 1:1 Integral Area Fill (Perfect mathematical fit to curve) */}
          <path d={exactAreaD} fill="url(#exactIntegralGradient)" />

          {/* Crisp Main Curve */}
          <path
            d={smoothPath}
            stroke="#ff4f40"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Dashed line tracking current live price to the right axis (TradingView Style) */}
          {latestPlottedPoint && !hoveredPoint && (
            <g>
              <line
                x1={latestPlottedPoint.x}
                y1={latestPlottedPoint.y}
                x2={padLeft + plotWidth}
                y2={latestPlottedPoint.y}
                stroke="rgba(255, 79, 64, 0.45)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <rect
                x={padLeft + plotWidth + 3}
                y={latestPlottedPoint.y - 9}
                width="68"
                height="18"
                rx="4"
                fill="#ff4f40"
              />
              <text
                x={padLeft + plotWidth + 37}
                y={latestPlottedPoint.y + 3.5}
                fill="#ffffff"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                ${livePrice.toFixed(4)}
              </text>
            </g>
          )}

          {/* Crosshair Hover Lines */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padTop}
                x2={hoveredPoint.x}
                y2={padTop + plotHeight}
                stroke="rgba(255, 255, 255, 0.35)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <line
                x1={padLeft}
                y1={hoveredPoint.y}
                x2={padLeft + plotWidth}
                y2={hoveredPoint.y}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              {/* Y-Axis Hover Badge */}
              <rect
                x={padLeft + plotWidth + 3}
                y={hoveredPoint.y - 9}
                width="68"
                height="18"
                rx="4"
                fill="#ff4f40"
              />
              <text
                x={padLeft + plotWidth + 37}
                y={hoveredPoint.y + 3.5}
                fill="#ffffff"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
              >
                ${hoveredPoint.price.toFixed(4)}
              </text>
            </g>
          )}
        </svg>

        {/* Perfect Circle Dot Overlays (Positioned with 20px breathing room inside the plot) */}
        {hoveredPoint && (
          <div
            style={{
              position: "absolute",
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2.5px solid #ff4f40",
                background: "#ffffff",
                boxShadow: "0 0 12px rgba(255, 79, 64, 0.9)",
              }}
            />
          </div>
        )}

        {!hoveredPoint && latestPlottedPoint && (
          <div
            style={{
              position: "absolute",
              left: `${(latestPlottedPoint.x / svgWidth) * 100}%`,
              top: `${(latestPlottedPoint.y / svgHeight) * 100}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ff4f40",
                boxShadow: "0 0 10px rgba(255, 79, 64, 0.9)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  left: -4,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "1.5px solid #ff4f40",
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* External Clean Chart Footer Bar (Completely separated from graph markers) */}
      <div className="chart-footer-row">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span className="oracle-dot" />
          <span>Flare FTSO V2 Anchor · 0.00% MEV Leakage</span>
        </span>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
          {TIMEFRAME_CONFIGS[selectedTf]?.intervalText}
        </span>
      </div>
    </div>
  );
}
