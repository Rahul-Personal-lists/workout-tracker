import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#10b981",
          fontSize: 320,
          fontWeight: 800,
          fontFamily: "system-ui",
        }}
      >
        W
      </div>
    ),
    { width: 512, height: 512 }
  );
}
