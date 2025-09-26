"use client";
/* eslint-disable @next/next/no-img-element */
import React from "react";

export interface AccountInfoProps {
    username?: string | null;
    email?: string | null;
    passwordMasked?: string | null;
    onLogout?: () => void | Promise<void>;
}

export default function AccountInfo({ username, email, passwordMasked, onLogout }: AccountInfoProps): React.ReactElement {
    return (
        <div className="w-full max-w-[1000px] ml-16 font-sans leading-[1.6]">
            <h1 className="text-[20px] mb-6 text-center">アカウント情報</h1>

            <div className="space-y-6 mb-8">
                <div className="grid gap-2">
                    <label htmlFor="username" className="font-bold text-[14px] text-[#333]">ユーザー名前</label>
                    <input 
                        id="username" 
                        type="text" 
                        value={username ?? ""} 
                        disabled 
                        className="w-full px-6 py-4 bg-gray-100 border border-[#d1d5db] rounded-[12px] outline-none text-[#666] cursor-not-allowed text-[16px]"
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="email" className="font-bold text-[14px] text-[#333]">メールアドレス</label>
                    <input 
                        id="email" 
                        type="email" 
                        value={email ?? ""} 
                        disabled 
                        className="w-full px-6 py-4 bg-gray-100 border border-[#d1d5db] rounded-[12px] outline-none text-[#666] cursor-not-allowed text-[16px]"
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="password" className="font-bold text-[14px] text-[#333]">パスワード</label>
                    <input 
                        id="password" 
                        type="password" 
                        value={passwordMasked ?? ""} 
                        disabled 
                        className="w-full px-6 py-4 bg-gray-100 border border-[#d1d5db] rounded-[12px] outline-none text-[#666] cursor-not-allowed text-[16px]"
                    />
                </div>
            </div>

            <button
                className="w-full px-6 py-3 bg-black text-white text-[16px] rounded-full cursor-pointer transition-all hover:bg-gray-800 shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                onClick={() => onLogout?.()}
            >
                ログアウト
            </button>
        </div>
    );
}


