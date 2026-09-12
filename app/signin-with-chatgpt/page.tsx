import { redirect } from "next/navigation";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  redirect(safeReturnTo(params.return_to));
}

function safeReturnTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
