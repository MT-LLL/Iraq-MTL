import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { createAdminLinkCookie } from "../admin-link";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supplied = url.searchParams.get("token")?.trim() ?? "";
  const expected = ((env as unknown as Record<string, string | undefined>).MSSD_ADMIN_LINK_TOKEN ?? "").trim();
  const email = (request.headers.get("oai-authenticated-user-email") ?? request.headers.get("cf-access-authenticated-user-email") ?? "").trim().toLowerCase();

  if (!expected || supplied.length < 32 || supplied !== expected) {
    return new Response("Invalid administrator activation link.", { status: 403 });
  }
  if (!email) {
    return new Response("Email identity authentication is required before administrator activation.", { status: 401 });
  }

  const response = NextResponse.redirect(new URL(safeReturnTo(url.searchParams.get("return_to")), url));
  response.cookies.set("mssd_admin_link", await createAdminLinkCookie(email, expected), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 315360000,
  });
  return response;
}
