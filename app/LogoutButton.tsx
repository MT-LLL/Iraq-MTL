"use client";

const ACCESS_LOGOUT_URL = "https://mssd-mtl.cloudflareaccess.com/cdn-cgi/access/logout";

export function LogoutButton() {
  return (
    <a
      href={ACCESS_LOGOUT_URL}
      aria-label="退出登录并切换账号"
      title="退出登录并切换账号"
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 1000,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 14px",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        borderRadius: 999,
        background: "rgba(15, 23, 42, 0.92)",
        color: "#fff",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.22)",
        backdropFilter: "blur(10px)",
      }}
    >
      <span aria-hidden="true">↪</span>
      <span>退出登录</span>
    </a>
  );
}
