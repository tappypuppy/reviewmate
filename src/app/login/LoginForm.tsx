"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function LoginForm() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "登録に失敗しました");
          return;
        }

        setMessage("アカウントを作成しました。ログインしてください。");
        setMode("login");
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("メールアドレスまたはパスワードが正しくありません");
          return;
        }

        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>

      {error && <p className="error-message">{error}</p>}
      {message && (
        <p style={{ color: "var(--color-success)", marginBottom: "1rem" }}>
          {message}
        </p>
      )}

      <button
        type="submit"
        className="btn btn--primary"
        style={{ width: "100%" }}
        disabled={isLoading}
      >
        {isLoading
          ? "処理中..."
          : mode === "login"
          ? "ログイン"
          : "アカウント作成"}
      </button>

      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        {mode === "login" ? (
          <p style={{ fontSize: "0.875rem" }}>
            アカウントをお持ちでない方は{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              新規登録
            </button>
          </p>
        ) : (
          <p style={{ fontSize: "0.875rem" }}>
            すでにアカウントをお持ちの方は{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              ログイン
            </button>
          </p>
        )}
      </div>
    </form>
  );
}
