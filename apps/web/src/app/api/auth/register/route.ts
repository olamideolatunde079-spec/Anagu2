import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string, now: number) {
  const expiredKeys: string[] = [];
  signupAttempts.forEach((value, key) => {
    if (value.resetAt <= now) expiredKeys.push(key);
  });
  expiredKeys.forEach((key) => signupAttempts.delete(key));
  while (signupAttempts.size >= 10_000) {
    const oldestKey = signupAttempts.keys().next().value;
    if (!oldestKey) break;
    signupAttempts.delete(oldestKey);
  }

  const attempt = signupAttempts.get(ip);
  if (!attempt || attempt.resetAt <= now) {
    signupAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  attempt.count += 1;
  return attempt.count > ATTEMPT_LIMIT;
}

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip, Date.now())) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    !("password" in body) ||
    !("fullName" in body) ||
    !("phone" in body) ||
    !("role" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    typeof body.fullName !== "string" ||
    typeof body.phone !== "string" ||
    (body.role !== "CITIZEN" && body.role !== "SURVEYOR")
  ) {
    return NextResponse.json(
      { error: "Complete all required account details." },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();
  const fullName = body.fullName.trim();
  const phone = body.phone.trim();
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    body.password.length < 8 ||
    fullName.length < 2 ||
    phone.length < 7
  ) {
    return NextResponse.json(
      { error: "Check the account details and password requirements." },
      { status: 400 },
    );
  }

  try {
    const admin = createServerClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: body.role,
      },
      app_metadata: { role: body.role },
    });

    if (error) {
      if (
        error.code === "email_exists" ||
        error.code === "user_already_exists" ||
        error.message.toLowerCase().includes("already")
      ) {
        return NextResponse.json(
          { error: "An account with this email already exists. Sign in instead." },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json(
      { user: { id: data.user.id, email: data.user.email } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Supabase account creation failed.", error);
    return NextResponse.json(
      { error: "Account creation is unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
