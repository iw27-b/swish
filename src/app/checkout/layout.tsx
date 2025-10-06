import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import Header from "@/components/header";
import Footer from "@/components/footer";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "SWISH - チェックアウト",
    description: "...",
};

export default function CardsLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
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