"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/actions/tasks";
import type { PolicyData } from "@/actions/policies";
import type { SourceType } from "@/lib/schemas";

type Props = {
  policies: PolicyData[];
};

type FormState = {
  error: string;
  redirectTo: string | null;
};

const initialState: FormState = {
  error: "",
  redirectTo: null,
};

const sourceTypes: { value: SourceType; label: string }[] = [
  { value: "text", label: "テキスト" },
  { value: "colab", label: "Google Colab" },
  { value: "docs", label: "Google Docs" },
  { value: "other", label: "その他" },
];

export default function ReviewForm({ policies }: Props) {
  const router = useRouter();

  const formAction = async (
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const taskName = formData.get("task_name") as string;
    const sourceType = formData.get("source_type") as SourceType;
    const sourceUrl = formData.get("source_url") as string;
    const inputSnapshot = formData.get("input_snapshot") as string;
    const policyId = formData.get("policy_id") as string;

    const result = await createTask({
      task_name: taskName,
      source_type: sourceType,
      source_url: sourceUrl || undefined,
      input_snapshot: inputSnapshot,
      policy_id: policyId || undefined,
    });

    if (!result.success) {
      return { error: result.error, redirectTo: null };
    }

    return { error: "", redirectTo: `/review/${result.data.id}` };
  };

  const [state, action, isPending] = useActionState(formAction, initialState);

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state.redirectTo, router]);

  return (
    <form action={action}>
      <div className="form-group">
        <label htmlFor="task_name">課題名</label>
        <input
          id="task_name"
          name="task_name"
          type="text"
          className="input"
          placeholder="例：9-6：【提出課題①】LengthBasedExampleSelector"
          required
        />
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-secondary)",
            marginTop: "0.25rem",
          }}
        >
          ※会社指定の課題名をコピペしてください
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="source_type">提出物の種類</label>
        <select
          id="source_type"
          name="source_type"
          className="select"
          defaultValue="text"
        >
          {sourceTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="source_url">URL（参照用・任意）</label>
        <input
          id="source_url"
          name="source_url"
          type="url"
          className="input"
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

      <div className="form-group">
        <label htmlFor="input_snapshot">提出内容</label>
        <textarea
          id="input_snapshot"
          name="input_snapshot"
          className="textarea"
          placeholder="提出物の内容をここに貼り付けてください..."
          rows={12}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="policy_id">評価ポリシー（任意）</label>
        <select
          id="policy_id"
          name="policy_id"
          className="select"
          defaultValue=""
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

      {state.error && <p className="error-message">{state.error}</p>}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn--primary" disabled={isPending}>
          {isPending ? "作成中..." : "タスクを作成"}
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
