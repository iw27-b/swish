"use client";
/* eslint-disable @next/next/no-img-element */
import React, { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client_auth";
import { Facebook, Apple } from "lucide-react";
import Image from "next/image";

export default function LoginPage(): React.ReactElement {
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const email = (form.querySelector("#email") as HTMLInputElement).value;
        const password = (form.querySelector("#password") as HTMLInputElement).value;

        const result = await login(email, password);
        if (result.success) {
            router.replace("/me");
        } else {
            alert(result.message || "ログインに失敗しました");
        }
    };

    return (
        <main className="min-h-screen bg-[#f0f0f1] text-[#111]">
            <Link href="/" className="fixed top-[18px] left-[28px] z-10 text-2xl font-black tracking-tight">SWISH</Link>
            <div className="min-h-screen flex items-center justify-center gap-4 px-4 pt-[60px] pb-10">
                {/* 左侧插画 */}
                <section className="flex items-center justify-center min-h-[320px] flex-[0_1_500px]">
                    <img
                        src="/images/auth/man.png"
                        alt="バスケットボールのイラスト"
                        className="w-full max-w-[460px] h-auto block"
                        style={{ WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 55%, #000 75%, transparent 100%)", maskImage: "radial-gradient(ellipse 70% 60% at 50% 55%, #000 75%, transparent 100%)" }}
                    />
                </section>

                {/* 右侧登录卡片 */}
                <section className="flex-[0_0_520px] bg-white rounded-[22px] p-8 border-0 shadow-none ml-[-6px]">
                    <div className="flex items-center justify-between text-[#6b7280] text-[14px] mb-2.5">
                        <span>ようこそ SWISH</span>
                        <span>
                            アカウントがありません？ <Link href="/auth/register" className="text-[#0a58ff] hover:underline">新規登録</Link>
                        </span>
                    </div>
                    <h1 className="m-0 mt-[6px] mb-[22px] text-[36px] leading-[1.1] font-black">ログイン</h1>

                    <form onSubmit={handleSubmit} className="grid gap-4">
                        {/* 第一栏：三个按钮（图标登录占位） */}
                        <div className="icon-row flex items-center gap-2 flex-nowrap">
                            <button type="button" className="img-btn flex-[0_0_auto] w-[220px] h-[44px] px-3 rounded-[14px] border border-[#e5e7eb] bg-white flex items-center justify-center hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/10">
                                <Image src="/images/auth/google.svg" alt="Google" width={16} height={16} className="mr-2" />
                                <span className="text-sm font-semibold text-[#111]">Googleでログイン</span>
                            </button>
                            <button type="button" className="img-btn flex-[0_0_auto] w-[44px] h-[44px] p-[6px] rounded-[12px] border border-[#e5e7eb] bg-white flex items-center justify-center hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/10" aria-label="Facebookでログイン">
                                <Image src="/images/auth/facebook.svg" alt="Facebook" width={16} height={16} />
                            </button>
                            <button type="button" className="img-btn flex-[0_0_auto] w-[44px] h-[44px] p-[6px] rounded-[12px] border border-[#e5e7eb] bg-white flex items-center justify-center hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/10" aria-label="Appleでログイン">
                                <Image src="/images/auth/apple.svg" alt="Apple" width={24} height={24} />
                            </button>
                        </div>

                        {/* 第二栏：邮箱 */}
                        <div className="grid gap-2">
                            <label htmlFor="email" className="font-bold text-[14px]">メールアドレスを入力してください</label>
                            <input id="email" name="email" type="email" required autoComplete="email" placeholder="メールアドレス" className="w-full px-[14px] py-3 bg-white border border-[#d1d5db] rounded-[12px] outline-none transition-[box-shadow,border-color] duration-150 focus:border-[#bbb] focus:shadow-[0_0_0_3px_rgba(17,17,17,.06)]" />
                        </div>

                        {/* 第三栏：密码 */}
                        <div className="grid gap-2">
                            <label htmlFor="password" className="font-bold text-[14px]">パスワードを入力してください</label>
                            <input id="password" name="password" type="password" required minLength={6} autoComplete="current-password" placeholder="パスワード" className="w-full px-[14px] py-3 bg-white border border-[#d1d5db] rounded-[12px] outline-none transition-[box-shadow,border-color] duration-150 focus:border-[#bbb] focus:shadow-[0_0_0_3px_rgba(17,17,17,.06)]" />
                        </div>

                        <div className="flex justify-end text-[12px]">
                            <Link href="#" className="text-[#0a58ff] no-underline hover:underline">パスワードを忘れます</Link>
                        </div>

                        <div className="flex justify-center mt-2">
                            <button type="submit" className="btn bg-[#111] text-white border-0 rounded-full px-[22px] py-[14px] w-[60%] max-w-[280px] font-bold tracking-[.2px] shadow-[0_12px_22px_rgba(0,0,0,.22)] hover:bg-black hover:shadow-[0_14px_26px_rgba(0,0,0,.28)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(17,17,17,.08),0_12px_22px_rgba(0,0,0,.22)]">ログイン</button>
                        </div>
                    </form>
                </section>
            </div>
        </main>
    );
}
