const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

async function signature(emailPart: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(`mssd-admin-link:v1:${emailPart}`));
  return base64Url(new Uint8Array(bytes));
}

export async function createAdminLinkCookie(email: string, secret: string) {
  const emailPart = base64Url(encoder.encode(normalizedEmail(email)));
  return `v1.${emailPart}.${await signature(emailPart, secret)}`;
}

export async function verifyAdminLinkCookie(value: string, email: string, secret: string) {
  if (!value || !email || !secret) return false;
  const expected = await createAdminLinkCookie(email, secret);
  if (value.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < value.length; index += 1) difference |= value.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}
