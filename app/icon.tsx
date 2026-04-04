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
        }}
      >
        {/* Vault door */}
        <div
          style={{
            width: 18,
            height: 18,
            border: "2.5px solid white",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Vault knob */}
          <div
            style={{
              width: 7,
              height: 7,
              border: "2px solid white",
              borderRadius: "50%",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
