import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "認証 | SWISH",
};

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-[#f0f0f1]">
            {children}
        </div>
    );
}


