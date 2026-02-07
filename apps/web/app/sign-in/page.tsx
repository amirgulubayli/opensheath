"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn } from "../../src/lib/api-client";
import { setSession } from "../../src/lib/session";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const response = await signIn({ email, password });
    if (!response.ok) {
      setStatus("error");
      setMessage(response.message || "Unable to sign in.");
      return;
    }

    setSession(response.data.session);
    setStatus("idle");
    router.push("/dashboard");
  }

  return (
    <section className="card">
      <div className="title">Sign in</div>
      <p className="muted">Use the default demo credentials or enter your own.</p>
      <form onSubmit={handleSubmit} className="card">
        <label>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            type="email"
            required
          />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            type="password"
            required
          />
        </label>
        <button className="button" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Signing in..." : "Sign in"}
        </button>
        {status === "error" && message ? <p className="error">{message}</p> : null}
      </form>
      <style>{`
        form { display: grid; gap: 12px; }
        label { display: grid; gap: 6px; font-size: 14px; }
        .input { padding: 10px 12px; border-radius: 8px; border: 1px solid #d6d8e7; }
        .button { padding: 10px 14px; border-radius: 8px; border: none; background: #3b4eff; color: #fff; cursor: pointer; }
        .button:disabled { opacity: 0.7; cursor: not-allowed; }
        .error { color: #c0392b; }
      `}</style>
    </section>
  );
}
