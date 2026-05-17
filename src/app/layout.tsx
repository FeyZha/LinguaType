import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaType",
  description: "面向中文母语者的英文写作辅助工具。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
