import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import SiteFooter from "./components/SiteFooter";
import ToastViewport from "./components/ToastViewport";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HAL CINEMA | 映画とフードをまとめて予約",
    template: "%s | HAL CINEMA",
  },
  description:
    "映画の座席とフードを一度に予約。当日は受け取って、そのままスクリーンへ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      data-scroll-behavior="smooth"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider><div className="min-w-0 flex-1">{children}</div><SiteFooter /><ToastViewport /></ThemeProvider>
      </body>
    </html>
  );
}
