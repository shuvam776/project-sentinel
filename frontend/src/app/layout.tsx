import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL || "https://sentinel-video-ai.vercel.app"
  ),
  title: {
    default: "Sentinel — Video Search & Object Detection",
    template: "%s | Sentinel",
  },
  description:
    "Search your video footage in natural language with frame-level retrieval and object detection.",
  applicationName: "Sentinel",
  authors: [{ name: "Sentinel" }],
  keywords: [
    "video search",
    "CLIP embeddings",
    "computer vision",
    "object detection",
    "frame retrieval",
    "semantic search",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Sentinel",
    title: "Sentinel — Video Search & Object Detection",
    description:
      "Search recorded video footage with natural language. Direct frame verification and object detections.",
    images: [
      {
        url: "/logo.svg",
        width: 800,
        height: 200,
        alt: "Sentinel Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel — Video Search & Object Detection",
    description:
      "Search recorded video footage with natural language. Direct frame verification and object detections.",
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-app text-txt-primary antialiased font-sans selection:bg-accent/20">
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ className: "text-xs font-sans" }} />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
