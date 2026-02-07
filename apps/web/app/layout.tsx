import type { ReactNode } from "react";

import Link from "next/link";

import { APP_SHELL_ROUTES } from "../src/app-shell";

export const metadata = {
  title: "Ethoxford Demo",
  description: "AI-native demo platform",
};

const NAV_ITEMS = APP_SHELL_ROUTES.filter((route) =>
  [
    "home",
    "dashboard",
    "workspaces",
    "ai",
    "retrieval",
    "analytics",
    "automation",
    "integrations",
    "notifications",
    "webhooks",
    "settings",
  ].includes(route.id),
);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="brand">Ethoxford</div>
            <nav className="nav">
              {NAV_ITEMS.map((route) => (
                <Link key={route.id} href={route.path} className="nav-link">
                  {route.title}
                </Link>
              ))}
            </nav>
            <div className="auth-chip">Auth: demo</div>
          </header>
          <main className="app-main">{children}</main>
        </div>
        <style>{`
          :root { color-scheme: light; font-family: Inter, system-ui, sans-serif; }
          body { margin: 0; background: #f7f7fb; color: #0b0b14; }
          .app-shell { min-height: 100vh; display: flex; flex-direction: column; }
          .app-header { display: flex; align-items: center; gap: 24px; padding: 18px 28px; background: #101124; color: #f7f7fb; }
          .brand { font-weight: 600; letter-spacing: 0.4px; }
          .nav { display: flex; gap: 14px; flex: 1; }
          .nav-link { color: #d7d7ff; text-decoration: none; font-size: 14px; }
          .nav-link:hover { color: #ffffff; }
          .auth-chip { font-size: 12px; background: #22234a; padding: 6px 10px; border-radius: 999px; }
          .app-main { flex: 1; padding: 28px; }
          .card { background: #ffffff; border-radius: 12px; padding: 18px; box-shadow: 0 10px 30px rgba(16, 17, 36, 0.08); }
          .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
          .title { font-size: 20px; font-weight: 600; margin-bottom: 10px; }
          .muted { color: #5f637a; }
        `}</style>
      </body>
    </html>
  );
}
