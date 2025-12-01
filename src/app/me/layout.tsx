import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { getAuthenticatedUser } from "@/lib/auth_server";
import { redirect } from "next/navigation";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "SWISH - マイアカウント",
    description: "NBA殿堂入り選手から今季MVPまで、世界限定カードが今だけ特価。最新の取引プラットフォームでバスケットボールカードコレクションを楽しもう。",
};

export const dynamic = 'force-dynamic';

export default async function MeLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const auth = await getAuthenticatedUser();
    if (!auth.success || !auth.user) {
        redirect('/auth/login');
    }
    return (
        <div className={`${inter.variable} antialiased font-sans`}>
            <div className="w-full max-w-screen-lg xl:max-w-screen-xl mx-auto px-3 sm:px-4">
                <Header />
                <main>{children}</main>
                <Footer />
            </div>
        </div>
    );
}