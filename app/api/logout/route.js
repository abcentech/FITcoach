import { logout } from "../../../db/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
