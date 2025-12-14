# ReviewMate - プロジェクト概要

## 前提（必ず守ること）

- このプロジェクトは **業務委託メンターの個人用ツール**
- **AIは下書き生成器。最終判断は人間**
- Slackの文面は **会社指定テンプレに完全準拠**
- `Review` は **内部状態**。Slackには絶対に出さない
- 勝手に機能追加しない。UXを賢くしようとしない
- 「まず動く・安全」が最優先

---

## 技術スタック（固定）

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| UI | React 19 + SCSS |
| 認証 | NextAuth v5 (Credentials Provider) |
| DB | MongoDB + Prisma 6 |
| バリデーション | Zod v4 |
| 実装方針 | Server Actions を基本に |
| デプロイ | Vercel |

---

## ディレクトリ構成

```
src/
├── app/
│   ├── api/auth/           # NextAuth API Routes
│   ├── dashboard/          # ダッシュボード画面
│   ├── login/              # ログイン画面
│   ├── policies/           # ポリシー管理画面
│   └── review/
│       ├── new/            # 新規作成
│       └── [id]/           # 詳細・編集
├── actions/
│   ├── auth.ts             # 認証関連
│   ├── policies.ts         # ポリシーCRUD
│   └── tasks.ts            # タスクCRUD + AI生成
├── lib/
│   ├── prisma.ts           # Prismaクライアント
│   ├── auth.ts             # NextAuth設定
│   ├── auth.config.ts      # 認証設定（Edge用）
│   ├── schemas.ts          # Zodスキーマ
│   └── slack-template.ts   # Slackテンプレ生成（純関数）
├── styles/                 # SCSSファイル
└── proxy.ts                # Next.js Proxy（認証ミドルウェア）
```

---

## データモデル

### ReviewTask（添削タスク）
- 状態遷移: `draft` → `reviewed` → `finalized`
- ソースタイプ: `colab`, `docs`, `text`, `other`

### ReviewOutput（評価結果）
- `aiResult`: AI下書き（JSON）
- `finalResult`: 人間確定後の結果
- `slackText`: Slack用整形テキスト

---

## AI出力JSON（固定・厳守）

```json
{
  "result": "Pass | Fail | Review",
  "task_name": "課題名（例：9-6：【提出課題①】LengthBasedExampleSelector）",
  "good_points": ["〇〇の要件を正しく満たしている"],
  "improvements": ["△△のケースが未考慮"],
  "fail_reasons": ["必須要件が未実装"],
  "submission_issue": "課題リンクが別課題になっています"
}
```

### 判定ルール
- 迷ったら `result = Review`
- `submission_issue` がある場合 → `result` は必ず `Review`
- Pass の場合 → `fail_reasons = []`
- Fail の場合 → `improvements = []`

---

## Slackテンプレート（会社指定・完全準拠）

### 合格（Pass）

```
@受講生

課題のご提出ありがとうございます！
採点の結果、「合格」となりました！おめでとうございます🎉

*[課題名]*
{{task_name}}

*[具体的なフィードバック]*

■良かった点
{{good_points}}

■改善点
{{improvements}}

以上です！
今回の課題で学んだ内容を活かし、次の課題も頑張ってください！💪
```

### 不合格（Fail）

```
@受講生

課題のご提出ありがとうございます！
採点の結果、残念ながら合格基準を満たさず「不合格」となりました、再提出をお願いします。

*[課題名]*
{{task_name}}

*[不合格の理由・修正点]*
{{fail_reasons}}

*[その他フィードバック/良かった点]*
{{good_points}}

上記の点を修正し、「課題提出フォーム」から再度提出をお願いします！
不明点があれば、質問フォーム、もしくはメンタリングで解消していきましょう💪
```

### 提出不備（Review + submission_issue）

```
@受講生
課題のご提出、ありがとうございました！
{{submission_issue}}
```

---

## UI制御ルール

- `result === Review` の場合:
  - 🚫 **Slackコピー禁止**
  - ⚠️「提出不備 or 合否判断を確認してください」表示
  - 人間がPass/Failに変更してから確定

---

## コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # ビルド
npm run lint         # ESLint実行
npx prisma studio    # Prisma Studio（DB確認）
npx prisma db push   # スキーマをDBに反映
```

---

## 環境変数

```
DATABASE_URL=          # MongoDB接続URL
AUTH_SECRET=           # NextAuth用シークレット
NEXTAUTH_URL=          # サイトURL（本番）
OPENAI_API_KEY=        # OpenAI APIキー（Phase 2以降）
```
