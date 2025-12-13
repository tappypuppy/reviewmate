"use client";

import { useState } from "react";
import { createPolicy, updatePolicy } from "@/actions/policies";
import type { PolicyData } from "@/actions/policies";

type Props = {
  editingPolicy?: PolicyData;
  onCancel?: () => void;
  onSuccess?: () => void;
};

export default function PolicyForm({ editingPolicy, onCancel, onSuccess }: Props) {
  const [title, setTitle] = useState(editingPolicy?.title || "");
  const [policyText, setPolicyText] = useState(editingPolicy?.policyText || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = editingPolicy
        ? await updatePolicy({ id: editingPolicy.id, title, policy_text: policyText })
        : await createPolicy({ title, policy_text: policyText });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (!editingPolicy) {
        setTitle("");
        setPolicyText("");
      }
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">タイトル</label>
        <input
          id="title"
          type="text"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: Python基礎課題の評価観点"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="policy_text">評価観点（ポリシー内容）</label>
        <textarea
          id="policy_text"
          className="textarea"
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
          placeholder="例:&#10;- 変数名は適切か&#10;- 関数は単一責任になっているか&#10;- エラーハンドリングはあるか"
          rows={6}
          required
        />
      </div>

      {error && <p className="error-message">{error}</p>}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : editingPolicy ? "更新" : "作成"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
