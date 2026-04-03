import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#6366f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 14,
          color: "#ffffff",
          letterSpacing: "-0.5px",
        }}
      >
        FV
      </div>
    ),
    { ...size }
  );
}
