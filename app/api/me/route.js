import { getCurrentUser } from "../../../db/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/me error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
