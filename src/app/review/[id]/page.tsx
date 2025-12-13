import Navigation from "@/components/Navigation";
import { getTask } from "@/actions/tasks";
import { notFound } from "next/navigation";
import ReviewComposer from "./ReviewComposer";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReviewDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getTask(id);

  if (!result.success) {
    notFound();
  }

  const task = result.data;

  return (
    <>
      <Navigation />
      <main className="container" style={{ padding: "2rem 1rem" }}>
        <ReviewComposer task={task} />
      </main>
    </>
  );
}
