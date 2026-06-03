"use server";

import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import * as auth from "../db/auth";

export async function registerUser(email, password) {
  try {
    if (!email || !email.includes("@") || !password || password.length < 6) {
      return { error: "Please enter a valid email and a password of at least 6 characters." };
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) {
      return { error: "An account with this email already exists." };
    }

    const userId = crypto.randomUUID();
    const passwordHash = auth.hashPassword(password);

    await db.insert(users).values({
      id: userId,
      email: cleanEmail,
      passwordHash,
    });

    await auth.createSession(userId);
    return { success: true };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "An error occurred during sign up. Please try again." };
  }
}

export async function loginUser(email, password) {
  try {
    if (!email || !password) {
      return { error: "Please enter email and password." };
    }

    const cleanEmail = email.toLowerCase().trim();

    const userRows = await db.select().from(users).where(eq(users.email, cleanEmail));
    const user = userRows[0];
    if (!user) {
      return { error: "Invalid email or password." };
    }

    const isMatch = auth.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return { error: "Invalid email or password." };
    }

    await auth.createSession(user.id);
    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { error: "An error occurred during log in. Please try again." };
  }
}

export async function logoutUser() {
  await auth.logout();
  return { success: true };
}

export async function getUser() {
  return await auth.getCurrentUser();
}

