-- Migration: Retrieval persistence (citations + indexing)

CREATE TABLE IF NOT EXISTS retrieval_citations (
  citation_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(workspace_id),
  agent_run_id TEXT,
  response_segment_id TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES documents(document_id),
  chunk_id TEXT NOT NULL REFERENCES document_chunks(chunk_id),
  evidence_type TEXT NOT NULL,
  confidence_score NUMERIC(5, 4) NOT NULL,
  confidence_band TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_workspace ON document_chunks (workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_fts ON document_chunks USING GIN (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_retrieval_citations_workspace ON retrieval_citations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_citations_agent_run ON retrieval_citations (agent_run_id);

ALTER TABLE retrieval_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_retrieval_citations ON retrieval_citations
  USING (workspace_id = current_setting('app.current_workspace_id', true));
