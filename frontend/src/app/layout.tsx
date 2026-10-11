import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
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
    default: "Sentinel — Multimodal Video Search & Intelligence",
    template: "%s | Sentinel",
  },
  description:
    "Search your video footage like you'd ask a person. Frame-level precision with zero hallucinations using multimodal CLIP embeddings and neural object detections.",
  applicationName: "Sentinel",
  authors: [{ name: "Sentinel AI Team" }],
  keywords: [
    "video search",
    "multimodal AI",
    "Twelve Labs",
    "CLIP embeddings",
    "computer vision",
    "object detection",
    "YOLO",
    "frame retrieval",
    "video intelligence",
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
    title: "Sentinel — Multimodal Video Search & Intelligence",
    description:
      "Search recorded video footage with natural language. Direct frame verification, zero hallucinations, powered by multimodal neural embeddings.",
    images: [
      {
        url: "/logo.svg",
        width: 800,
        height: 200,
        alt: "Sentinel — Multimodal Video Intelligence Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel — Multimodal Video Search & Intelligence",
    description:
      "Search recorded video footage with natural language. Direct frame verification, zero hallucinations.",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
