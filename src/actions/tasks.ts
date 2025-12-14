"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CreateTaskSchema,
  FinalizeTaskSchema,
  AIResultSchema,
} from "@/lib/schemas";
import type {
  ActionResult,
  CreateTaskInput,
  FinalizeTaskInput,
  AIResult,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import type { SourceType, TaskStatus } from "@prisma/client";

export type TaskData = {
  id: string;
  userId: string;
  policyId: string | null;
  sourceType: SourceType;
  sourceUrl: string | null;
  inputSnapshot: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskWithRelations = TaskData & {
  reviewOutput: {
    id: string;
    aiResult: unknown;
    finalResult: unknown;
    slackText: string | null;
  } | null;
  policy: {
    id: string;
    title: string;
    policyText: string;
  } | null;
};

export async function listTasks(): Promise<ActionResult<TaskData[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const tasks = await prisma.reviewTask.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: tasks };
  } catch (error) {
    return { success: false, error: "タスクの取得に失敗しました" };
  }
}

export async function getTask(
  id: string
): Promise<ActionResult<TaskWithRelations>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const task = await prisma.reviewTask.findFirst({
      where: { id, userId: session.user.id },
      include: {
        reviewOutput: true,
        policy: {
          select: { id: true, title: true, policyText: true },
        },
      },
    });

    if (!task) {
      return { success: false, error: "タスクが見つかりません" };
    }

    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: "タスクの取得に失敗しました" };
  }
}

export async function createTask(
  input: CreateTaskInput
): Promise<ActionResult<TaskData>> {
  const parsed = CreateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const task = await prisma.reviewTask.create({
      data: {
        userId: session.user.id,
        sourceType: parsed.data.source_type,
        sourceUrl: parsed.data.source_url || null,
        inputSnapshot: parsed.data.input_snapshot,
        policyId: parsed.data.policy_id || null,
        status: "draft",
        reviewOutput: {
          create: {
            aiResult: {},
          },
        },
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: "タスクの作成に失敗しました" };
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<ActionResult<TaskData>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const existing = await prisma.reviewTask.findFirst({
      where: { id: taskId, userId: session.user.id },
    });

    if (!existing) {
      return { success: false, error: "タスクが見つかりません" };
    }

    const task = await prisma.reviewTask.update({
      where: { id: taskId },
      data: { status },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/review/${taskId}`);
    return { success: true, data: task };
  } catch (error) {
    return { success: false, error: "ステータスの更新に失敗しました" };
  }
}

export async function generateAiDraft(
  taskId: string
): Promise<ActionResult<AIResult>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const task = await prisma.reviewTask.findFirst({
      where: { id: taskId, userId: session.user.id },
      include: { policy: true },
    });

    if (!task) {
      return { success: false, error: "タスクが見つかりません" };
    }

    // OpenAI API呼び出し
    const aiResult = await callOpenAI(
      task.inputSnapshot,
      task.policy?.policyText || ""
    );

    if (!aiResult.success) {
      return { success: false, error: aiResult.error };
    }

    const validatedResult = AIResultSchema.safeParse(aiResult.data);
    if (!validatedResult.success) {
      console.error("AI出力のバリデーションエラー:", validatedResult.error);
      return {
        success: false,
        error: "AI出力の形式が不正です。手動で評価してください。",
      };
    }

    await prisma.$transaction([
      prisma.reviewOutput.update({
        where: { reviewTaskId: taskId },
        data: { aiResult: validatedResult.data },
      }),
      prisma.reviewTask.update({
        where: { id: taskId },
        data: { status: "reviewed" },
      }),
    ]);

    revalidatePath(`/review/${taskId}`);
    revalidatePath("/dashboard");
    return { success: true, data: validatedResult.data };
  } catch (error) {
    console.error("generateAiDraft error:", error);
    return { success: false, error: "AI生成に失敗しました" };
  }
}

// OpenAI API呼び出し用のヘルパー関数
async function callOpenAI(
  inputSnapshot: string,
  policyText: string
): Promise<ActionResult<unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { success: false, error: "OpenAI APIキーが設定されていません" };
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });

  const systemPrompt = `あなたはプログラミング学習課題の採点アシスタントです。
受講生が提出した課題を評価し、以下のJSON形式で結果を返してください。

【出力JSON形式（厳守）】
{
  "result": "Pass" | "Fail" | "Review",
  "task_name": "課題名（提出内容から推測）",
  "good_points": ["良かった点（最大4つ）"],
  "improvements": ["改善点（最大4つ）"],
  "fail_reasons": ["不合格理由（Failの場合のみ、最大4つ）"],
  "submission_issue": "提出不備があれば記載（任意）"
}

【判定ルール】
- 要件を満たしていれば "Pass"
- 必須要件が未実装なら "Fail"
- 判断に迷う場合は必ず "Review"
- submission_issue がある場合は必ず "Review"
- Pass の場合: fail_reasons = []
- Fail の場合: improvements = []

【重要】
- 最終判断は人間が行います。迷ったら Review にしてください。
- JSON形式のみを出力してください。説明文は不要です。`;

  const userPrompt = `以下の課題提出を評価してください。

${policyText ? `【評価ポリシー】\n${policyText}\n\n` : ""}【提出内容】
${inputSnapshot}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: "AIからの応答がありませんでした" };
    }

    const parsed = JSON.parse(content);
    return { success: true, data: parsed };
  } catch (error) {
    console.error("OpenAI API error:", error);
    if (error instanceof Error) {
      return { success: false, error: `AI呼び出しエラー: ${error.message}` };
    }
    return { success: false, error: "AI呼び出しに失敗しました" };
  }
}

export async function finalizeTask(
  input: FinalizeTaskInput
): Promise<ActionResult<void>> {
  const parsed = FinalizeTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const existing = await prisma.reviewTask.findFirst({
      where: { id: parsed.data.task_id, userId: session.user.id },
    });

    if (!existing) {
      return { success: false, error: "タスクが見つかりません" };
    }

    await prisma.$transaction([
      prisma.reviewOutput.update({
        where: { reviewTaskId: parsed.data.task_id },
        data: {
          finalResult: parsed.data.final_result,
          slackText: parsed.data.slack_text,
        },
      }),
      prisma.reviewTask.update({
        where: { id: parsed.data.task_id },
        data: { status: "finalized" },
      }),
    ]);

    revalidatePath(`/review/${parsed.data.task_id}`);
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: "確定処理に失敗しました" };
  }
}

export async function deleteTask(id: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const existing = await prisma.reviewTask.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return { success: false, error: "タスクが見つかりません" };
    }

    await prisma.reviewTask.delete({
      where: { id },
    });

    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: "タスクの削除に失敗しました" };
  }
}

export async function getDashboardStats(): Promise<
  ActionResult<{
    draftCount: number;
    reviewedCount: number;
    finalizedCount: number;
    recentTasks: TaskData[];
  }>
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const tasks = await prisma.reviewTask.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const draftCount = tasks.filter((t) => t.status === "draft").length;
    const reviewedCount = tasks.filter((t) => t.status === "reviewed").length;
    const finalizedCount = tasks.filter((t) => t.status === "finalized").length;

    return {
      success: true,
      data: {
        draftCount,
        reviewedCount,
        finalizedCount,
        recentTasks: tasks.slice(0, 5),
      },
    };
  } catch (error) {
    return { success: false, error: "統計の取得に失敗しました" };
  }
}
