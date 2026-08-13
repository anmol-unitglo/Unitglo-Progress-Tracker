"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { redirect, isRedirectError } from "next/navigation";
import {
  createDeveloperTask,
  updateDeveloperTaskProgress,
  submitTaskForTesting,
  startTaskTesting,
  passTaskTesting,
  failTaskTestingAndCreateDefect,
  recordRetest,
  cancelTask,
  reassignTask,
  updateTaskPlanning,
  createPMTask
} from "@/services/taskService";

async function requireRole(allowedRole: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== allowedRole) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function actionCreatePMTask(formData: FormData) {
  try {
    const user = await requireRole("PM");
    
    const data = {
      projectId: formData.get("projectId"),
      developerId: formData.get("developerId"),
      module: formData.get("module"),
      title: formData.get("title"),
      description: formData.get("description"),
      plannedStart: formData.get("plannedStart"),
      deadline: formData.get("deadline"),
      commitment: formData.get("commitment"),
      commitmentUnit: formData.get("commitmentUnit"),
      priority: formData.get("priority")
    };

    await createPMTask(parseInt(user.id), data);
    revalidatePath("/pm/tasks");
    redirect("/pm/tasks?alert=success&msg=Task+created+successfully");
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/pm/tasks?alert=error&msg=${encodeURIComponent(error.message || 'Failed to create task')}`);
  }
}

export async function actionCreateTask(formData: FormData) {
  try {
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
    redirect("/developer/dashboard?alert=success&msg=Task+created+successfully");
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/developer/dashboard?alert=error&msg=${encodeURIComponent(error.message || 'Failed to create task')}`);
  }
}

export async function actionUpdateTask(taskId: number, formData: FormData) {
  try {
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
    redirect(`/developer/tasks/${taskId}?alert=success&msg=Task+updated+successfully`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/developer/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to update task')}`);
  }
}

export async function actionSubmitForTesting(taskId: number) {
  try {
    const user = await requireRole("DEVELOPER");
    await submitTaskForTesting(parseInt(user.id), taskId);
    revalidatePath("/developer/dashboard");
    revalidatePath(`/developer/tasks/${taskId}`);
    redirect(`/developer/tasks/${taskId}?alert=success&msg=Task+submitted+for+testing`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/developer/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to submit task')}`);
  }
}

export async function actionStartTesting(taskId: number) {
  try {
    const user = await requireRole("TESTER");
    await startTaskTesting(parseInt(user.id), taskId);
    revalidatePath("/tester/dashboard");
    revalidatePath(`/tester/tasks/${taskId}`);
    redirect(`/tester/tasks/${taskId}?alert=success&msg=Testing+started`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/tester/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to start testing')}`);
  }
}

export async function actionPassTesting(taskId: number, formData: FormData) {
  try {
    const user = await requireRole("TESTER");
    const remarks = formData.get("remarks") as string;
    await passTaskTesting(parseInt(user.id), taskId, remarks);
    revalidatePath("/tester/dashboard");
    revalidatePath(`/tester/tasks/${taskId}`);
    redirect(`/tester/tasks/${taskId}?alert=success&msg=Task+passed+testing`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/tester/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to pass task')}`);
  }
}

export async function actionFailTesting(taskId: number, formData: FormData) {
  try {
    const user = await requireRole("TESTER");
    
    const data = {
      description: formData.get("description"),
      severity: formData.get("severity"),
      remarks: formData.get("remarks")
    };

    await failTaskTestingAndCreateDefect(parseInt(user.id), taskId, data);
    revalidatePath("/tester/dashboard");
    revalidatePath(`/tester/tasks/${taskId}`);
    redirect(`/tester/tasks/${taskId}?alert=success&msg=Task+failed+testing+and+defect+logged`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/tester/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to log defect')}`);
  }
}

export async function actionRetest(taskId: number, formData: FormData) {
  try {
    const user = await requireRole("TESTER");
    const result = formData.get("result") as any;
    const remarks = formData.get("remarks") as string;

    await recordRetest(parseInt(user.id), taskId, result, remarks);
    revalidatePath("/tester/dashboard");
    revalidatePath(`/tester/tasks/${taskId}`);
    redirect(`/tester/tasks/${taskId}?alert=success&msg=Retest+recorded+successfully`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/tester/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to record retest')}`);
  }
}

// ------------------------------------------------------------------
// PM ACTIONS (V1.1 Admin Features)
// ------------------------------------------------------------------

export async function actionCancelTask(taskId: number) {
  try {
    const user = await requireRole("PM");
    await cancelTask(parseInt(user.id), taskId);
    revalidatePath("/pm/dashboard");
    revalidatePath(`/pm/tasks/${taskId}`);
    redirect(`/pm/tasks/${taskId}?alert=success&msg=Task+cancelled+successfully`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/pm/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to cancel task')}`);
  }
}

export async function actionReassignTask(taskId: number, formData: FormData) {
  try {
    const user = await requireRole("PM");
    const role = formData.get("role") as 'DEVELOPER' | 'TESTER';
    const newUserId = parseInt(formData.get("newUserId") as string);
    
    if (!role || !newUserId) {
      throw new Error("Role and newUserId are required.");
    }
    
    await reassignTask(parseInt(user.id), taskId, role, newUserId);
    revalidatePath("/pm/dashboard");
    revalidatePath(`/pm/tasks/${taskId}`);
    redirect(`/pm/tasks/${taskId}?alert=success&msg=Task+reassigned+successfully`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/pm/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to reassign task')}`);
  }
}

export async function actionUpdateTaskPlanning(taskId: number, formData: FormData) {
  try {
    const user = await requireRole("PM");
    
    const data = {
      title: formData.get("title") || undefined,
      description: formData.get("description"),
      priority: formData.get("priority") || undefined,
      commitment: formData.get("commitment") || undefined,
      commitmentUnit: formData.get("commitmentUnit") || undefined,
      developerId: formData.get("developerId") || undefined,
      testerId: formData.get("testerId") || undefined,
    };

    await updateTaskPlanning(parseInt(user.id), taskId, data);
    revalidatePath("/pm/dashboard");
    revalidatePath(`/pm/tasks/${taskId}`);
    redirect(`/pm/tasks/${taskId}?alert=success&msg=Task+planning+updated`);
  } catch (error: any) { if (isRedirectError(error: any)) throw error: any;
    redirect(`/pm/tasks/${taskId}?alert=error&msg=${encodeURIComponent(error.message || 'Failed to update planning')}`);
  }
}
