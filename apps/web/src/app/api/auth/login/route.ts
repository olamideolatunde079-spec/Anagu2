import { NextResponse } from "next/server";
import {
  createServerAuthClient,
  createServerClient,
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUnconfirmedEmailError(error: { code?: string; message?: string }) {
  return error.code === "email_not_confirmed" ||
    error.message?.toLowerCase().includes("email not confirmed") === true;
}

async function findUserByEmail(email: string) {
  const admin = createServerClient();
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );
    if (user) return user;
    if (data.users.length < perPage) break;
  }

  return null;
}

export async function POST(request: Request) {
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
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const auth = createServerAuthClient();
    let { data, error } = await auth.auth.signInWithPassword({ email, password });

    if (error && isUnconfirmedEmailError(error)) {
      const user = await findUserByEmail(email);
      if (!user) {
        return NextResponse.json(
          { error: "Incorrect email or password." },
          { status: 401 },
        );
      }

      const admin = createServerClient();
      const { error: confirmError } = await admin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true },
      );
      if (confirmError) throw confirmError;

      ({ data, error } = await auth.auth.signInWithPassword({ email, password }));
    }

    if (error || !data.session) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (error) {
    console.error("Supabase sign-in failed.", error);
    return NextResponse.json(
      { error: "Sign-in service is unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
