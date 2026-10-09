"use client";

type LogoutLanguage = "zh" | "en";
const ACCESS_LOGOUT_URL = "https://mssd-mtl.cloudflareaccess.com/cdn-cgi/access/logout";

export function LogoutButton({ lang = "zh" }: { lang?: LogoutLanguage }) {
  const label = lang === "zh" ? "退出登录" : "Sign out";
  const accessibleLabel = lang === "zh" ? "退出登录并切换账号" : "Sign out and switch account";

  return (
    <a
      className="sidebar-logout"
      href={ACCESS_LOGOUT_URL}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <span aria-hidden="true">↪</span>
      <span>{label}</span>
    </a>
  );
}
