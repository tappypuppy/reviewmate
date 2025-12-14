"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { ActionResult } from "@/lib/schemas";

const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上必要です"),
  name: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export async function register(
  input: RegisterInput
): Promise<ActionResult<{ id: string; email: string | null; name: string | null }>> {
  const parsed = registerSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { email, password, name } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "このメールアドレスは既に登録されています" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch {
    return { success: false, error: "サーバーエラーが発生しました" };
  }
}
