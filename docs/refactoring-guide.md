# リファクタリングガイド

このドキュメントでは、今回行ったリファクタリングの内容と、使用した新しい技術について説明します。

---

## 目次

1. [リファクタリングとは？](#リファクタリングとは)
2. [今回の変更概要](#今回の変更概要)
3. [React 19の新機能: useActionState](#react-19の新機能-useactionstate)
4. [Server Actionsとは？](#server-actionsとは)
5. [Next.js 16の変更: middleware → proxy](#nextjs-16の変更-middleware--proxy)
6. [変更前後のコード比較](#変更前後のコード比較)

---

## リファクタリングとは？

**リファクタリング**とは、プログラムの動作（機能）は変えずに、コードの内部構造を改善することです。

### なぜリファクタリングをするの？

- **読みやすくなる**: 他の人（未来の自分も含む）がコードを理解しやすくなる
- **保守しやすくなる**: バグの修正や機能追加がしやすくなる
- **最新のベストプラクティスに合わせる**: フレームワークの新機能を活用できる

---

## 今回の変更概要

| 変更内容 | 対象ファイル | 理由 |
|---------|-------------|------|
| `useActionState`の導入 | LoginForm, PolicyForm, ReviewForm | React 19の新しいフォーム処理パターン |
| Server Actionの追加 | `src/actions/auth.ts` | API Routeより簡潔で型安全 |
| middleware → proxy | `src/proxy.ts` | Next.js 16の新しい命名規約 |

---

## React 19の新機能: useActionState

### 従来の方法（React 18以前）

従来は、フォームを処理するために複数の`useState`と`handleSubmit`関数を使っていました。

```tsx
// 従来の方法
function MyForm() {
  const [email, setEmail] = useState("");        // 入力値を管理
  const [error, setError] = useState("");        // エラーを管理
  const [isLoading, setIsLoading] = useState(false);  // ローディング状態を管理

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();        // フォームのデフォルト動作を防ぐ
    setError("");              // エラーをリセット
    setIsLoading(true);        // ローディング開始

    try {
      const result = await someAction({ email });
      if (!result.success) {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);     // ローディング終了
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <p>{error}</p>}
      <button disabled={isLoading}>
        {isLoading ? "送信中..." : "送信"}
      </button>
    </form>
  );
}
```

**問題点:**
- `useState`を3つも使っている
- `try/finally`で手動でローディング状態を管理
- `e.preventDefault()`を忘れるとページがリロードされてしまう

### 新しい方法（React 19: useActionState）

```tsx
// React 19の新しい方法
function MyForm() {
  // フォームのアクション関数を定義
  const formAction = async (prevState: FormState, formData: FormData) => {
    const email = formData.get("email") as string;

    const result = await someAction({ email });

    if (!result.success) {
      return { error: result.error };  // エラー状態を返す
    }
    return { error: "" };  // 成功状態を返す
  };

  // useActionStateフックを使用
  const [state, action, isPending] = useActionState(formAction, { error: "" });
  //     ↑       ↑        ↑
  //   状態    アクション  ローディング中かどうか（自動で管理される！）

  return (
    <form action={action}>  {/* onSubmitではなくactionを使う */}
      <input name="email" />  {/* valueとonChangeが不要！ */}
      {state.error && <p>{state.error}</p>}
      <button disabled={isPending}>
        {isPending ? "送信中..." : "送信"}
      </button>
    </form>
  );
}
```

### useActionStateのメリット

| 従来の方法 | useActionState |
|-----------|----------------|
| `useState`を複数使う | 1つの`useActionState`で完結 |
| `isLoading`を手動管理 | `isPending`が自動で提供される |
| `e.preventDefault()`が必要 | 不要 |
| `value`と`onChange`が必要 | `name`属性だけでOK |

### useActionStateの使い方

```tsx
const [state, action, isPending] = useActionState(アクション関数, 初期状態);
```

- **state**: 現在のフォーム状態（エラーメッセージなど）
- **action**: フォームに渡すアクション関数
- **isPending**: フォーム送信中かどうか（`true`/`false`）

---

## Server Actionsとは？

### 従来の方法: API Route

従来、サーバー側の処理を行うには**API Route**を作成していました。

```
src/
├── app/
│   └── api/
│       └── auth/
│           └── register/
│               └── route.ts  ← API Route
```

```tsx
// API Route（従来の方法）
// src/app/api/auth/register/route.ts

export async function POST(request: Request) {
  const body = await request.json();

  // バリデーション
  // データベース操作
  // レスポンスを返す

  return NextResponse.json({ success: true });
}
```

クライアント側からは`fetch`で呼び出します：

```tsx
// クライアント側
const res = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const data = await res.json();
```

### 新しい方法: Server Action

**Server Action**は、サーバー側の処理を関数として直接書ける機能です。

```tsx
// Server Action（新しい方法）
// src/actions/auth.ts

"use server";  // ← これがServer Actionの印！

export async function register(input: RegisterInput) {
  // バリデーション
  // データベース操作
  // 結果を返す

  return { success: true, data: user };
}
```

クライアント側からは普通の関数のように呼び出せます：

```tsx
// クライアント側
import { register } from "@/actions/auth";

const result = await register({ email, password });
//                   ↑ 普通の関数呼び出しのように見える！
```

### Server Actionのメリット

| API Route | Server Action |
|-----------|---------------|
| URLを定義する必要がある | 関数をインポートするだけ |
| `fetch`でHTTPリクエスト | 関数呼び出し |
| JSONのシリアライズが必要 | 自動で処理される |
| 型情報が失われやすい | 型が保持される |

### "use server"ディレクティブ

ファイルの先頭に`"use server"`と書くと、そのファイルの関数はすべてServer Actionになります。

```tsx
"use server";  // ← このファイルの関数はすべてサーバーで実行される

export async function createUser() { /* ... */ }
export async function deleteUser() { /* ... */ }
```

**重要**: Server Actionの関数はサーバーでのみ実行されます。パスワードやAPIキーなどの機密情報を安全に扱えます。

---

## Next.js 16の変更: middleware → proxy

### 何が変わった？

Next.js 16では、ミドルウェアのファイル名が変更されました。

| バージョン | ファイル名 |
|-----------|-----------|
| Next.js 15以前 | `middleware.ts` |
| Next.js 16以降 | `proxy.ts` |

### ミドルウェア（プロキシ）とは？

ユーザーがページにアクセスする前に実行される処理です。主な用途：

- **認証チェック**: ログインしていないユーザーをログインページにリダイレクト
- **リダイレクト**: 古いURLを新しいURLに転送
- **ヘッダーの追加**: セキュリティヘッダーの設定

```
ユーザー → [proxy.ts] → ページ
           ↑
       ここで認証チェック！
```

### proxy.tsの例

```tsx
// src/proxy.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;  // NextAuthの認証ミドルウェアを使用

export const config = {
  // どのパスでミドルウェアを実行するか
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 変更前後のコード比較

### LoginForm.tsx

#### 変更前

```tsx
"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // fetch API を使って登録
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      // ...
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {/* ... */}
    </form>
  );
}
```

#### 変更後

```tsx
"use client";

import { useActionState, useState } from "react";
import { register } from "@/actions/auth";  // Server Actionをインポート

export default function LoginForm() {
  const signupAction = async (prevState, formData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Server Actionを直接呼び出し
    const result = await register({ email, password });

    if (!result.success) {
      return { error: result.error, message: "" };
    }
    return { error: "", message: "登録完了！" };
  };

  const [state, action, isPending] = useActionState(signupAction, initialState);

  return (
    <form action={action}>  {/* onSubmit → action */}
      <input name="email" />  {/* value/onChange 不要 */}
      {/* ... */}
    </form>
  );
}
```

---

## まとめ

### 覚えておきたいポイント

1. **useActionState** = React 19のフォーム処理の新しい方法
   - `useState`を減らせる
   - ローディング状態が自動管理される

2. **Server Action** = サーバー処理を関数として書ける
   - `"use server"`ディレクティブを使う
   - API Routeより簡潔で型安全

3. **proxy.ts** = Next.js 16でのミドルウェアの新しい名前
   - `middleware.ts`から名前が変わっただけ
   - 機能は同じ

### 参考リンク

- [React 19 公式ドキュメント](https://react.dev/)
- [Next.js 16 ドキュメント](https://nextjs.org/docs)
- [Server Actions ガイド](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
