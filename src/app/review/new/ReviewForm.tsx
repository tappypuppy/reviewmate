"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/actions/tasks";
import type { PolicyData } from "@/actions/policies";
import type { SourceType } from "@/lib/schemas";

type Props = {
  policies: PolicyData[];
};

const sourceTypes: { value: SourceType; label: string }[] = [
  { value: "text", label: "テキスト" },
  { value: "colab", label: "Google Colab" },
  { value: "docs", label: "Google Docs" },
  { value: "other", label: "その他" },
];

export default function ReviewForm({ policies }: Props) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<SourceType>("text");
  const [sourceUrl, setSourceUrl] = useState("");
  const [inputSnapshot, setInputSnapshot] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await createTask({
        source_type: sourceType,
        source_url: sourceUrl || undefined,
        input_snapshot: inputSnapshot,
        policy_id: policyId || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/review/${result.data.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="source_type">提出物の種類</label>
        <select
          id="source_type"
          className="select"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as SourceType)}
        >
          {sourceTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {sourceType !== "text" && (
        <div className="form-group">
          <label htmlFor="source_url">URL（参照用）</label>
          <input
            id="source_url"
            type="url"
            className="input"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
          />
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-secondary)",
              marginTop: "0.25rem",
            }}
          >
            ※URLは参照用です。認証が必要な場合は内容をテキストエリアに貼り付けてください
          </p>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="input_snapshot">提出内容</label>
        <textarea
          id="input_snapshot"
          className="textarea"
          value={inputSnapshot}
          onChange={(e) => setInputSnapshot(e.target.value)}
          placeholder="提出物の内容をここに貼り付けてください..."
          rows={12}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="policy_id">評価ポリシー（任意）</label>
        <select
          id="policy_id"
          className="select"
          value={policyId}
          onChange={(e) => setPolicyId(e.target.value)}
        >
          <option value="">選択しない</option>
          {policies.map((policy) => (
            <option key={policy.id} value={policy.id}>
              {policy.title}
            </option>
          ))}
        </select>
        {policies.length === 0 && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-secondary)",
              marginTop: "0.25rem",
            }}
          >
            ポリシーがありません。
            <a href="/policies">ポリシー管理</a>から作成できます。
          </p>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? "作成中..." : "タスクを作成"}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => router.push("/dashboard")}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
