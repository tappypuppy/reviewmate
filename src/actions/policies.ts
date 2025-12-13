"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatePolicySchema, UpdatePolicySchema } from "@/lib/schemas";
import type {
  ActionResult,
  CreatePolicyInput,
  UpdatePolicyInput,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";

export type PolicyData = {
  id: string;
  userId: string;
  title: string;
  policyText: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listPolicies(): Promise<ActionResult<PolicyData[]>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const policies = await prisma.evaluationPolicy.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: policies };
  } catch (error) {
    return { success: false, error: "ポリシーの取得に失敗しました" };
  }
}

export async function getPolicy(id: string): Promise<ActionResult<PolicyData>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const policy = await prisma.evaluationPolicy.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!policy) {
      return { success: false, error: "ポリシーが見つかりません" };
    }

    return { success: true, data: policy };
  } catch (error) {
    return { success: false, error: "ポリシーの取得に失敗しました" };
  }
}

export async function createPolicy(
  input: CreatePolicyInput
): Promise<ActionResult<PolicyData>> {
  const parsed = CreatePolicySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    const policy = await prisma.evaluationPolicy.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title,
        policyText: parsed.data.policy_text,
      },
    });

    revalidatePath("/policies");
    return { success: true, data: policy };
  } catch (error) {
    return { success: false, error: "ポリシーの作成に失敗しました" };
  }
}

export async function updatePolicy(
  input: UpdatePolicyInput
): Promise<ActionResult<PolicyData>> {
  const parsed = UpdatePolicySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    // Verify ownership
    const existing = await prisma.evaluationPolicy.findFirst({
      where: { id: parsed.data.id, userId: session.user.id },
    });

    if (!existing) {
      return { success: false, error: "ポリシーが見つかりません" };
    }

    const policy = await prisma.evaluationPolicy.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        policyText: parsed.data.policy_text,
      },
    });

    revalidatePath("/policies");
    return { success: true, data: policy };
  } catch (error) {
    return { success: false, error: "ポリシーの更新に失敗しました" };
  }
}

export async function deletePolicy(id: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" };
  }

  try {
    // Verify ownership
    const existing = await prisma.evaluationPolicy.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return { success: false, error: "ポリシーが見つかりません" };
    }

    await prisma.evaluationPolicy.delete({
      where: { id },
    });

    revalidatePath("/policies");
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: "ポリシーの削除に失敗しました" };
  }
}
