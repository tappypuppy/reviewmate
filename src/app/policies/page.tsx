import Navigation from "@/components/Navigation";
import { listPolicies } from "@/actions/policies";
import PolicyList from "./PolicyList";
import PolicyForm from "./PolicyForm";

export default async function PoliciesPage() {
  const result = await listPolicies();

  return (
    <>
      <Navigation />
      <main className="container" style={{ padding: "2rem 1rem" }}>
        <div className="page-header">
          <h1>評価ポリシー管理</h1>
          <p>添削時に使用する評価観点を管理します</p>
        </div>

        <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <div className="card">
              <div className="card__header">
                <h3>新規ポリシー作成</h3>
              </div>
              <div className="card__body">
                <PolicyForm />
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card__header">
                <h3>ポリシー一覧</h3>
              </div>
              <div className="card__body">
                {!result.success ? (
                  <p className="error-message">{result.error}</p>
                ) : result.data.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state__title">ポリシーがありません</div>
                    <div className="empty-state__description">
                      左のフォームから最初のポリシーを作成してください
                    </div>
                  </div>
                ) : (
                  <PolicyList policies={result.data} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
