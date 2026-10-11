"use client";

import React, { useEffect, useState, useRef } from "react";

interface RiskDialProps {
  score: number;
}

export function RiskDial({ score }: RiskDialProps) {
  const numericScore = typeof score === "number" && !isNaN(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, Math.round(numericScore)));

  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const prevScoreRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setAnimatedScore(clampedScore);
      prevScoreRef.current = clampedScore;
      return;
    }

    const startVal = prevScoreRef.current;
    const endVal = clampedScore;
    let startTime: number | null = null;
    const duration = 500;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setAnimatedScore(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setAnimatedScore(endVal);
        prevScoreRef.current = endVal;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [clampedScore]);

  // Determine colour based on score band
  const color =
    clampedScore >= 50
      ? "var(--block)"
      : clampedScore >= 25
      ? "var(--amber)"
      : "var(--approve)";

  // ONE caption below the dial
  const caption =
    clampedScore >= 50
      ? "risk · blocked"
      : clampedScore >= 25
      ? "risk · grey zone"
      : "risk · clear";

  // Geometry: 270° arc from -135° (bottom-left) to +135° (bottom-right)
  const cx = 120;
  const cy = 110;
  const r = 72;
  const startAngle = -135;
  const totalSweep = 270;

  // Convert polar coordinates: 0° is 12 o'clock, clockwise positive
  const getPoint = (centerX: number, centerY: number, radius: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  const describeArc = (startA: number, endA: number) => {
    const start = getPoint(cx, cy, r, startA);
    const end = getPoint(cx, cy, r, endA);
    const sweep = endA - startA;
    const largeArcFlag = sweep > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const backgroundArc = describeArc(startAngle, startAngle + totalSweep);
  const currentEndAngle = startAngle + (animatedScore / 100) * totalSweep;
  const valueArc = animatedScore > 0 ? describeArc(startAngle, currentEndAngle) : "";

  // Ticks every 10 plus threshold 25
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div
      style={{
        backgroundColor: "var(--paper-raised)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: "11px",
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "4px",
          alignSelf: "flex-start",
        }}
      >
        Composite Threat Gauge
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: "240px", height: "195px" }}>
        <svg
          viewBox="0 0 240 205"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          aria-label={`Risk gauge score ${clampedScore} out of 100`}
        >
          {/* Background Track in --rule */}
          <path
            d={backgroundArc}
            fill="none"
            stroke="var(--rule)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Active Value Arc sweeping from 0 to value */}
          {animatedScore > 0 && (
            <path
              d={valueArc}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              style={{ transition: "stroke 240ms ease-out" }}
            />
          )}

          {/* Ticks */}
          {ticks.map((t) => {
            const angle = startAngle + (t / 100) * totalSweep;
            const isThreshold = t === 50;
            const inner = getPoint(cx, cy, r - (isThreshold ? 7 : 4), angle);
            const outer = getPoint(cx, cy, r + (isThreshold ? 7 : 4), angle);

            return (
              <line
                key={t}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={isThreshold ? "var(--block)" : "var(--rule)"}
                strokeWidth={isThreshold ? 2 : 1}
              />
            );
          })}

          {/* Threshold 25 tick mark (slightly longer) */}
          {(() => {
            const angle25 = startAngle + 0.25 * totalSweep;
            const inner = getPoint(cx, cy, r - 7, angle25);
            const outer = getPoint(cx, cy, r + 7, angle25);
            return (
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="var(--amber)"
                strokeWidth={1.75}
              />
            );
          })()}

          {/* Needle / indicator dot on arc */}
          {(() => {
            const angle = startAngle + (animatedScore / 100) * totalSweep;
            const p = getPoint(cx, cy, r, angle);
            return (
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill={color}
                stroke="var(--paper-raised)"
                strokeWidth="2"
                style={{ transition: "fill 240ms ease-out" }}
              />
            );
          })()}

          {/* Outside Labels: Silkscreen pixel font with >=6px clearance */}
          <text
            x="36"
            y="76"
            fill="var(--amber)"
            fontSize="11"
            fontFamily="var(--font-pixel)"
            textAnchor="end"
            fontWeight="700"
            letterSpacing="0.04em"
          >
            grey 25
          </text>
          <text
            x="120"
            y="16"
            fill="var(--block)"
            fontSize="11"
            fontFamily="var(--font-pixel)"
            textAnchor="middle"
            fontWeight="700"
            letterSpacing="0.04em"
          >
            block 50
          </text>

          {/* Quiet Base Ticks */}
          <text
            x="60"
            y="180"
            fill="var(--ink-4)"
            fontSize="9"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            0
          </text>
          <text
            x="180"
            y="180"
            fill="var(--ink-4)"
            fontSize="9"
            fontFamily="var(--font-mono)"
            textAnchor="middle"
          >
            100
          </text>

          {/* Centre shows ONLY the big tabular number with 500ms count-up */}
          <text
            x="120"
            y="126"
            textAnchor="middle"
            className="font-serif tnum"
            fontSize="46"
            fontWeight="400"
            fill={color}
            style={{ transition: "fill 240ms ease-out" }}
          >
            {Math.round(animatedScore)}
          </text>
        </svg>
      </div>

      {/* ONE caption below the dial */}
      <div
        className="font-mono tnum"
        style={{
          fontSize: "12px",
          color: color,
          letterSpacing: "0.06em",
          marginTop: "2px",
          fontWeight: 500,
          textTransform: "lowercase",
        }}
      >
        {caption}
      </div>
    </div>
  );
}
