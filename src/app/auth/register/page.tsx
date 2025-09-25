"use client";
/* eslint-disable @next/next/no-img-element */
import React, { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Facebook, Apple } from "lucide-react";

export default function RegisterPage(): React.ReactElement {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; name?: string; password?: string; global?: string }>({});

    const isPwInvalid = useMemo(() => !!errors.password, [errors.password]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const form = e.currentTarget;
            const name = (form.querySelector("#name") as HTMLInputElement).value;
            const email = (form.querySelector("#email") as HTMLInputElement).value;
            const password = (form.querySelector("#password") as HTMLInputElement).value;

            // Basic client-side validation (let server handle detailed rules)
            const newErrors: { email?: string; name?: string; password?: string } = {};
            if (!name.trim()) newErrors.name = "名前は必須です";
            if (!email.trim()) newErrors.email = "メールアドレスは必須です";
            if (!password.trim()) newErrors.password = "パスワードは必須です";
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                return;
            }

            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json().catch(() => ({} as any));
            if (res.ok && data?.success !== false) {
                // Auto-login after successful registration
                const loginRes = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });
                if (loginRes.ok) {
                    router.replace('/me');
                    return;
                }
                router.replace('/auth/login');
                return;
            }
            // Map server validation errors to fields
            const fieldErrors = (data?.errors ?? data?.data) as Record<string, string[] | string> | undefined;
            if (fieldErrors && typeof fieldErrors === 'object') {
                const mapped: { email?: string; name?: string; password?: string; global?: string } = {};
                if (fieldErrors.email) mapped.email = Array.isArray(fieldErrors.email) ? fieldErrors.email.join('\n') : String(fieldErrors.email);
                if (fieldErrors.name) mapped.name = Array.isArray(fieldErrors.name) ? fieldErrors.name.join('\n') : String(fieldErrors.name);
                if (fieldErrors.password) mapped.password = Array.isArray(fieldErrors.password) ? fieldErrors.password.join('\n') : String(fieldErrors.password);
                if (!mapped.email && !mapped.name && !mapped.password) mapped.global = data?.message || "登録に失敗しました";
                setErrors(mapped);
            } else {
                setErrors({ global: data?.message || "登録に失敗しました" });
            }
        } catch (err) {
            setErrors({ global: "エラーが発生しました" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#f0f0f1] text-[#111]">
            <Link href="/" className="fixed top-[18px] left-[28px] z-10 text-2xl font-black tracking-tight">Swish</Link>
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

                {/* 右侧卡片 */}
                <section className="flex-[0_0_520px] bg-white rounded-[22px] p-8 border-0 shadow-none ml-[-6px]">
                    <div className="flex items-center justify-between text-[#6b7280] text-[14px] mb-2.5">
                        <span>ようこそ SWICH</span>
                        <span>
                            アカウントがあります？ <Link href="/auth/login" className="text-[#0a58ff] hover:underline">ログイン</Link>
                        </span>
                    </div>
                    <h1 className="m-0 mt-[6px] mb-[22px] text-[36px] leading-[1.1] font-black">新規登録</h1>

                    <form onSubmit={handleSubmit} className="grid gap-4">
                        {errors.global ? (
                            <div className="text-[#e11d48] text-[12px] -mt-1">{errors.global}</div>
                        ) : null}
                        <div className="icon-row flex items-center gap-2 flex-nowrap">
                            <button type="button" className="img-btn flex-[0_0_auto] w-[220px] h-[44px] px-3 rounded-[14px] border border-[#e5e7eb] bg-white flex items-center justify-center hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/10">
                                <span className="text-sm font-semibold text-[#111]">Googleで登録</span>
                            </button>
                            <button type="button" className="img-btn flex-[0_0_auto] w-[44px] h-[44px] p-[6px] rounded-[12px] border border-[#e5e7eb] bg-white flex items-center justify-center hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/10" aria-label="Facebookで登録">
                                <Facebook className="w-5 h-5 text-[#1877F2]" />
                            </button>
                            <button type="button" className="img-btn flex-[0_0_auto] w-[44px] h-[44px] p-[6px] rounded-[12px] border border-[#e5e7eb] bg-white flex items-center justify-center hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black/10" aria-label="Appleで登録">
                                <Apple className="w-5 h-5 text-black" />
                            </button>
                        </div>

                        <div className="grid gap-2">
                            {errors.email ? (<div className="text-[#e11d48] text-[12px] -mb-1">{errors.email}</div>) : null}
                            <label htmlFor="email" className="font-bold text-[14px]">メールアドレスを入力してください</label>
                            <input id="email" name="email" type="email" placeholder="メールアドレス" className={`w-full px-[14px] py-3 bg-white border rounded-[12px] outline-none transition-[box-shadow,border-color] duration-150 focus:border-[#bbb] focus:shadow-[0_0_0_3px_rgba(17,17,17,.06)] ${errors.email ? "border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,.15)]" : "border-[#d1d5db]"}`} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                {errors.name ? (<div className="text-[#e11d48] text-[12px] -mb-1">{errors.name}</div>) : null}
                                <label htmlFor="name" className="font-bold text-[14px]">あなたの名前</label>
                                <input id="name" name="name" type="text" placeholder="名前" className={`w-full px-[14px] py-3 bg-white border rounded-[12px] outline-none transition-[box-shadow,border-color] duration-150 focus:border-[#bbb] focus:shadow-[0_0_0_3px_rgba(17,17,17,.06)] ${errors.name ? "border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,.15)]" : "border-[#d1d5db]"}`} />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="contact" className="font-bold text-[14px]">連絡方法</label>
                                <input id="contact" name="contact" type="text" placeholder="連絡方法（電話/LINE/メールなど）" className="w-full px-[14px] py-3 bg-white border border-[#d1d5db] rounded-[12px] outline-none transition-[box-shadow,border-color] duration-150 focus:border-[#bbb] focus:shadow-[0_0_0_3px_rgba(17,17,17,.06)]" />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            {errors.password ? (<div className="text-[#e11d48] text-[12px] -mb-1">{errors.password}</div>) : null}
                            <label htmlFor="password" className="font-bold text-[14px]">パスワードを入力してください</label>
                            <input id="password" name="password" type="password" placeholder="パスワード" className={`w-full px-[14px] py-3 bg-white border rounded-[12px] outline-none transition-[box-shadow,border-color] duration-150 focus:border-[#bbb] focus:shadow-[0_0_0_3px_rgba(17,17,17,.06)] ${isPwInvalid ? "border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,.15)]" : "border-[#d1d5db]"}`} />
                        </div>

                        <div className="flex justify-end text-[12px]">
                            <Link href="#" className="text-[#0a58ff] no-underline hover:underline">パスワードを忘れます</Link>
                        </div>

                        <div className="flex justify-center mt-2">
                            <button type="submit" disabled={loading} className="btn bg-[#111] text-white border-0 rounded-full px-[22px] py-[14px] w-[60%] max-w-[280px] font-bold tracking-[.2px] shadow-[0_12px_22px_rgba(0,0,0,.22)] hover:bg-black hover:shadow-[0_14px_26px_rgba(0,0,0,.28)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(17,17,17,.08),0_12px_22px_rgba(0,0,0,.22)]">
                                {loading ? "登録中..." : "登録"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </main>
    );
}
