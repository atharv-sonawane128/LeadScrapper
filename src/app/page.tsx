"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Terminal, Lock, Mail, User, ShieldAlert } from "lucide-react";

export default function AuthPage() {
  const { signIn, signUp, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all credentials");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters");
      return;
    }

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication process failed");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
          <div style={{
            background: "rgba(99, 102, 241, 0.15)",
            padding: "0.85rem",
            borderRadius: "14px",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            color: "#6366f1",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem"
          }}>
            <Terminal size={28} />
          </div>
          <h1 style={{ fontSize: "2rem", fontFamily: "var(--font-display)", fontWeight: "800", color: "#f8fafc", marginBottom: "0.25rem" }}>
            Aether<span className="text-gradient">Scrape</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", textAlign: "center" }}>
            {isLogin ? "Sign in to access your scrapers & leads database" : "Register your credentials to start scraping intelligence"}
          </p>
        </div>

        {error && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid rgba(244, 63, 94, 0.2)",
            color: "var(--error)",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            fontSize: "0.875rem",
            marginBottom: "1.5rem"
          }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="form-input"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "2.75rem" }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "1.75rem" }}>
            <label className="form-label">Security Password</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "2.75rem" }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", height: "48px", marginBottom: "1.25rem" }}
          >
            {loading ? (
              <svg className="spinner" viewBox="0 0 50 50">
                <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
              </svg>
            ) : isLogin ? (
              "Sign In to Account"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          {isLogin ? "New to AetherScrape? " : "Already registered? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--primary)",
              fontWeight: "600",
              cursor: "pointer",
              padding: "0"
            }}
          >
            {isLogin ? "Create an account" : "Sign in instead"}
          </button>
        </div>
      </div>
    </div>
  );
}
