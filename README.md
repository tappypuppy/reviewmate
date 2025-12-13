# ReviewMate

業務委託メンターが課題添削を高速化するための個人用SaaS。
AIで添削コメントの下書きを生成し、人間が最終確定してSlackへ貼り付けます。

## 技術スタック

- **Frontend**: Next.js 16 (App Router) + TypeScript + SCSS
- **Auth**: NextAuth (Auth.js v5)
- **Database**: MongoDB Atlas (M0 無料枠)
- **ORM**: Prisma
- **Validation**: Zod
- **Hosting**: Vercel

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. MongoDB Atlasの設定

1. [MongoDB Atlas](https://www.mongodb.com/atlas) でアカウント作成
2. M0 (無料) クラスターを作成
3. Database Access でユーザーを作成
4. Network Access で接続元IPを許可（または 0.0.0.0/0 で全許可）
5. Connect → Drivers から接続文字列を取得

### 3. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集:

```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/reviewmate?retryWrites=true&w=majority"
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:3000"
```

AUTH_SECRETの生成:
```bash
openssl rand -base64 32
```

### 4. Prismaのセットアップ

```bash
# Prismaクライアント生成
npx prisma generate

# DBにスキーマを反映
npx prisma db push
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセスできます。

## 画面構成

| パス | 説明 |
|------|------|
| `/login` | ログイン / サインアップ |
| `/dashboard` | ダッシュボード（タスク一覧） |
| `/review/new` | 新規添削タスク作成 |
| `/review/[id]` | タスク詳細・AI生成・確定 |
| `/policies` | 評価ポリシー管理 |

## 主要機能

### 評価ポリシー (Policies)
- 添削時に使用する評価観点を管理
- タイトルとポリシー内容（自然文）を登録

### 添削タスク (Review Tasks)
- 提出物（テキスト/URL）を入力
- ポリシーを選択（任意）
- AIで下書きを生成（現在はダミー）
- 内容を編集して確定
- Slack用コメントをコピー

### 状態遷移
- `draft`: 入力があるがAI未生成
- `reviewed`: AI生成済（人間未確定）
- `finalized`: 確定済（Slackへ貼る状態）

## ファイル構成

```
src/
├── app/
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # リダイレクト
│   ├── login/                  # ログイン画面
│   ├── dashboard/              # ダッシュボード
│   ├── policies/               # ポリシー管理
│   ├── review/
│   │   ├── new/                # 新規タスク作成
│   │   └── [id]/               # タスク詳細
│   └── api/auth/               # NextAuth API routes
├── actions/
│   ├── policies.ts             # ポリシーCRUD
│   └── tasks.ts                # タスクCRUD + AI生成
├── components/
│   └── Navigation.tsx          # ナビゲーション
├── lib/
│   ├── auth.ts                 # NextAuth設定
│   ├── prisma.ts               # Prismaクライアント
│   └── schemas.ts              # Zodスキーマ
├── styles/
│   ├── globals.scss            # グローバルスタイル
│   └── components.scss         # コンポーネントスタイル
└── middleware.ts               # 認証ミドルウェア

prisma/
└── schema.prisma               # DBスキーマ
```

## AI生成について

現在はダミーの評価結果を返します。
実際のAI連携は `src/actions/tasks.ts` の `generateAiDraft` 関数を修正してください。

出力形式（Zod検証済み）:

```json
{
  "result": "Pass | Fail | Review",
  "good_points": ["..."],
  "improvements": ["..."],
  "confidence_note": "..."
}
```

## コマンド

```bash
npm run dev       # 開発サーバー起動
npm run build     # プロダクションビルド
npm run start     # プロダクションサーバー起動
npm run lint      # ESLint実行
npx prisma studio # Prisma GUI (DB確認用)
```

## Vercelへのデプロイ

1. GitHubリポジトリを作成してプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (本番URL: `https://your-app.vercel.app`)
4. デプロイ

## ライセンス

Private
