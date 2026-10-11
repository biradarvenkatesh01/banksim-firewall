import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export function PixelShield({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      {...props}
    >
      <path
        d="M2 1h8v2h1v4h-1v2h-1v1H7v1H5v-1H4V9H3V7H2V3h1V1H2zm2 2v4h1v1h1v1h1V7h1V3H4z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PixelLock({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      {...props}
    >
      <path
        d="M4 1h4v3H7V3H5v1H4V1zm-2 4h8v6H2V5zm3 2h2v2H5V7z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PixelCoin({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      {...props}
    >
      <path
        d="M3 1h6v1h2v2h1v4h-1v2H9v1H3v-1H1V8H0V4h1V2h2V1zm1 3h4V3H4v1zm0 2h3V5H4v1zm0 2h2V7H4v1z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PixelWarning({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      {...props}
    >
      <path
        d="M5 1h2v2h1v2h1v2h1v2h1v1H1v-1h1V9h1V7h1V5h1V3h1V1zm0 3h2v3H5V4zm0 4h2v2H5V8z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PixelCheck({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      {...props}
    >
      <path
        d="M10 2h2v2h-1v1h-1v1H9v1H8v1H7v1H6v1H5v-1H4V8H3V7H2V6H1V4h2v1h1v1h1v1h1V6h1V5h1V4h1V3h1V2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PixelCross({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      {...props}
    >
      <path
        d="M1 2h2v1h1v1h1v1h2V4h1V3h1V2h2v2h-1v1H9v1h1v1h1v1h1v2h-2V9H9V8H8V7H7v1H6v1H5v1H4v1H2V9h1V8h1V7h1V6H4V5H3V4H1V2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PixelEye({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      {...props}
    >
      <path
        d="M3 3h6v1h2v1h1v2h-1v1H9v1H3V8H1V7H0V5h1V4h2V3zm2 2h2v2H5V5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PixelBolt({ size = 12, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      {...props}
    >
      <path
        d="M6 1h4v3H7v1h3v2H8v1H7v1H6v1H5v1H4v1H3V9h2V8h1V7H3V5h3V4h1V1H6z"
        fill="currentColor"
      />
    </svg>
  );
}

/** 4 corner brackets for cards and receipt to give a viewfinder terminal feel */
export function PixelViewfinderCorners({
  color = "var(--ink-3)",
  size = 6,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <>
      {/* Top Left */}
      <span
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: size,
          height: size,
          borderTop: `2px solid ${color}`,
          borderLeft: `2px solid ${color}`,
          pointerEvents: "none",
          opacity: 0.65,
        }}
        aria-hidden="true"
      />
      {/* Top Right */}
      <span
        style={{
          position: "absolute",
          top: 3,
          right: 3,
          width: size,
          height: size,
          borderTop: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
          pointerEvents: "none",
          opacity: 0.65,
        }}
        aria-hidden="true"
      />
      {/* Bottom Left */}
      <span
        style={{
          position: "absolute",
          bottom: 3,
          left: 3,
          width: size,
          height: size,
          borderBottom: `2px solid ${color}`,
          borderLeft: `2px solid ${color}`,
          pointerEvents: "none",
          opacity: 0.65,
        }}
        aria-hidden="true"
      />
      {/* Bottom Right */}
      <span
        style={{
          position: "absolute",
          bottom: 3,
          right: 3,
          width: size,
          height: size,
          borderBottom: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
          pointerEvents: "none",
          opacity: 0.65,
        }}
        aria-hidden="true"
      />
    </>
  );
}
