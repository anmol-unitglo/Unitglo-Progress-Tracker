"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
const prisma = new PrismaClient();

export async function actionChangePassword(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id) {
    return { error: "Unauthorized. Please log in again." };
  }

  const userId = parseInt(session.user.id);
  
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters long." };
  }

  if (currentPassword === newPassword) {
    return { error: "New password cannot be the same as the current password." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { error: "User not found." };
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return { error: "Incorrect current password." };
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: newPasswordHash },
      });

      await tx.activityLog.create({
        data: {
          userId,
          action: "PASSWORD_CHANGED",
          entityType: "USER",
          entityId: userId,
          metadata: JSON.stringify({ message: "User securely updated their password" })
        }
      });
    });

    return { success: true, message: "Password updated successfully." };

  } catch (error) {
    console.error("Password change error:", error);
    return { error: "An unexpected error occurred while changing password." };
  }
}

export async function actionCreateUser(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id || session.user.role !== "CEO") {
    return { error: "Forbidden. Only CEO can create users." };
  }

  const ceoId = parseInt(session.user.id);
  
  const name = formData.get("name") as string;
  const rawEmail = formData.get("email") as string;
  const role = formData.get("role") as any;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !rawEmail || !role || !password || !confirmPassword) {
    return { error: "All fields are required." };
  }

  const email = rawEmail.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Invalid email format." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (!["PM", "DEVELOPER", "TESTER"].includes(role)) {
    return { error: "Invalid role selected." };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "Email already in use." };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          role,
          password: passwordHash,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: ceoId,
          action: "USER_CREATED",
          entityType: "USER",
          entityId: newUser.id,
          metadata: JSON.stringify({ 
            createdUserId: newUser.id,
            createdUserEmail: newUser.email,
            createdUserRole: newUser.role,
            creatorId: ceoId
          })
        }
      });
    });

    return { success: true, message: "User created successfully." };

  } catch (error) {
    console.error("User creation error:", error);
    return { error: "An unexpected error occurred while creating user." };
  }
}

export async function actionUpdateUser(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id || session.user.role !== "CEO") {
    return { error: "Forbidden. Only CEO can edit users." };
  }

  const ceoId = parseInt(session.user.id);
  const targetUserId = parseInt(formData.get("userId") as string);
  const name = formData.get("name") as string;
  const rawEmail = formData.get("email") as string;
  const role = formData.get("role") as any;

  if (!targetUserId || !name || !rawEmail || !role) {
    return { error: "All fields are required." };
  }

  if (role === "CEO") {
    return { error: "Cannot create or promote to CEO through this interface." };
  }
  if (!["PM", "DEVELOPER", "TESTER"].includes(role)) {
    return { error: "Invalid role selected." };
  }

  const email = rawEmail.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Invalid email format." };
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return { error: "User not found." };
    if (targetUser.role === "CEO" && role !== "CEO") {
       return { error: "Cannot demote a CEO account." };
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email, id: { not: targetUserId } },
    });
    if (existingEmail) return { error: "Email already in use." };

    if (targetUser.role !== role) {
      const activeStatuses: any[] = ["NOT_STARTED", "IN_PROGRESS", "READY_FOR_TESTING", "TESTING", "REWORK_REQUIRED", "BLOCKED"];
      
      if (targetUser.role === "DEVELOPER") {
        const activeDevTasks = await prisma.task.count({
          where: { developerId: targetUserId, status: { in: activeStatuses } }
        });
        if (activeDevTasks > 0) {
          return { error: `Cannot change role. User is assigned as Developer on ${activeDevTasks} active task(s).` };
        }
      }

      if (targetUser.role === "TESTER") {
        const activeTesterTasks = await prisma.task.count({
          where: { testerId: targetUserId, status: { in: activeStatuses } }
        });
        if (activeTesterTasks > 0) {
          return { error: `Cannot change role. User is assigned as Tester on ${activeTesterTasks} active task(s).` };
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { name, email, role },
      });
      await tx.activityLog.create({
        data: {
          userId: ceoId,
          action: "USER_EDITED",
          entityType: "USER",
          entityId: targetUserId,
          metadata: JSON.stringify({ name, email, role, editorId: ceoId })
        }
      });
    });

    return { success: true, message: "User updated successfully." };
  } catch (error) {
    console.error("User update error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function actionResetPassword(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id || session.user.role !== "CEO") {
    return { error: "Forbidden. Only CEO can reset passwords." };
  }

  const ceoId = parseInt(session.user.id);
  const targetUserId = parseInt(formData.get("userId") as string);

  if (!targetUserId) return { error: "User ID is required." };

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return { error: "User not found." };

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { password: passwordHash },
      });
      await tx.activityLog.create({
        data: {
          userId: ceoId,
          action: "PASSWORD_ADMINISTRATIVE_RESET",
          entityType: "USER",
          entityId: targetUserId,
          metadata: JSON.stringify({ reason: "Administrative Reset", actorId: ceoId })
        }
      });
    });

    return { success: true, tempPassword, message: "Password reset successfully. Securely share this temporary password." };
  } catch (error) {
    console.error("Password reset error:", error);
    return { error: "An unexpected error occurred." };
  }
}

export async function actionToggleUserStatus(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id || session.user.role !== "CEO") {
    return { error: "Forbidden. Only CEO can manage user status." };
  }

  const ceoId = parseInt(session.user.id);
  const targetUserId = parseInt(formData.get("userId") as string);
  const targetStatus = formData.get("isActive") === "true";

  if (!targetUserId) return { error: "User ID is required." };
  
  if (ceoId === targetUserId && !targetStatus) {
    return { error: "Cannot deactivate your own account." };
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return { error: "User not found." };

    if (targetUser.role === "CEO" && !targetStatus) {
      const activeCeos = await prisma.user.count({ where: { role: "CEO", isActive: true } });
      if (activeCeos <= 1) {
        return { error: "Cannot deactivate the last active CEO account." };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { isActive: targetStatus },
      });
      await tx.activityLog.create({
        data: {
          userId: ceoId,
          action: targetStatus ? "USER_REACTIVATED" : "USER_DEACTIVATED",
          entityType: "USER",
          entityId: targetUserId,
          metadata: JSON.stringify({ actorId: ceoId })
        }
      });
    });

    return { success: true, message: `User ${targetStatus ? 'activated' : 'deactivated'} successfully.` };
  } catch (error) {
    console.error("Toggle user status error:", error);
    return { error: "An unexpected error occurred." };
  }
}
