import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { TimezoneInit } from "@/components/tz-init";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workout Tracker",
  description: "Turn every workout into measurable progress.",
  applicationName: "Workout",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Workout",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

const VALID_THEMES = new Set(["lime", "sky", "amber", "violet", "rose"]);
const VALID_COLOR_MODES = new Set(["system", "light", "dark"]);

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const stored = cookieStore.get("accent-theme")?.value;
  const theme = stored && VALID_THEMES.has(stored) ? stored : "lime";
  const storedMode = cookieStore.get("color-mode")?.value;
  const colorMode =
    storedMode && VALID_COLOR_MODES.has(storedMode) ? storedMode : "system";

  return (
    <html
      lang="en"
      data-theme={theme}
      data-color-mode={colorMode}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <TimezoneInit />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
