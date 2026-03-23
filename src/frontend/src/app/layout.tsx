import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EL CURIO - Retail ERP",
  description: "Multi-Tenant Retail Distribution Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RetailERP",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
};

/**
 * Inline script that runs before React hydration to prevent the
 * flash-of-wrong-theme (FOWT). Reads localStorage and applies
 * the correct `dark` and `theme-*` classes to <html> immediately.
 */
const themeInitScript = `
(function() {
  try {
    var mode = localStorage.getItem('theme-mode') || 'system';
    var color = localStorage.getItem('color-theme') || 'orange';

    var isDark = mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    var root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.classList.remove('theme-blue','theme-indigo','theme-emerald','theme-purple','theme-orange');
    root.classList.add('theme-' + color);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="theme-orange">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
