import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { TimezoneInit } from "@/components/tz-init";
import { AppSplash } from "@/components/app-splash";
import { resolveTheme } from "@/lib/themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trainr",
  description: "Turn every workout into measurable progress.",
  applicationName: "Trainr",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trainr",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const theme = resolveTheme(cookieStore.get("accent-theme")?.value);
  const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* React hoists these into <head>. No crossOrigin: exercise images and
            media load as plain no-CORS <img>/<video>, and preconnect pools are
            keyed by crossOrigin mode. */}
        <link rel="preconnect" href="https://raw.githubusercontent.com" />
        <link rel="preconnect" href={supabaseOrigin} />
        <TimezoneInit />
        {children}
        <ServiceWorkerRegister />
        <AppSplash />
      </body>
    </html>
  );
}
