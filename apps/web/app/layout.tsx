import type { ReactNode } from "react";

import Link from "next/link";

import { APP_SHELL_ROUTES } from "../src/app-shell";

export const metadata = {
  title: "ClosedSheath",
  description: "ClosedSheath — secure AI-native platform",
  icons: { icon: "/favicon.svg" },
};

const NAV_ITEMS = APP_SHELL_ROUTES.filter((route) =>
  ["home", "openclaw", "integrations"].includes(route.id),
);

const NAV_ICONS: Record<string, ReactNode> = {
  home: (
    <img src="/logo.svg" alt="ClosedSheath" style={{ width: 22, height: 22 }} />
  ),
  openclaw: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 L21 6.5 L21 14 C21 19 17 22.5 12 24 C7 22.5 3 19 3 14 L3 6.5 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M12 5 L18.5 8.5 L18.5 13.5 C18.5 17.5 15.5 20.5 12 22 C8.5 20.5 5.5 17.5 5.5 13.5 L5.5 8.5 Z"
            stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M12 8 C12.5 8 13 10 13 12 L13 18.5 C13 19 12.5 19.5 12 20 C11.5 19.5 11 19 11 18.5 L11 12 C11 10 11.5 8 12 8Z"
            fill="currentColor" opacity="0.75"/>
    </svg>
  ),
  integrations: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 13h4v4h-4z" />
    </svg>
  ),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="brand-header">
            <Link href="/" className="brand-link">
              <img src="/logo.svg" alt="ClosedSheath" className="brand-logo" />
              <span className="brand-name"><span className="brand-closed">CLOSED</span><span className="brand-sheath">SHEATH</span></span>
            </Link>
          </header>
          <main className="app-main">
            <div className="app-container">{children}</div>
          </main>
          <nav className="nav-island" aria-label="Primary">
            {NAV_ITEMS.map((route) => (
              <Link key={route.id} href={route.path} className="nav-item">
                <span className="nav-icon">{NAV_ICONS[route.id]}</span>
                <span className="nav-text">{route.title}</span>
              </Link>
            ))}
          </nav>
        </div>
        <style>{`
          :root {
            color-scheme: dark;
            font-family: "Inter", "SF Pro Text", system-ui, sans-serif;
            background-color: #0d0f14;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: radial-gradient(circle at top, #141820 0%, #0d0f14 55%, #0b0c10 100%);
            color: #f5f6f8;
          }
          a { color: inherit; }
          .app-shell { min-height: 100vh; display: flex; flex-direction: column; }
          .brand-header {
            display: flex;
            align-items: center;
            padding: 18px 28px 0;
          }
          .brand-link {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
          }
          .brand-logo { width: 34px; height: 34px; }
          .brand-name { font-size: 16px; letter-spacing: 2.5px; font-weight: 300; }
          .brand-closed { color: #c8d0dc; font-weight: 600; }
          .brand-sheath { color: #8694a8; font-weight: 300; }
          .app-main { flex: 1; padding: 36px 24px 120px; }
          .app-container { max-width: 1180px; margin: 0 auto; width: 100%; }
          .nav-island {
            position: fixed;
            left: 50%;
            transform: translateX(-50%);
            bottom: 22px;
            display: flex;
            gap: 14px;
            padding: 12px 18px;
            border-radius: 999px;
            background: rgba(18, 20, 27, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(18px);
            z-index: 10;
          }
          .nav-item {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 999px;
            text-decoration: none;
            font-size: 12px;
            color: #aeb4c6;
            transition: all 0.2s ease;
          }
          .nav-item:hover,
          .nav-item:focus-visible {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.08);
            outline: none;
          }
          .nav-icon { width: 18px; height: 18px; display: inline-flex; }
          .nav-icon svg { width: 18px; height: 18px; fill: currentColor; }
          .nav-text {
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            white-space: nowrap;
            transition: all 0.2s ease;
          }
          .nav-item:hover .nav-text,
          .nav-item:focus-visible .nav-text {
            max-width: 140px;
            opacity: 1;
          }
          .card {
            background: linear-gradient(160deg, rgba(25, 28, 36, 0.95), rgba(17, 19, 26, 0.95));
            border-radius: 16px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.06);
            box-shadow: 0 20px 40px rgba(3, 5, 8, 0.45);
          }
          button,
          input,
          select,
          textarea {
            font-family: inherit;
            color: #f5f6f8;
            background: rgba(16, 18, 24, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 10px 12px;
          }
          button {
            cursor: pointer;
            transition: all 0.2s ease;
          }
          button:hover,
          button:focus-visible {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
            outline: none;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(12, 14, 20, 0.8);
            border-radius: 14px;
            overflow: hidden;
          }
          th,
          td {
            padding: 12px 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          }
          th { text-align: left; color: #d3d8e6; font-weight: 600; }
          .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
          .title { font-size: 20px; font-weight: 600; margin-bottom: 10px; letter-spacing: 0.2px; }
          .muted { color: #9aa2b6; font-family: "Courier New", Courier, monospace; }
        `}</style>
      </body>
    </html>
  );
}
