export default async function SignOutPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.return_to);
  const script = `
    document.cookie = "mssd_admin_link=; Max-Age=0; Path=/; SameSite=Lax; Secure";
    location.replace(${JSON.stringify(returnTo)});
  `;
  return <main className="account-screen">
    <section className="account-card pending-card">
      <span className="account-logo">MT</span>
      <small>DIRECT ACCESS SIGN OUT</small>
      <h1>正在退出直达权限</h1>
      <p>本浏览器的管理员直达 Cookie 已清理。</p>
      <a href={returnTo}>如果没有自动跳转，点这里返回</a>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </section>
  </main>;
}

function safeReturnTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
