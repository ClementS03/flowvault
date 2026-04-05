import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0f172a",
          display: "flex",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Indigo glow — top left */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "#6366f1",
            opacity: 0.12,
          }}
        />

        {/* Indigo glow — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: -150,
            right: 200,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "#6366f1",
            opacity: 0.08,
          }}
        />

        {/* Left content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 0 60px 80px",
            flex: 1,
            maxWidth: 680,
          }}
        >
          {/* Logo row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 48,
            }}
          >
            {/* Vault icon */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                background: "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: "3px solid white",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    border: "2.5px solid white",
                    borderRadius: "50%",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.5px",
              }}
            >
              FlowVault
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 62,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              letterSpacing: "-2px",
              marginBottom: 24,
            }}
          >
            The component library for Webflow makers.
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 22,
              color: "#94a3b8",
              lineHeight: 1.5,
              letterSpacing: "-0.3px",
            }}
          >
            Store, share and copy Webflow components in one click.
          </div>

          {/* Domain */}
          <div
            style={{
              marginTop: 48,
              fontSize: 18,
              color: "#6366f1",
              fontWeight: 600,
              letterSpacing: "0.5px",
            }}
          >
            flowvaulthq.com
          </div>
        </div>

        {/* Right — decorative component cards grid */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
            padding: "60px 80px 60px 40px",
            opacity: 0.9,
          }}
        >
          {/* Row 1 */}
          <div style={{ display: "flex", gap: 16 }}>
            <ComponentCard color="#6366f1" label="Hero Section" lines={3} />
            <ComponentCard color="#8b5cf6" label="Navbar" lines={2} />
          </div>
          {/* Row 2 */}
          <div style={{ display: "flex", gap: 16 }}>
            <ComponentCard color="#0ea5e9" label="Pricing" lines={4} />
            <ComponentCard color="#10b981" label="Features" lines={3} />
          </div>
          {/* Row 3 */}
          <div style={{ display: "flex", gap: 16 }}>
            <ComponentCard color="#f59e0b" label="Footer" lines={2} />
            <ComponentCard color="#ec4899" label="CTA" lines={3} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

function ComponentCard({
  color,
  label,
  lines,
}: {
  color: string;
  label: string;
  lines: number;
}) {
  return (
    <div
      style={{
        width: 168,
        background: "#1e293b",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Colored header bar */}
      <div
        style={{
          height: 6,
          background: color,
        }}
      />
      {/* Card content */}
      <div
        style={{
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#94a3b8",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        {/* Content lines */}
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 6,
              borderRadius: 3,
              background: i === 0 ? "#334155" : "#1e3a5f",
              width: i === 0 ? "100%" : i === lines - 1 ? "60%" : "80%",
            }}
          />
        ))}
      </div>
    </div>
  );
}
