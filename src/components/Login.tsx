import { useState } from "react";

/** Login screen. Calls onLogin(username, password); shows server errors. */
export function Login({ onLogin }: { onLogin: (u: string, p: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="login-logo">GP</div>
          <div>
            <h1>Dashboard Sales</h1>
            <p>Greenpark Group · CEO War Room</p>
          </div>
        </div>

        <label className="login-field">
          <span>Username</span>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            autoComplete="username"
          />
        </label>
        <label className="login-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button className="login-btn" type="submit" disabled={busy || !username || !password}>
          {busy ? "Memproses…" : "Masuk"}
        </button>

        <div className="login-hint">
          Demo: <b>admin / admin123</b> (master data) · <b>viewer / viewer123</b> (lihat saja)
        </div>
      </form>
    </div>
  );
}
