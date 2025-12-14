"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPolicy, updatePolicy } from "@/actions/policies";
import type { PolicyData } from "@/actions/policies";

type Props = {
  editingPolicy?: PolicyData;
  onCancel?: () => void;
  onSuccess?: () => void;
};

type FormState = {
  error: string;
  success: boolean;
};

const initialState: FormState = {
  error: "",
  success: false,
};

export default function PolicyForm({ editingPolicy, onCancel, onSuccess }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const formAction = async (
    _prevState: FormState,
    formData: FormData
  ): Promise<FormState> => {
    const title = formData.get("title") as string;
    const policyText = formData.get("policy_text") as string;

    const result = editingPolicy
      ? await updatePolicy({ id: editingPolicy.id, title, policy_text: policyText })
      : await createPolicy({ title, policy_text: policyText });

    if (!result.success) {
      return { error: result.error, success: false };
    }

    return { error: "", success: true };
  };

  const [state, action, isPending] = useActionState(formAction, initialState);

  useEffect(() => {
    if (state.success) {
      if (!editingPolicy) {
        formRef.current?.reset();
      }
      onSuccess?.();
    }
  }, [state.success, editingPolicy, onSuccess]);

  return (
    <form ref={formRef} action={action}>
      <div className="form-group">
        <label htmlFor="title">タイトル</label>
        <input
          id="title"
          name="title"
          type="text"
          className="input"
          defaultValue={editingPolicy?.title || ""}
          placeholder="例: Python基礎課題の評価観点"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="policy_text">評価観点（ポリシー内容）</label>
        <textarea
          id="policy_text"
          name="policy_text"
          className="textarea"
          defaultValue={editingPolicy?.policyText || ""}
          placeholder="例:&#10;- 変数名は適切か&#10;- 関数は単一責任になっているか&#10;- エラーハンドリングはあるか"
          rows={6}
          required
        />
      </div>

      {state.error && <p className="error-message">{state.error}</p>}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn btn--primary" disabled={isPending}>
          {isPending ? "保存中..." : editingPolicy ? "更新" : "作成"}
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
