import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import MainLayout from "@/components/layouts/MainLayout";

// Force dynamic rendering for all pages to prevent SSR document errors
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinderNate",
  description: "Findernate - Social Network for All",
   icons: {
    icon: [
      {
        url: "/Findernate.ico",
        sizes: "12x12",
        type: "image/ico",
      },
      {
        url: "/Findernate.ico",
        sizes: "16x16",
        type: "image/ico",
      },
    ],
    shortcut: "/Findernate.ico",
    apple: "/Findernate.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>){


  return (
    <html lang="en">
       <head>
        {/* Viewport configuration to prevent zoom issues */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/Findernate.ico" type="image/ico" sizes="32x32" />
        <link rel="shortcut icon" href="/Findernate.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f59e0b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FinderNate" />
        {/* Preconnect to primary image CDNs for faster LCP */}
        <link rel="preconnect" href="https://findernate-media.b-cdn.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
        suppressHydrationWarning={true}
      >
        <MainLayout>
        {children}
        </MainLayout>
      </body>
    </html>
  );
}
