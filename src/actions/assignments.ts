"use server";

import { prisma } from "@/lib/prisma";

export type AssignmentData = {
  id: string;
  code: string;
  title: string;
  description: string;
  createdAt: Date;
};

export async function getAssignments(): Promise<AssignmentData[]> {
  const assignments = await prisma.assignment.findMany({
    orderBy: { code: "asc" },
  });
  return assignments;
}

export async function getAssignmentById(
  id: string
): Promise<AssignmentData | null> {
  const assignment = await prisma.assignment.findUnique({
    where: { id },
  });
  return assignment;
}
