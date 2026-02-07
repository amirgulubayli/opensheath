-- Migration: Initial schema aligned to spec.md

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Core identity
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  membership_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_invites (
  invite_token TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by TEXT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core domain
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  document_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  document_id TEXT PRIMARY KEY REFERENCES documents(document_id),
  attempt_count INTEGER NOT NULL,
  retry_count INTEGER NOT NULL,
  max_retries INTEGER NOT NULL,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  queued_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  last_error_class TEXT,
  last_error_message TEXT,
  chunk_count INTEGER
);

CREATE TABLE IF NOT EXISTS document_chunks (
  chunk_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  document_id TEXT NOT NULL REFERENCES documents(document_id),
  source_uri TEXT NOT NULL,
  source_title TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_start_offset INTEGER NOT NULL,
  chunk_end_offset INTEGER NOT NULL,
  embedding_model_version TEXT NOT NULL,
  embedding vector(1536),
  indexed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_threads (
  thread_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  created_by TEXT REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  run_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  thread_id TEXT REFERENCES agent_threads(thread_id),
  actor_id TEXT REFERENCES users(user_id),
  status TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  moderation_outcome TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost_usd NUMERIC(10, 4) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  error_class TEXT,
  correlation_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_calls (
  tool_call_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(run_id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  actor_id TEXT REFERENCES users(user_id),
  tool_name TEXT NOT NULL,
  tool_version TEXT NOT NULL,
  status TEXT NOT NULL,
  policy_decision TEXT NOT NULL,
  attempt_count INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  error_class TEXT,
  correlation_id TEXT NOT NULL
);

-- Integrations and automation
CREATE TABLE IF NOT EXISTS integrations (
  integration_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  provider TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  credential_reference TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_health_status TEXT,
  last_health_check_at TIMESTAMPTZ,
  last_error_message TEXT,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS automation_rules (
  rule_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  event_type TEXT NOT NULL,
  action_name TEXT NOT NULL,
  max_retries INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_runs (
  run_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  rule_id TEXT NOT NULL REFERENCES automation_rules(rule_id),
  event_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS automation_event_ingestions (
  ingestion_id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(workspace_id),
  source_system TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  ingestion_status TEXT NOT NULL,
  correlation_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(workspace_id),
  actor_id TEXT REFERENCES users(user_id),
  event_type TEXT NOT NULL,
  version TEXT NOT NULL,
  payload JSONB NOT NULL,
  correlation_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

-- Notifications and access lifecycle
CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  user_id TEXT NOT NULL REFERENCES users(user_id),
  channel_email BOOLEAN NOT NULL,
  channel_in_app BOOLEAN NOT NULL,
  channel_webhook BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS outbound_webhook_deliveries (
  delivery_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  target_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT NOT NULL,
  attempt_count INTEGER NOT NULL,
  max_attempts INTEGER NOT NULL,
  status TEXT NOT NULL,
  queued_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error_message TEXT
);

CREATE TABLE IF NOT EXISTS demo_access_states (
  access_state_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  state TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  reason TEXT
);

-- Usage safeguards and analytics
CREATE TABLE IF NOT EXISTS usage_policies (
  policy_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  policy_name TEXT NOT NULL,
  policy_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_counters (
  counter_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  metric TEXT NOT NULL,
  consumed_units INTEGER NOT NULL,
  counter_version INTEGER NOT NULL,
  last_increment_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  event_id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(workspace_id),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(workspace_id),
  actor_id TEXT REFERENCES users(user_id),
  action TEXT NOT NULL,
  target_resource TEXT,
  metadata JSONB,
  occurred_at TIMESTAMPTZ NOT NULL
);

-- Tenant isolation (RLS scaffolding)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_event_ingestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_access_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Example policy scaffold: requires app.current_workspace_id to be set per request
CREATE POLICY tenant_isolation_projects ON projects
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_documents ON documents
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_workspace_invites ON workspace_invites
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_ingestion_jobs ON ingestion_jobs
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.document_id = ingestion_jobs.document_id
      AND documents.workspace_id = current_setting('app.current_workspace_id', true)
    )
  );

CREATE POLICY tenant_isolation_document_chunks ON document_chunks
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_agent_runs ON agent_runs
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_tool_calls ON tool_calls
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_integrations ON integrations
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_automation_rules ON automation_rules
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_automation_runs ON automation_runs
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_automation_event_ingestions ON automation_event_ingestions
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_notification_preferences ON notification_preferences
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_outbound_webhook_deliveries ON outbound_webhook_deliveries
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_demo_access_states ON demo_access_states
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_usage_policies ON usage_policies
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_usage_counters ON usage_counters
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_analytics_events ON analytics_events
  USING (workspace_id = current_setting('app.current_workspace_id', true));

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (workspace_id = current_setting('app.current_workspace_id', true));
