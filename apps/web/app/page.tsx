import Link from "next/link";

export default function HomePage() {
  return (
    <section style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, padding: "48px 24px" }}>
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <img src="/logo.svg" alt="ClosedSheath" style={{ width: 120, height: 156, opacity: 0.9 }} />
        <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, color: "#c0cfe0" }}>
          CLOSED<span style={{ color: "#7a8ea8", fontWeight: 400 }}>SHEATH</span>
        </span>
      </div>

      <p className="muted" style={{ textAlign: "center", maxWidth: 480, lineHeight: 1.6 }}>
        AI‑native platform with policy‑gated tool invocation, swarm orchestration, and full audit traceability.
      </p>

      <div className="grid" style={{ maxWidth: 520, width: "100%" }}>
        <Link
          className="card"
          href="/openclaw"
          style={{
            background: "linear-gradient(160deg, rgba(96,165,250,0.12), rgba(17,19,26,0.95))",
            borderColor: "rgba(96,165,250,0.2)",
            textAlign: "center",
            padding: "24px 20px",
          }}
        >
          🛡️ OpenClaw
          <span style={{ display: "block", fontSize: 12, color: "#9aa2b6", marginTop: 6 }}>
            Gateway &middot; Policy &middot; Swarm &middot; Audit
          </span>
        </Link>
        <Link
          className="card"
          href="/integrations"
          style={{ textAlign: "center", padding: "24px 20px" }}
        >
          ⚡ Integrations
          <span style={{ display: "block", fontSize: 12, color: "#9aa2b6", marginTop: 6 }}>
            Connectors &middot; Gateways &middot; Credentials
          </span>
        </Link>
      </div>
    </section>
  );
}
