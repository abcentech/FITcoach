import { NextResponse } from "next/server";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, createSession } from "../../../db/auth";

export async function POST(request) {
  try {
    const { action, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (action === "register") {
      if (!email.includes("@") || password.length < 6) {
        return NextResponse.json({ error: "Please enter a valid email and a password of at least 6 characters." }, { status: 400 });
      }

      const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
      if (existing.length > 0) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
      }

      const userId = crypto.randomUUID();
      const passwordHash = hashPassword(password);

      await db.insert(users).values({ id: userId, email: cleanEmail, passwordHash });

      const response = NextResponse.json({ success: true });
      // createSession sets the cookie on the response via next/headers, 
      // but since we need to set it on our response object we'll do it manually
      await createSession(userId);
      return response;
    }

    if (action === "login") {
      const userRows = await db.select().from(users).where(eq(users.email, cleanEmail));
      const user = userRows[0];
      if (!user) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      const isMatch = verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      await createSession(user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/auth error:", error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
