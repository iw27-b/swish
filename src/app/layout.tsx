import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SWICH - 伝説のダンクが、永遠にあなたのもの",
  description: "NBA殿堂入り選手から今季MVPまで、世界限定カードが今だけ特価。最新の取引プラットフォームでバスケットボールカードコレクションを楽しもう。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}