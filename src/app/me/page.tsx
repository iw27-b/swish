"use client";
/* eslint-disable @next/next/no-img-element */
import React, { FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client_auth";
import AccountInfo from "@/components/me/account_info";

export default function Page(): React.ReactElement {
    const router = useRouter();
    const { user, isAuthenticated, loading, logout } = useAuth();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace("/auth/login");
        }
    }, [loading, isAuthenticated, router]);

    const handleSubmit = async (_e: FormEvent<HTMLFormElement>) => {};

    if (loading) {
        return (
            <main className="max-w-[1080px] mx-auto my-10 px-4">
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            </main>
        );
    }

    if (!isAuthenticated) {
        return <main />;
    }

    return (
        <main className="max-w-[1080px] mx-auto my-10 px-4">
            <section className="flex justify-center items-center gap-[30px] md:flex-row flex-col">
                <div className="flex flex-col items-start gap-[10px] md:items-start">
                    <img src="/images/userformation/0.png" alt="左側画像1" className="block border-0 bg-transparent w-[280px] h-auto" />
                    <img src="/images/userformation/1.png" alt="左側画像2" className="block border-0 bg-transparent w-[200px] h-auto" />
                </div>
                <div className="flex justify-start">
                    <AccountInfo username={user?.name} email={user?.email} passwordMasked={user ? "••••••••" : ""} onLogout={logout} />
                </div>
            </section>
        </main>
    );
}