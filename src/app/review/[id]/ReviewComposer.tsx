"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  generateAiDraft,
  finalizeTask,
  deleteTask,
} from "@/actions/tasks";
import type { TaskWithRelations } from "@/actions/tasks";
import type { AIResult } from "@/lib/schemas";

type Props = {
  task: TaskWithRelations;
};

const resultLabels: Record<string, { label: string; emoji: string }> = {
  Pass: { label: "合格", emoji: "✅" },
  Fail: { label: "不合格", emoji: "❌" },
  Review: { label: "要確認", emoji: "🔍" },
};

function formatSlackText(result: AIResult): string {
  const { label, emoji } = resultLabels[result.result] || {
    label: result.result,
    emoji: "",
  };

  const goodPoints = result.good_points.map((p) => `・${p}`).join("\n");
  const improvements = result.improvements.map((p) => `・${p}`).join("\n");

  return `【判定】${label} ${emoji}

【良かった点】
${goodPoints}

【改善点】
${improvements}`;
}

export default function ReviewComposer({ task }: Props) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Editable AI result
  const aiResult = (task.reviewOutput?.aiResult || {}) as Partial<AIResult>;
  const hasAiResult = aiResult.result && aiResult.good_points && aiResult.improvements;

  const [editableResult, setEditableResult] = useState<AIResult | null>(
    hasAiResult ? (aiResult as AIResult) : null
  );
  const [slackText, setSlackText] = useState(
    task.reviewOutput?.slackText || (hasAiResult ? formatSlackText(aiResult as AIResult) : "")
  );

  useEffect(() => {
    if (editableResult) {
      setSlackText(formatSlackText(editableResult));
    }
  }, [editableResult]);

  const handleGenerateAi = async () => {
    setError("");
    setIsGenerating(true);

    try {
      const result = await generateAiDraft(task.id);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setEditableResult(result.data);
      setSlackText(formatSlackText(result.data));
      router.refresh();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!editableResult) return;

    setError("");
    setIsFinalizing(true);

    try {
      const result = await finalizeTask({
        task_id: task.id,
        final_result: editableResult,
        slack_text: slackText,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このタスクを削除しますか？")) return;

    setIsDeleting(true);
    try {
      const result = await deleteTask(task.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(slackText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateResultField = (
    field: keyof AIResult,
    value: string | string[]
  ) => {
    if (!editableResult) return;
    setEditableResult({ ...editableResult, [field]: value });
  };

  const updateArrayItem = (
    field: "good_points" | "improvements",
    index: number,
    value: string
  ) => {
    if (!editableResult) return;
    const arr = [...editableResult[field]];
    arr[index] = value;
    setEditableResult({ ...editableResult, [field]: arr });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "下書き";
      case "reviewed":
        return "AI生成済";
      case "finalized":
        return "確定済";
      default:
        return status;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1>添削タスク</h1>
          <span className={`badge badge--${task.status}`}>
            {getStatusLabel(task.status)}
          </span>
        </div>
        {task.policy && (
          <p>ポリシー: {task.policy.title}</p>
        )}
      </div>

      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "1fr 1fr" }}>
        {/* Left: Input */}
        <div className="card">
          <div className="card__header">
            <h3>提出内容</h3>
          </div>
          <div className="card__body">
            {task.sourceUrl && (
              <div style={{ marginBottom: "1rem" }}>
                <strong>URL:</strong>{" "}
                <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {task.sourceUrl}
                </a>
              </div>
            )}
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                backgroundColor: "var(--color-background)",
                padding: "1rem",
                borderRadius: "var(--radius)",
                maxHeight: "400px",
                overflow: "auto",
                fontSize: "0.875rem",
              }}
            >
              {task.inputSnapshot}
            </pre>
          </div>
        </div>

        {/* Right: AI Result / Edit */}
        <div className="card">
          <div className="card__header">
            <h3>AI評価結果</h3>
          </div>
          <div className="card__body">
            {!hasAiResult && !editableResult ? (
              <div className="empty-state">
                <div className="empty-state__title">AI評価がまだ生成されていません</div>
                <div className="empty-state__description">
                  「AIで下書きを作る」ボタンをクリックしてください
                </div>
                <button
                  className="btn btn--primary"
                  onClick={handleGenerateAi}
                  disabled={isGenerating}
                >
                  {isGenerating ? "生成中..." : "AIで下書きを作る"}
                </button>
              </div>
            ) : editableResult ? (
              <div>
                <div className="form-group">
                  <label>判定</label>
                  <select
                    className="select"
                    value={editableResult.result}
                    onChange={(e) =>
                      updateResultField("result", e.target.value as "Pass" | "Fail" | "Review")
                    }
                    disabled={task.status === "finalized"}
                  >
                    <option value="Pass">合格</option>
                    <option value="Fail">不合格</option>
                    <option value="Review">要確認</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>良かった点</label>
                  {editableResult.good_points.map((point, i) => (
                    <input
                      key={i}
                      type="text"
                      className="input"
                      value={point}
                      onChange={(e) => updateArrayItem("good_points", i, e.target.value)}
                      disabled={task.status === "finalized"}
                      style={{ marginBottom: "0.5rem" }}
                    />
                  ))}
                </div>

                <div className="form-group">
                  <label>改善点</label>
                  {editableResult.improvements.map((point, i) => (
                    <input
                      key={i}
                      type="text"
                      className="input"
                      value={point}
                      onChange={(e) => updateArrayItem("improvements", i, e.target.value)}
                      disabled={task.status === "finalized"}
                      style={{ marginBottom: "0.5rem" }}
                    />
                  ))}
                </div>

                <div className="form-group">
                  <label>備考</label>
                  <input
                    type="text"
                    className="input"
                    value={editableResult.confidence_note}
                    onChange={(e) => updateResultField("confidence_note", e.target.value)}
                    disabled={task.status === "finalized"}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Slack Output */}
      {editableResult && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="card__header">
            <h3>Slack用コメント</h3>
          </div>
          <div className="card__body">
            <textarea
              className="textarea"
              value={slackText}
              onChange={(e) => setSlackText(e.target.value)}
              rows={10}
              disabled={task.status === "finalized"}
            />
          </div>
          <div className="card__footer">
            <button
              className="btn btn--secondary"
              onClick={handleCopy}
            >
              {copied ? "コピーしました!" : "コピー"}
            </button>
            {task.status !== "finalized" && (
              <button
                className="btn btn--primary"
                onClick={handleFinalize}
                disabled={isFinalizing}
              >
                {isFinalizing ? "確定中..." : "確定保存"}
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="error-message" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem" }}>
        <button
          className="btn btn--secondary"
          onClick={() => router.push("/dashboard")}
        >
          ダッシュボードに戻る
        </button>
        {task.status !== "finalized" && (
          <button
            className="btn btn--danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "削除中..." : "タスクを削除"}
          </button>
        )}
      </div>
    </div>
  );
}
