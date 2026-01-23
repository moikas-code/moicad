import type { Metadata, Viewport } from 'next';
import './globals.css';

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
      </head>
      <body className="layout-container">
        {children}
      </body>
    </html>
  );
}
