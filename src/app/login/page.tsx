import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card__header" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>ReviewMate</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
            添削支援ツール
          </p>
        </div>
        <div className="card__body">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
