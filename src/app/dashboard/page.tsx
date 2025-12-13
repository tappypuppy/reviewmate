import Link from "next/link";
import Navigation from "@/components/Navigation";
import { getDashboardStats } from "@/actions/tasks";

export default async function DashboardPage() {
  const result = await getDashboardStats();

  if (!result.success) {
    return (
      <>
        <Navigation />
        <main className="container" style={{ padding: "2rem 1rem" }}>
          <p className="error-message">{result.error}</p>
        </main>
      </>
    );
  }

  const { draftCount, reviewedCount, finalizedCount, recentTasks } = result.data;

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

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case "colab":
        return "Colab";
      case "docs":
        return "Docs";
      case "text":
        return "テキスト";
      default:
        return "その他";
    }
  };

  return (
    <>
      <Navigation />
      <main className="container" style={{ padding: "2rem 1rem" }}>
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>添削タスクの状況を確認できます</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__label">下書き</div>
            <div className="stat-card__value">{draftCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">AI生成済（未確定）</div>
            <div className="stat-card__value">{reviewedCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__label">確定済</div>
            <div className="stat-card__value">{finalizedCount}</div>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/review/new" className="btn btn--primary btn--large">
            + 新しく添削する
          </Link>
        </div>

        <div className="card">
          <div className="card__header">
            <h3>最近のタスク</h3>
          </div>
          <div className="card__body">
            {recentTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">タスクがありません</div>
                <div className="empty-state__description">
                  「新しく添削する」から最初のタスクを作成してください
                </div>
              </div>
            ) : (
              <div className="task-list">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/review/${task.id}`}
                    className="task-item"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="task-item__content">
                      <div className="task-item__title">
                        {task.inputSnapshot.slice(0, 50)}
                        {task.inputSnapshot.length > 50 && "..."}
                      </div>
                      <div className="task-item__meta">
                        {getSourceTypeLabel(task.sourceType)} ・{" "}
                        {new Date(task.createdAt).toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                    <div className="task-item__actions">
                      <span className={`badge badge--${task.status}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
