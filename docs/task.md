# 実装タスク一覧

## 現在の状況

Phase 1（基盤 & CRUD）は **概ね完了**。ただし、以下の修正が必要。

---

## 即座に対応が必要なタスク

### Task 1: AIResultSchemaを新仕様に更新
**ファイル:** `src/lib/schemas.ts`

**現在:**
```ts
export const AIResultSchema = z.object({
  result: z.enum(["Pass", "Fail", "Review"]),
  good_points: z.array(z.string().max(200)).min(1).max(4),
  improvements: z.array(z.string().max(200)).min(1).max(4),
  confidence_note: z.string().max(300),  // ← 削除
});
```

**変更後:**
```ts
export const AIResultSchema = z.object({
  result: z.enum(["Pass", "Fail", "Review"]),
  task_name: z.string().min(1).max(200),
  good_points: z.array(z.string().max(200)).max(4).default([]),
  improvements: z.array(z.string().max(200)).max(4).default([]),
  fail_reasons: z.array(z.string().max(200)).max(4).default([]),
  submission_issue: z.string().max(500).optional(),
});
```

---

### Task 2: Slackテンプレ生成関数を作成
**ファイル:** `src/lib/slack-template.ts`（新規作成）

```ts
import type { AIResult } from "./schemas";

export function buildSlackMessage(result: AIResult): string | null {
  // Review の場合は null を返す（Slackに出さない）
  if (result.result === "Review") {
    return null;
  }

  // Pass / Fail に応じてテンプレート生成
  // CLAUDE.mdのSlackテンプレートに完全準拠
}
```

---

### Task 3: ReviewComposer.tsxを更新
**ファイル:** `src/app/review/[id]/ReviewComposer.tsx`

**変更点:**
1. `formatSlackText` を削除し、`buildSlackMessage` を使用
2. Review時はコピーボタンを非活性化
3. Review時に警告メッセージを表示
4. 新しいAIResultの項目に対応（task_name, fail_reasons, submission_issue）

---

### Task 4: FinalizeTaskSchemaを更新
**ファイル:** `src/lib/schemas.ts`

現在の `FinalizeTaskSchema` を新しい `AIResultSchema` に合わせて更新。

---

## Phase 2 タスク（AI下書き生成）

### Task 5: generateAiDraft実装を本実装に
**ファイル:** `src/actions/tasks.ts`

現在はダミーデータを返している。OpenAI API呼び出しを実装。

**手順:**
1. OpenAI SDKをインストール
2. プロンプトを実装（spec.md参照）
3. AIResultSchemaでstrict validation
4. エラー時はUIにエラー表示

---

### Task 6: タスク作成フォームに課題名フィールド追加
**ファイル:** `src/app/review/new/ReviewForm.tsx`

`task_name` を入力できるようにする（またはAIに推測させる）。

---

## チェックリスト

- [ ] AIResultSchemaが新仕様に更新されている
- [ ] slack-template.ts が存在し、会社テンプレ完全準拠
- [ ] Review状態でSlackコピーできない
- [ ] Review状態で警告が表示される
- [ ] Pass/Failはテンプレ完全一致
- [ ] JSON validation 失敗時はUIにエラー
- [ ] AIが微妙でも人間が修正して確定できる

---

## 実装順序（推奨）

```
1. Task 1 (schemas.ts更新)
   ↓
2. Task 4 (FinalizeTaskSchema更新)
   ↓
3. Task 2 (slack-template.ts作成)
   ↓
4. Task 3 (ReviewComposer.tsx更新)
   ↓
5. ビルド確認
   ↓
6. Task 5 (AI実装) ← Phase 2
   ↓
7. Task 6 (task_name入力)
```

---

## 注意事項

- 勝手に機能追加しない
- UXを賢くしようとしない
- 不明点は仮実装＋コメントで残す
- 「まず動く・安全」が最優先
