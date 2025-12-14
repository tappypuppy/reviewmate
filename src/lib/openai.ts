/**
 * OpenAI API呼び出しモジュール
 * AI下書き生成のロジックを集約
 */

import type { ActionResult } from "./schemas";

// ================================================
// 型定義
// ================================================

export type OpenAIInput = {
  assignmentTitle: string;
  assignmentDescription: string;
  inputSnapshot: string;
  policyText: string;
};

// ================================================
// 定数
// ================================================

const SYSTEM_PROMPT = `あなたはプログラミング学習課題の採点アシスタントです。
受講生が提出した課題を評価し、以下のJSON形式で結果を返してください。

【出力JSON形式（厳守）】
{
  "result": "Pass" | "Fail" | "Review",
  "good_points": ["良かった点（最大4つ）"],
  "improvements": ["改善点（最大4つ）"],
  "fail_reasons": ["不合格理由（Failの場合のみ、最大4つ）"],
  "submission_issue": "提出不備があれば記載（任意）"
}

【判定ルール】
- 要件を満たしていれば "Pass"
- 必須要件が未実装なら "Fail"
- 判断に迷う場合は必ず "Review"
- submission_issue がある場合は必ず "Review"
- Pass の場合: fail_reasons = []
- Fail の場合: improvements = []

【重要】
- 最終判断は人間が行います。迷ったら Review にしてください。
- JSON形式のみを出力してください。説明文は不要です。`;

// ================================================
// OpenAI API呼び出し
// ================================================

export async function callOpenAI(
  input: OpenAIInput
): Promise<ActionResult<unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { success: false, error: "OpenAI APIキーが設定されていません" };
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });

  const userPrompt = buildUserPrompt(input);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "AIからの応答がありませんでした" };
    }

    const parsed = JSON.parse(content);
    return { success: true, data: parsed };
  } catch (error) {
    console.error("OpenAI API error:", error);
    if (error instanceof Error) {
      return { success: false, error: `AI呼び出しエラー: ${error.message}` };
    }
    return { success: false, error: "AI呼び出しに失敗しました" };
  }
}

// ================================================
// ヘルパー関数
// ================================================

function buildUserPrompt(input: OpenAIInput): string {
  const policySection = input.policyText
    ? `【評価ポリシー】\n${input.policyText}\n\n`
    : "";

  return `以下のプログラミング課題について、提出物を評価してください。

【課題名】
${input.assignmentTitle}

【課題文】
${input.assignmentDescription}

${policySection}【提出内容】
${input.inputSnapshot}

注意：
- 課題文は評価対象ではありません
- 提出物が課題文の要件を満たしているかを評価してください
- 判断に迷う場合は必ず Review にしてください`;
}
