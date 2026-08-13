"use server";

import { redirect, isRedirectError } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createProject, updateProject, assignProjectMembers, removeProjectMember } from "@/services/projectService";

async function requireRole(allowedRole: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== allowedRole) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function actionCreateProject(formData: FormData) {
  try {
    const user = await requireRole("PM");
    const data = {
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      startDate: formData.get("startDate"),
      expectedEndDate: formData.get("expectedEndDate")
    };
    await createProject(parseInt(user.id), data);
    revalidatePath("/pm/dashboard");
    revalidatePath("/pm/projects");
    redirect("/pm/projects?alert=success&msg=Project%20created%20successfully");
  } catch (e) { if (isRedirectError(e)) throw e;
    console.error(e);
    redirect("/pm/projects?alert=error&msg=Failed%20to%20create%20project");
  }
}

export async function actionUpdateProject(projectId: number, formData: FormData) {
  try {
    const user = await requireRole("PM");
    const data = {
      status: formData.get("status"),
      name: formData.get("name"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      startDate: formData.get("startDate"),
      expectedEndDate: formData.get("expectedEndDate")
    };
    await updateProject(parseInt(user.id), projectId, data);
    revalidatePath("/pm/dashboard");
    revalidatePath(`/pm/projects/${projectId}`);
    redirect(`/pm/projects/${projectId}?alert=success&msg=Project%20updated%20successfully`);
  } catch (e) { if (isRedirectError(e)) throw e;
    console.error(e);
    redirect(`/pm/projects/${projectId}?alert=error&msg=Failed%20to%20update%20project`);
  }
}

export async function actionAssignMembers(projectId: number, formData: FormData) {
  try {
    const user = await requireRole("PM");
    const userIdsStr = formData.getAll("userIds") as string[];
    const userIds = userIdsStr.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (userIds.length > 0) {
      await assignProjectMembers(parseInt(user.id), projectId, userIds);
    }
    revalidatePath(`/pm/projects/${projectId}`);
    redirect(`/pm/projects/${projectId}?alert=success&msg=Members%20assigned%20successfully`);
  } catch (e) { if (isRedirectError(e)) throw e;
    console.error(e);
    redirect(`/pm/projects/${projectId}?alert=error&msg=Failed%20to%20assign%20members`);
  }
}

export async function actionRemoveMember(projectId: number, memberUserId: number) {
  try {
    const user = await requireRole("PM");
    await removeProjectMember(parseInt(user.id), projectId, memberUserId);
    revalidatePath(`/pm/projects/${projectId}`);
    redirect(`/pm/projects/${projectId}?alert=success&msg=Member%20removed%20successfully`);
  } catch (e) { if (isRedirectError(e)) throw e;
    console.error(e);
    redirect(`/pm/projects/${projectId}?alert=error&msg=Failed%20to%20remove%20member`);
  }
}
