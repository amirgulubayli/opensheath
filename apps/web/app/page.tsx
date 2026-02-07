import Link from "next/link";

export default function HomePage() {
  return (
    <section className="card">
      <div className="title">Demo MVP Control Center</div>
      <p className="muted">
        This shell will be wired to live API data in the next steps. Use the links below
        to navigate core workflows.
      </p>
      <div className="grid">
        <Link className="card" href="/dashboard">Dashboard</Link>
        <Link className="card" href="/workspaces">Workspaces</Link>
        <Link className="card" href="/settings">Settings</Link>
        <Link className="card" href="/sign-in">Sign in</Link>
      </div>
    </section>
  );
}
