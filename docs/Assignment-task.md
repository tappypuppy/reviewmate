# 📘 課題マスタ（Assignment）導入タスク / 設計書

※ ReviewMate 既存実装への追加

---

## 0. 目的（Why）

生成AIスクールでは **全生徒が同一の教材・同一の課題を解く**。
そのため、

* 課題名（Slackテンプレ用の正解文字列）
* 課題文（AI評価の前提となる一次情報）

を **使い回せるマスタとして管理**し、
添削時は「選択するだけ」にしたい。

---

## 1. ゴール（Done の定義）

以下がすべて満たされていること。

1. 課題名＋課題文をセットにした **Assignment（課題マスタ）** が存在する
2. 添削作成時に **Assignment を選択**できる
3. Slackテンプレでは **Assignment.title** が使われる
4. AI評価時に **Assignment.description（課題文）** が必ずプロンプトに含まれる
5. 人間は課題名・課題文を **コピペしない**

---

## 2. 追加するデータモデル

### Prisma Schema（MongoDB想定）

```prisma
model Assignment {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  code        String   // 例: "9-6"
  title       String   // 例: 【提出課題①】LengthBasedExampleSelector
  description String   // 課題文（全文）
  createdAt   DateTime @default(now())

  reviewTasks ReviewTask[]
}
```

### ReviewTask 側の変更

```prisma
model ReviewTask {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  assignmentId  String   @db.ObjectId
  assignment    Assignment @relation(fields: [assignmentId], references: [id])

  policyId      String?
  inputSnapshot String
  status        String
  createdAt     DateTime @default(now())
}
```

---

## 3. Assignment の初期データ

* UIはまだ不要
* **Prisma Studio もしくは seed.ts で手入力**

例：

```txt
code: "9-6"
title: "【提出課題①】LengthBasedExampleSelector"
description: "<会社が定義した正式な課題文全文>"
```

---

## 4. Server Actions の追加

### `src/actions/assignments.ts`

実装する関数：

```ts
getAssignments(): Promise<Assignment[]>
getAssignmentById(id: string): Promise<Assignment | null>
```

※ CRUD 全部は不要
※ 今は「一覧取得＋参照」だけでOK

---

## 5. 添削作成画面（UI変更）

### 対象

`/review/new`

### 追加UI（最上部）

```
課題選択（必須）
[ 9-6：【提出課題①】LengthBasedExampleSelector ▼ ]
```

* `Assignment` 一覧から選択
* select / combobox どちらでも可
* 選択した `assignmentId` を ReviewTask 作成時に保存

👉 課題名の手入力欄は **削除する**

---

## 6. Slackテンプレ生成ロジックの変更

### Before（想定）

```ts
buildSlackMessage({
  taskName,
  aiResult
})
```

### After（確定）

```ts
buildSlackMessage({
  assignmentTitle,
  aiResult
})
```

* `assignment.title` をそのまま使用
* AIの出力に task_name は含めない

---

## 7. AIプロンプトの変更（最重要）

### buildUserPrompt の最終形

```text
以下のプログラミング課題について、提出物を評価してください。

【課題名】
{{assignment.title}}

【課題文】
{{assignment.description}}

【評価ポリシー】
{{policyText}}

【提出内容】
{{inputSnapshot}}

注意：
- 課題文は評価対象ではありません
- 提出物が課題文の要件を満たしているかを評価してください
- 判断に迷う場合は必ず Review にしてください
```

---

## 8. 設計上のルール（重要）

* Assignment は **AIに生成させない**
* Assignment は **人間が決めた正解情報**
* Assignment.description は **要約しない・加工しない**
* ReviewTask は **assignmentId を必須にする**

---

## 9. 実装順（Claude Code 向け）

### Phase 1（DB）

1. Prisma schema に Assignment 追加
2. ReviewTask に assignmentId 追加
3. `prisma db push`

---

### Phase 2（Server Actions）

4. assignments.ts 作成
5. getAssignments 実装

---

### Phase 3（UI）

6. `/review/new` に Assignment 選択 UI 追加
7. ReviewTask 作成時に assignmentId 保存

---

### Phase 4（AI & Slack）

8. AIプロンプトに assignment.description を追加
9. Slackテンプレ生成で assignment.title を使用

---

## 10. やらなくていいこと（今は）

* Assignment 編集UI
* Assignment 削除
* バージョン管理
* 生徒側画面

---

## 11. 実装完了のチェックリスト

* [ ] 添削時に課題名を一切手入力していない
* [ ] AIが課題文を前提に評価している
* [ ] Slackテンプレの課題名が常に正しい
* [ ] 課題が違うと AI評価が明確に変わる

---