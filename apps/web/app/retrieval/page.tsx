"use client";

import { useState } from "react";

import { indexRetrievalChunk, retrievalQuery } from "../../src/lib/api-client";
import { getSession } from "../../src/lib/session";

export default function RetrievalPage() {
  const [query, setQuery] = useState("sample");
  const [results, setResults] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState("doc_demo");
  const [sourceUri, setSourceUri] = useState("file://demo.txt");
  const [sourceTitle, setSourceTitle] = useState("Demo Document");
  const [content, setContent] = useState("Hello world sample chunk");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await retrievalQuery({
      sessionId: session.sessionId,
      query,
      method: "hybrid",
    });

    if (!response.ok) {
      setMessage(response.message || "Unable to query retrieval.");
      return;
    }

    setMessage(null);
    setResults(
      response.data.results.map(
        (item) => `${item.sourceTitle} · ${item.retrievalScore} · ${item.chunkId}`,
      ),
    );
  }

  async function handleIndex(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setMessage("Sign in required.");
      return;
    }

    const response = await indexRetrievalChunk({
      sessionId: session.sessionId,
      documentId,
      sourceUri,
      sourceTitle,
      embeddingModelVersion: "demo-embedding",
      content,
    });

    if (!response.ok) {
      setMessage(response.message || "Unable to index chunk.");
      return;
    }

    setMessage("Chunk indexed.");
  }

  return (
    <section className="card">
      <div className="title">Retrieval</div>
      <p className="muted">Query indexed content and inspect citations.</p>
      <form onSubmit={handleIndex} className="form">
        <input
          className="input"
          value={documentId}
          onChange={(event) => setDocumentId(event.target.value)}
          placeholder="Document ID"
        />
        <input
          className="input"
          value={sourceUri}
          onChange={(event) => setSourceUri(event.target.value)}
          placeholder="Source URI"
        />
        <input
          className="input"
          value={sourceTitle}
          onChange={(event) => setSourceTitle(event.target.value)}
          placeholder="Source title"
        />
        <textarea
          className="textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
        />
        <button className="button" type="submit">
          Index chunk
        </button>
      </form>
      <form onSubmit={handleSubmit} className="form">
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search query"
          required
        />
        <button className="button" type="submit">
          Search
        </button>
      </form>
      {message ? <p className="muted">{message}</p> : null}
      <ul>
        {results.map((result) => (
          <li key={result}>{result}</li>
        ))}
      </ul>
      <style>{`
        .form { display: grid; gap: 10px; margin-bottom: 18px; }
        .input, .textarea { padding: 8px 10px; border-radius: 8px; border: 1px solid #d6d8e7; }
        .button { padding: 8px 10px; border-radius: 8px; border: none; background: #3b4eff; color: #fff; cursor: pointer; }
        ul { margin: 8px 0 0; padding-left: 18px; }
      `}</style>
    </section>
  );
}
