import { db } from "./index";
import { users, sessions } from "./schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "fitpips_session";

// Hash password using PBKDF2 (native Node.js)
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

// Verify password
export function verifyPassword(password, storedPassword) {
  const [salt, originalHash] = storedPassword.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

// Create a new session in DB and set cookie
export async function createSession(userId) {
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  });

  return sessionId;
}

// Get user from current session cookie
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  // Find session
  const sessionRows = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  const session = sessionRows[0];
  if (!session) return null;

  // Check expiration
  if (Date.now() > session.expiresAt) {
    // Delete expired session
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  // Find user
  const userRows = await db.select().from(users).where(eq(users.id, session.userId));
  const user = userRows[0];
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
  };
}

// Log out by destroying session
export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}
