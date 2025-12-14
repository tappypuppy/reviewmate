## 🧠 前提（必ず守ること）

* このプロジェクトは **業務委託メンターの個人用ツール**
* **AIは下書き生成器。最終判断は人間**
* Slackの文面は **会社指定テンプレに完全準拠**
* `Review` は **内部状態**。Slackには絶対に出さない
* まずは **AIなしで CRUD が動くところまで** を完成させる

---

## 📦 技術スタック（固定）

* Next.js 16（App Router）
* TypeScript
* React 19
* NextAuth v5（Credentials Provider）
* MongoDB + Prisma v6
* Zod v4
* Server Actions を基本に実装
* デプロイ：Vercel

---

## 🗂️ フォルダ構成（前提）

```txt
src/
├── app/
│   ├── dashboard/
│   ├── login/
│   ├── policies/
│   └── review/
│       ├── new/
│       └── [id]/
├── actions/
│   ├── auth.ts
│   ├── policies.ts
│   └── tasks.ts
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── auth.config.ts
│   └── schemas.ts
```

---

# 🚀 Phase 1：基盤 & CRUD（AIなし）

### 🎯 ゴール

* ログインできる
* 評価ポリシーを CRUD できる
* 添削タスクを作成・保存・表示できる
* 状態遷移：`draft → reviewed → finalized` が機能する

---

### 実装指示（Phase 1）

1. **Prisma schema を作成**

   * User
   * EvaluationPolicy
   * ReviewTask
   * ReviewOutput

2. **MongoDB 用 Prisma 設定**

   * ObjectId / relations 正しく定義

3. **NextAuth v5**

   * Credentials Provider
   * `/login` ページ
   * 未ログイン時は `/login` にリダイレクト

4. **Server Actions**

   * `policies.ts`

     * createPolicy
     * updatePolicy
     * deletePolicy
     * listPolicies
   * `tasks.ts`

     * createTask
     * getTask
     * finalizeTask（人間確定）

5. **画面**

   * `/dashboard`：簡易一覧
   * `/policies`：一覧＋作成・編集
   * `/review/new`：入力フォーム
   * `/review/[id]`：詳細表示・編集

👉 **この Phase では AI は一切実装しない**

---

# 🤖 Phase 2：AI下書き生成（最重要）

### 🎯 ゴール

* AIが「会社テンプレを埋める素材」を JSON で返す
* Review / Pass / Fail の内部判定が正しく機能する
* UIで事故らない

---

### 🔒 AI出力JSON（固定・厳守）

```json
{
  "result": "Pass | Fail | Review",
  "task_name": "9-6：【提出課題①】LengthBasedExampleSelector",

  "good_points": [
    "〇〇の要件を正しく満たしている"
  ],

  "improvements": [
    "△△のケースが未考慮"
  ],

  "fail_reasons": [
    "必須要件が未実装"
  ],

  "submission_issue": "課題リンクが別課題になっています"
}
```

---

### 実装指示（Phase 2）

1. `generateAiDraft(taskId)` を実装

   * input: policy_text + input_snapshot
   * output: 上記 JSON
   * **Zodで strict validation**

2. 判定ルール

   * 迷ったら `result = Review`
   * `submission_issue` がある場合：

     * `result` は必ず `Review`
   * Pass の場合：`fail_reasons = []`
   * Fail の場合：`improvements = []`

3. DB保存

   * `review_outputs.aiResult` に JSON 保存
   * task.status = `reviewed`

4. UI制御

   * `result === Review` の場合：

     * 🚫 Slackコピー禁止
     * ⚠️「提出不備 or 合否判断を確認してください」表示

---

# 📋 Phase 3：Slackテンプレ生成

### 🎯 ゴール

* 会社指定テンプレを **完全再現**
* 中身だけ AI結果から自動生成
* 人間が微修正 → 確定 → コピペ

---

### Slackテンプレ生成ルール

#### 合格（Pass）

```txt
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
```

#### 不合格（Fail）

```txt
@受講生

課題のご提出ありがとうございます！
採点の結果、残念ながら合格基準を満たさず「不合格」となりました、再提出をお願いします。

*[課題名]*
{{task_name}}

*[不合格の理由・修正点]*
{{fail_reasons}}

*[その他フィードバック/良かった点]*
{{good_points}}
```

#### 提出不備（Review + submission_issue）

```txt
@受講生
課題のご提出、ありがとうございました！
{{submission_issue}}
```

---

### 実装指示（Phase 3）

* Slackテンプレ生成は **純関数**
* `buildSlackMessage(aiResult)` を作成
* Review は **外部に出さない**
* 最終保存時に `slackText` を DB に保存

---

## 🧪 最終チェック（Acceptance）

* [ ] Review 状態で Slack に貼れない
* [ ] Pass / Fail はテンプレ完全一致
* [ ] JSON validation 失敗時は UI にエラー
* [ ] AIが微妙でも人間が修正して確定できる
* [ ] 状態遷移が破綻しない

---

## ⚠️ 注意事項（重要）

* 勝手に機能追加しない
* UXを賢くしようとしない
* 「まず動く・安全」が最優先
* 不明点は **仮実装＋コメントで残す**

---

### 出力してほしいもの

* Prisma schema
* Server Actions 実装
* 主要ページの TSX
* Zod schema
* Slackテンプレ生成関数
* README（起動手順）

---