import Navigation from "@/components/Navigation";
import { listPolicies } from "@/actions/policies";
import { getAssignments } from "@/actions/assignments";
import ReviewForm from "./ReviewForm";

export default async function NewReviewPage() {
  const [assignmentsResult, policiesResult] = await Promise.all([
    getAssignments(),
    listPolicies(),
  ]);
  const assignments = assignmentsResult;
  const policies = policiesResult.success ? policiesResult.data : [];

  return (
    <>
      <Navigation />
      <main className="container" style={{ padding: "2rem 1rem" }}>
        <div className="page-header">
          <h1>新規添削</h1>
          <p>提出物の情報を入力してAI下書きを生成します</p>
        </div>

        <div className="card" style={{ maxWidth: "800px" }}>
          <div className="card__body">
            <ReviewForm assignments={assignments} policies={policies} />
          </div>
        </div>
      </main>
    </>
  );
}
