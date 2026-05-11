import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaType",
  description: "面向中文母语英语学习者的最新句子润色助手。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
