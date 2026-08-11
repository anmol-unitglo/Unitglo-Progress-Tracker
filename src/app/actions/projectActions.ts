"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import {
  createProject,
  updateProject,
  assignProjectMembers,
  removeProjectMember
} from "@/services/projectService";

async function requireRole(allowedRole: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== allowedRole) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function actionCreateProject(formData: FormData) {
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
}

export async function actionUpdateProject(projectId: number, formData: FormData) {
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
}

export async function actionAssignMembers(projectId: number, formData: FormData) {
  const user = await requireRole("PM");
  
  // Example expects comma separated IDs or multiple form fields
  const userIdsStr = formData.getAll("userIds") as string[];
  const userIds = userIdsStr.map(id => parseInt(id)).filter(id => !isNaN(id));

  if (userIds.length > 0) {
    await assignProjectMembers(parseInt(user.id), projectId, userIds);
  }
  
  revalidatePath(`/pm/projects/${projectId}`);
}

export async function actionRemoveMember(projectId: number, memberUserId: number) {
  const user = await requireRole("PM");
  await removeProjectMember(parseInt(user.id), projectId, memberUserId);
  revalidatePath(`/pm/projects/${projectId}`);
}
