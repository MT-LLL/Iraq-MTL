import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const imageUrl = host ? `${protocol}://${host}/og.png` : undefined;
  const description = "面向伊拉克代表处伙伴营销作战的线索、物料、活动与销售协同平台";

  return {
    title: "伊拉克代表处面向伙伴MTL营销作战平台 | Iraq Partner MTL Marketing War-room",
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "伊拉克代表处面向伙伴MTL营销作战平台 | Iraq Partner MTL Marketing War-room",
      description,
      type: "website",
      images: imageUrl ? [{ url: imageUrl, width: 1731, height: 909, alt: "伊拉克代表处面向伙伴MTL营销作战平台" }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "伊拉克代表处面向伙伴MTL营销作战平台 | Iraq Partner MTL Marketing War-room",
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
