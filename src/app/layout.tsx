import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "SWISH - 伝説のダンクが、永遠にあなたのもの",
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
                <div className="w-full max-w-screen-lg xl:max-w-screen-xl mx-auto px-3 sm:px-4">
                    <Header />
                    <main>
                        {children}
                    </main>
                    <Footer />
                </div>
            </body>
        </html>
    );
}