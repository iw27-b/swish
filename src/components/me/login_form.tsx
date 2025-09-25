"use client";
/* eslint-disable @next/next/no-img-element */
import React, { FormEvent } from "react";

export interface LoginFormProps {
    onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export default function LoginForm({ onSubmit }: LoginFormProps): React.ReactElement {
    return (
        <form id="loginForm" onSubmit={onSubmit} className="flex flex-col gap-4 w-[320px] md:w-[320px] max-w-[420px]">
            <label className="block">
                <span className="block font-bold mb-1.5">ユーザー名前</span>
                <input
                    type="text"
                    id="username"
                    placeholder="ユーザー_1"
                    required
                    className="w-full px-[14px] py-3 border border-[#ccc] bg-[#f5f5f5] text-[14px] rounded-full outline-none focus:border-[#7b3cff] focus:ring-4 focus:ring-[rgba(123,60,255,0.15)]"
                />
            </label>

            <label className="block">
                <span className="block font-bold mb-1.5">メールアドレス</span>
                <input
                    type="email"
                    id="email"
                    placeholder="Jason@Gmail.Com"
                    required
                    className="w-full px-[14px] py-3 border border-[#ccc] bg-[#f5f5f5] text-[14px] rounded-full outline-none focus:border-[#7b3cff] focus:ring-4 focus:ring-[rgba(123,60,255,0.15)]"
                />
            </label>

            <label className="block">
                <span className="block font-bold mb-1.5">パスワード</span>
                <input
                    type="password"
                    id="password"
                    placeholder="Qwer1234"
                    required
                    className="w-full px-[14px] py-3 border border-[#ccc] bg-[#f5f5f5] text-[14px] rounded-full outline-none focus:border-[#7b3cff] focus:ring-4 focus:ring-[rgba(123,60,255,0.15)]"
                />
            </label>

            <button
                type="submit"
                className="w-full h-14 rounded-[28px] cursor-pointer bg-[url('/images/userformation/uf-3.png')] bg-no-repeat bg-center bg-contain overflow-hidden text-transparent"
            >
                ログイン
            </button>
        </form>
    );
}


