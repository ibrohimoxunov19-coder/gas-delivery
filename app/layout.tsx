import type { Metadata, Viewport } from "next";
import "./globals.css";
import ToastProvider from "@/components/Toast";

export const metadata: Metadata = {
  title: "GazExpress — Gaz ballon yetkazib berish tizimi",
  description: "Propan gaz ballonlarini uyma-uy yetkazib berish va boshqarish tizimi",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GazExpress",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}