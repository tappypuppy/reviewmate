"use client";

import { useActionState, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { register } from "@/actions/auth";

type Mode = "login" | "signup";

type FormState = {
  error: string;
  message: string;
};

const initialState: FormState = {
  error: "",
  message: "",
};

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  const loginAction = async (
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return {
        error: "メールアドレスまたはパスワードが正しくありません",
        message: "",
      };
    }

    router.push("/dashboard");
    router.refresh();
    return { error: "", message: "" };
  };

  const signupAction = async (
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await register({ email, password });

    if (!result.success) {
      return { error: result.error, message: "" };
    }

    setMode("login");
    return {
      error: "",
      message: "アカウントを作成しました。ログインしてください。",
    };
  };

  const [loginState, loginFormAction, isLoginPending] = useActionState(
    loginAction,
    initialState
  );
  const [signupState, signupFormAction, isSignupPending] = useActionState(
    signupAction,
    initialState
  );

  const state = mode === "login" ? loginState : signupState;
  const formAction = mode === "login" ? loginFormAction : signupFormAction;
  const isPending = mode === "login" ? isLoginPending : isSignupPending;

  return (
    <form action={formAction}>
      <div className="form-group">
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          required
          autoComplete="email"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>

      {state.error && <p className="error-message">{state.error}</p>}
      {state.message && (
        <p style={{ color: "var(--color-success)", marginBottom: "1rem" }}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        className="btn btn--primary"
        style={{ width: "100%" }}
        disabled={isPending}
      >
        {isPending
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
