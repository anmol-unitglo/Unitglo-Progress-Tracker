"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import {
  createDeveloperTask,
  updateDeveloperTaskProgress,
  submitTaskForTesting,
  startTaskTesting,
  passTaskTesting,
  failTaskTestingAndCreateDefect,
  recordRetest
} from "@/services/taskService";

async function requireRole(allowedRole: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== allowedRole) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function actionCreateTask(formData: FormData) {
  const user = await requireRole("DEVELOPER");
  
  const data = {
    projectId: formData.get("projectId"),
    module: formData.get("module"),
    title: formData.get("title"),
    description: formData.get("description"),
    assignedById: formData.get("assignedById"),
    plannedStart: formData.get("plannedStart"),
    deadline: formData.get("deadline"),
    commitment: formData.get("commitment"),
    commitmentUnit: formData.get("commitmentUnit"),
    priority: formData.get("priority")
  };

  await createDeveloperTask(parseInt(user.id), data);
  revalidatePath("/developer/dashboard");
}

export async function actionUpdateTask(taskId: number, formData: FormData) {
  const user = await requireRole("DEVELOPER");
  
  const data = {
    progress: formData.get("progress"),
    status: formData.get("status"),
    actualStart: formData.get("actualStart"),
    actualEffort: formData.get("actualEffort"),
    remarks: formData.get("remarks"),
  };

  await updateDeveloperTaskProgress(parseInt(user.id), taskId, data);
  revalidatePath("/developer/dashboard");
  revalidatePath(`/developer/tasks/${taskId}`);
}

export async function actionSubmitForTesting(taskId: number) {
  const user = await requireRole("DEVELOPER");
  await submitTaskForTesting(parseInt(user.id), taskId);
  revalidatePath("/developer/dashboard");
  revalidatePath(`/developer/tasks/${taskId}`);
}

export async function actionStartTesting(taskId: number) {
  const user = await requireRole("TESTER");
  await startTaskTesting(parseInt(user.id), taskId);
  revalidatePath("/tester/dashboard");
  revalidatePath(`/tester/tasks/${taskId}`);
}

export async function actionPassTesting(taskId: number, formData: FormData) {
  const user = await requireRole("TESTER");
  const remarks = formData.get("remarks") as string;
  await passTaskTesting(parseInt(user.id), taskId, remarks);
  revalidatePath("/tester/dashboard");
  revalidatePath(`/tester/tasks/${taskId}`);
}

export async function actionFailTesting(taskId: number, formData: FormData) {
  const user = await requireRole("TESTER");
  
  const data = {
    description: formData.get("description"),
    severity: formData.get("severity"),
    remarks: formData.get("remarks")
  };

  await failTaskTestingAndCreateDefect(parseInt(user.id), taskId, data);
  revalidatePath("/tester/dashboard");
  revalidatePath(`/tester/tasks/${taskId}`);
}

export async function actionRetest(taskId: number, formData: FormData) {
  const user = await requireRole("TESTER");
  const result = formData.get("result") as any;
  const remarks = formData.get("remarks") as string;

  await recordRetest(parseInt(user.id), taskId, result, remarks);
  revalidatePath("/tester/dashboard");
  revalidatePath(`/tester/tasks/${taskId}`);
}
