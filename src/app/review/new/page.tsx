import Navigation from "@/components/Navigation";
import { listPolicies } from "@/actions/policies";
import ReviewForm from "./ReviewForm";

export default async function NewReviewPage() {
  const policiesResult = await listPolicies();
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
            <ReviewForm policies={policies} />
          </div>
        </div>
      </main>
    </>
  );
}
