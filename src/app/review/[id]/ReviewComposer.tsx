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
import { buildSlackMessage, isReviewState, canCopyToSlack } from "@/lib/slack-template";

type Props = {
  task: TaskWithRelations;
};

export default function ReviewComposer({ task }: Props) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Editable AI result
  const aiResult = (task.reviewOutput?.aiResult || {}) as Partial<AIResult>;
  const hasAiResult = !!aiResult.result;

  const [editableResult, setEditableResult] = useState<AIResult | null>(
    hasAiResult ? (aiResult as AIResult) : null
  );

  // Slack用テキストを生成
  const generateSlackText = (result: AIResult | null): string => {
    if (!result) return "";
    const message = buildSlackMessage({
      assignmentTitle: task.assignment.title,
      result,
    });
    return message || "";
  };

  const [slackText, setSlackText] = useState(
    task.reviewOutput?.slackText || generateSlackText(editableResult)
  );

  useEffect(() => {
    if (editableResult) {
      const newSlackText = generateSlackText(editableResult);
      if (newSlackText) {
        setSlackText(newSlackText);
      }
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
      const newSlackText = generateSlackText(result.data);
      if (newSlackText) {
        setSlackText(newSlackText);
      }
      router.refresh();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!editableResult) return;

    // Review状態では確定できない（Pass/Failに変更してもらう）
    if (isReviewState(editableResult) && !editableResult.submission_issue) {
      setError("Review状態では確定できません。Pass または Fail に変更してください。");
      return;
    }

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
    if (editableResult && !canCopyToSlack(editableResult)) {
      setError("Review状態ではSlackにコピーできません。");
      return;
    }
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
    field: "good_points" | "improvements" | "fail_reasons",
    index: number,
    value: string
  ) => {
    if (!editableResult) return;
    const arr = [...(editableResult[field] || [])];
    arr[index] = value;
    setEditableResult({ ...editableResult, [field]: arr });
  };

  const addArrayItem = (field: "good_points" | "improvements" | "fail_reasons") => {
    if (!editableResult) return;
    const arr = [...(editableResult[field] || [])];
    if (arr.length < 4) {
      arr.push("");
      setEditableResult({ ...editableResult, [field]: arr });
    }
  };

  const removeArrayItem = (field: "good_points" | "improvements" | "fail_reasons", index: number) => {
    if (!editableResult) return;
    const arr = [...(editableResult[field] || [])];
    arr.splice(index, 1);
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

  const isReview = editableResult ? isReviewState(editableResult) : false;
  const copyDisabled = editableResult ? !canCopyToSlack(editableResult) : false;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1>添削タスク</h1>
          <span className={`badge badge--${task.status}`}>
            {getStatusLabel(task.status)}
          </span>
        </div>
        <p>
          課題: {task.assignment.code}：{task.assignment.title}
        </p>
        {task.policy && (
          <p>ポリシー: {task.policy.title}</p>
        )}
      </div>

      {/* Review状態の警告 */}
      {isReview && !editableResult?.submission_issue && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "var(--radius)",
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <strong>⚠️ Review状態です</strong>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
            提出不備 or 合否判断を確認してください。Pass または Fail に変更してから確定してください。
          </p>
        </div>
      )}

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
                  {(editableResult.good_points || []).map((point, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <input
                        type="text"
                        className="input"
                        value={point}
                        onChange={(e) => updateArrayItem("good_points", i, e.target.value)}
                        disabled={task.status === "finalized"}
                        style={{ flex: 1 }}
                      />
                      {task.status !== "finalized" && (
                        <button
                          type="button"
                          className="btn btn--secondary btn--small"
                          onClick={() => removeArrayItem("good_points", i)}
                        >
                          削除
                        </button>
                      )}
                    </div>
                  ))}
                  {task.status !== "finalized" && (editableResult.good_points || []).length < 4 && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      onClick={() => addArrayItem("good_points")}
                    >
                      + 追加
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label>改善点</label>
                  {(editableResult.improvements || []).map((point, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <input
                        type="text"
                        className="input"
                        value={point}
                        onChange={(e) => updateArrayItem("improvements", i, e.target.value)}
                        disabled={task.status === "finalized"}
                        style={{ flex: 1 }}
                      />
                      {task.status !== "finalized" && (
                        <button
                          type="button"
                          className="btn btn--secondary btn--small"
                          onClick={() => removeArrayItem("improvements", i)}
                        >
                          削除
                        </button>
                      )}
                    </div>
                  ))}
                  {task.status !== "finalized" && (editableResult.improvements || []).length < 4 && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      onClick={() => addArrayItem("improvements")}
                    >
                      + 追加
                    </button>
                  )}
                </div>

                {/* 不合格理由（Failの場合のみ表示） */}
                {editableResult.result === "Fail" && (
                  <div className="form-group">
                    <label>不合格理由</label>
                    {(editableResult.fail_reasons || []).map((reason, i) => (
                      <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <input
                          type="text"
                          className="input"
                          value={reason}
                          onChange={(e) => updateArrayItem("fail_reasons", i, e.target.value)}
                          disabled={task.status === "finalized"}
                          style={{ flex: 1 }}
                        />
                        {task.status !== "finalized" && (
                          <button
                            type="button"
                            className="btn btn--secondary btn--small"
                            onClick={() => removeArrayItem("fail_reasons", i)}
                          >
                            削除
                          </button>
                        )}
                      </div>
                    ))}
                    {task.status !== "finalized" && (editableResult.fail_reasons || []).length < 4 && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--small"
                        onClick={() => addArrayItem("fail_reasons")}
                      >
                        + 追加
                      </button>
                    )}
                  </div>
                )}

                {/* 提出不備（Reviewの場合のみ表示） */}
                {editableResult.result === "Review" && (
                  <div className="form-group">
                    <label>提出不備（あれば）</label>
                    <input
                      type="text"
                      className="input"
                      value={editableResult.submission_issue || ""}
                      onChange={(e) => updateResultField("submission_issue", e.target.value)}
                      disabled={task.status === "finalized"}
                      placeholder="例: 課題リンクが別課題になっています"
                    />
                  </div>
                )}
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
            {copyDisabled && (
              <span style={{ color: "#dc3545", fontSize: "0.875rem" }}>
                ※ Review状態ではコピーできません
              </span>
            )}
          </div>
          <div className="card__body">
            <textarea
              className="textarea"
              value={slackText}
              onChange={(e) => setSlackText(e.target.value)}
              rows={12}
              disabled={task.status === "finalized"}
            />
          </div>
          <div className="card__footer">
            <button
              className="btn btn--secondary"
              onClick={handleCopy}
              disabled={copyDisabled}
            >
              {copied ? "コピーしました!" : "コピー"}
            </button>
            {task.status !== "finalized" && (
              <button
                className="btn btn--primary"
                onClick={handleFinalize}
                disabled={isFinalizing || (isReview && !editableResult?.submission_issue)}
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
