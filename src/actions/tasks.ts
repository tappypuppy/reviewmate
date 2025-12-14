"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callOpenAI } from "@/lib/openai";
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
