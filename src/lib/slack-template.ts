import type { AIResult } from "./schemas";

/**
 * AIResultからSlack用メッセージを生成する純関数
 * Review の場合は null を返す（Slackに出さない）
 */
export function buildSlackMessage(result: AIResult): string | null {
  // Review の場合は null を返す（Slackには絶対に出さない）
  if (result.result === "Review") {
    // submission_issue がある場合のみ、提出不備テンプレートを返す
    if (result.submission_issue) {
      return buildSubmissionIssueMessage(result.submission_issue);
    }
    return null;
  }

  if (result.result === "Pass") {
    return buildPassMessage(result);
  }

  if (result.result === "Fail") {
    return buildFailMessage(result);
  }

  return null;
}

/**
 * 合格テンプレート
 */
function buildPassMessage(result: AIResult): string {
  const goodPoints = formatPoints(result.good_points);
  const improvements = formatPoints(result.improvements);

  return `@受講生

課題のご提出ありがとうございます！
採点の結果、「合格」となりました！おめでとうございます🎉

*[課題名]*
${result.task_name}

*[具体的なフィードバック]*

■良かった点
${goodPoints}

■改善点
${improvements}

以上です！
今回の課題で学んだ内容を活かし、次の課題も頑張ってください！💪`;
}

/**
 * 不合格テンプレート
 */
function buildFailMessage(result: AIResult): string {
  const failReasons = formatPoints(result.fail_reasons);
  const goodPoints = formatPoints(result.good_points);

  return `@受講生

課題のご提出ありがとうございます！
採点の結果、残念ながら合格基準を満たさず「不合格」となりました、再提出をお願いします。

*[課題名]*
${result.task_name}

*[不合格の理由・修正点]*
${failReasons}

*[その他フィードバック/良かった点]*
${goodPoints}

上記の点を修正し、「課題提出フォーム」から再度提出をお願いします！
不明点があれば、質問フォーム、もしくはメンタリングで解消していきましょう💪`;
}

/**
 * 提出不備テンプレート
 */
function buildSubmissionIssueMessage(issue: string): string {
  return `@受講生
課題のご提出、ありがとうございました！
${issue}`;
}

/**
 * 配列をSlack用の箇条書きに整形
 */
function formatPoints(points: string[]): string {
  if (points.length === 0) {
    return "・特になし";
  }
  return points.map((p) => `・${p}`).join("\n");
}

/**
 * Review状態かどうかを判定
 */
export function isReviewState(result: AIResult): boolean {
  return result.result === "Review";
}

/**
 * Slackにコピー可能かどうかを判定
 * Review状態（submission_issueなし）の場合はコピー不可
 */
export function canCopyToSlack(result: AIResult): boolean {
  if (result.result === "Review" && !result.submission_issue) {
    return false;
  }
  return true;
}
