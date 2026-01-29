import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: 'moicad',
  description: 'Web-based OpenSCAD clone with real-time 3D preview and WASM-powered geometry engine',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#1e1e1e" />
        
        {/* gif.js library for GIF animation export */}
        <script src="https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js" async></script>
      </head>
      <body className="layout-container">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
