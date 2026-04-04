import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "#6366f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Vault door */}
        <div
          style={{
            width: 100,
            height: 100,
            border: "8px solid white",
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Vault knob ring */}
          <div
            style={{
              width: 40,
              height: 40,
              border: "7px solid white",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Center dot */}
            <div
              style={{
                width: 10,
                height: 10,
                background: "white",
                borderRadius: "50%",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
