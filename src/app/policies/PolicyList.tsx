"use client";

import { useState } from "react";
import { deletePolicy } from "@/actions/policies";
import type { PolicyData } from "@/actions/policies";
import PolicyForm from "./PolicyForm";

type Props = {
  policies: PolicyData[];
};

export default function PolicyList({ policies }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("このポリシーを削除しますか？")) {
      return;
    }

    setDeletingId(id);
    try {
      const result = await deletePolicy(id);
      if (!result.success) {
        alert(result.error);
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="policy-list">
      {policies.map((policy) => (
        <div key={policy.id} className="policy-item">
          {editingId === policy.id ? (
            <PolicyForm
              editingPolicy={policy}
              onCancel={() => setEditingId(null)}
              onSuccess={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="policy-item__header">
                <div className="policy-item__title">{policy.title}</div>
                <div className="policy-item__actions">
                  <button
                    className="btn btn--secondary btn--small"
                    onClick={() => setEditingId(policy.id)}
                  >
                    編集
                  </button>
                  <button
                    className="btn btn--danger btn--small"
                    onClick={() => handleDelete(policy.id)}
                    disabled={deletingId === policy.id}
                  >
                    {deletingId === policy.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </div>
              <div className="policy-item__text">{policy.policyText}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
