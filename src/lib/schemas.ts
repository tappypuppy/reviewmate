import { z } from "zod";

// ================================================
// Database Types
// ================================================

export const SourceTypeSchema = z.enum(["colab", "docs", "text", "other"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const TaskStatusSchema = z.enum(["draft", "reviewed", "finalized"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// ================================================
// Evaluation Policy Schemas
// ================================================

export const EvaluationPolicySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  policy_text: z.string().min(1),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type EvaluationPolicy = z.infer<typeof EvaluationPolicySchema>;

export const CreatePolicySchema = z.object({
  title: z.string().min(1, "タイトルは必須です").max(100, "タイトルは100文字以内"),
  policy_text: z.string().min(1, "ポリシー内容は必須です").max(5000, "ポリシーは5000文字以内"),
});
export type CreatePolicyInput = z.infer<typeof CreatePolicySchema>;

export const UpdatePolicySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "タイトルは必須です").max(100, "タイトルは100文字以内"),
  policy_text: z.string().min(1, "ポリシー内容は必須です").max(5000, "ポリシーは5000文字以内"),
});
export type UpdatePolicyInput = z.infer<typeof UpdatePolicySchema>;

// ================================================
// Review Task Schemas
// ================================================

export const ReviewTaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  policy_id: z.string().uuid().nullable(),
  source_type: SourceTypeSchema,
  source_url: z.string().nullable(),
  input_snapshot: z.string(),
  status: TaskStatusSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ReviewTask = z.infer<typeof ReviewTaskSchema>;

export const CreateTaskSchema = z.object({
  source_type: SourceTypeSchema,
  source_url: z.string().url().optional().or(z.literal("")),
  input_snapshot: z.string().min(1, "入力内容は必須です").max(50000, "入力は50000文字以内"),
  policy_id: z.string().uuid().optional().or(z.literal("")),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// ================================================
// Review Output Schemas
// ================================================

export const AIResultSchema = z.object({
  result: z.enum(["Pass", "Fail", "Review"]),
  good_points: z.array(z.string().max(200)).min(1).max(4),
  improvements: z.array(z.string().max(200)).min(1).max(4),
  confidence_note: z.string().max(300),
});
export type AIResult = z.infer<typeof AIResultSchema>;

export const ReviewOutputSchema = z.object({
  id: z.string().uuid(),
  review_task_id: z.string().uuid(),
  ai_result: AIResultSchema.or(z.object({})),
  final_result: AIResultSchema.nullable(),
  slack_text: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;

export const FinalizeTaskSchema = z.object({
  task_id: z.string().uuid(),
  final_result: AIResultSchema,
  slack_text: z.string().min(1, "Slack用テキストは必須です").max(5000),
});
export type FinalizeTaskInput = z.infer<typeof FinalizeTaskSchema>;

// ================================================
// Combined Types (for queries with joins)
// ================================================

export const ReviewTaskWithOutputSchema = ReviewTaskSchema.extend({
  review_outputs: ReviewOutputSchema.nullable(),
  evaluation_policies: EvaluationPolicySchema.pick({
    id: true,
    title: true,
    policy_text: true,
  }).nullable(),
});
export type ReviewTaskWithOutput = z.infer<typeof ReviewTaskWithOutputSchema>;

// ================================================
// Action Response Types
// ================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
