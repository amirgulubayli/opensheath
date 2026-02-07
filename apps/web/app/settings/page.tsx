export default function SettingsPage() {
  return (
    <section className="card">
      <div className="title">Settings</div>
      <p className="muted">Notification preferences, integrations, and webhooks are now available.</p>
      <div className="grid">
        <a className="card" href="/integrations">
          <strong>Integrations</strong>
          <p className="muted">Register connectors and view status.</p>
        </a>
        <a className="card" href="/automation">
          <strong>Automation</strong>
          <p className="muted">Create rules and publish events.</p>
        </a>
        <a className="card" href="/notifications">
          <strong>Notifications</strong>
          <p className="muted">Manage preference settings.</p>
        </a>
        <a className="card" href="/webhooks">
          <strong>Webhooks</strong>
          <p className="muted">Review outbound deliveries.</p>
        </a>
      </div>
    </section>
  );
}
