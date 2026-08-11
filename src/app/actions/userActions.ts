"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

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
