"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client_auth";

type TabKey = "profile" | "favs" | "address" | "settings";

export default function Page(): React.ReactElement {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  const [tab, setTab] = useState<TabKey>("profile");
  const [pwVisible, setPwVisible] = useState(false);

  const username = useMemo(() => (user as any)?.name ?? "ユーザー１", [user]);
  const email = useMemo(() => (user as any)?.email ?? "Jason@gmail.com", [user]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      router.replace("/auth/login");
    }
  };

  if (loading) {
    return (
      <main className="max-w-[1100px] mx-auto my-20 text-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="max-w-[1100px] mx-auto my-20 text-center">
        <p>ログイン画面へ移動しています…</p>
      </main>
    );
  }

  const NavBtn = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(k)}
      className={[
        "w-full text-left px-4 py-3 rounded-full font-semibold border border-dashed transition",
        tab === k
          ? "bg-black text-white border-black"
          : "bg-white text-black border-neutral-200 hover:shadow-md",
      ].join(" ")}
    >
      {label}
    </button>
  );

  const Panel = ({ k, children }: { k: TabKey; children: React.ReactNode }) => (
    <section className={tab === k ? "block animate-[fadein_.18s_ease]" : "hidden"}>
      {children}
    </section>
  );

  return (
    <main className="max-w-[1100px] mx-auto my-8 px-4">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <nav className="flex flex-col gap-2" aria-label="アカウントメニュー">
          <NavBtn k="profile" label="個人情報" />
          <NavBtn k="favs" label="お気に入り" />
          <NavBtn k="address" label="住所" />
          <NavBtn k="settings" label="設定" />
        </nav>

        <div>
          <Panel k="profile">
            <div className="grid gap-4 max-w-[520px]">
              <div className="grid gap-2">
                <label htmlFor="name" className="font-bold text-sm">
                  名前
                </label>
                <input
                  id="name"
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                  defaultValue={username}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="email" className="font-bold text-sm">
                  メールアドレス
                </label>
                <input
                  id="email"
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                  defaultValue={email}
                />
              </div>

              <div className="grid gap-2 relative">
                <label htmlFor="pw" className="font-bold text-sm">
                  パスワード
                </label>
                <input
                  id="pw"
                  className="w-full h-11 px-3 pr-12 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                  type={pwVisible ? "text" : "password"}
                  defaultValue="*****"
                />
                <button
                  type="button"
                  aria-label="パスワード表示切替"
                  onClick={() => setPwVisible((v) => !v)}
                  className="absolute right-2 top-[42px] w-7 h-7 rounded-full bg-white border border-neutral-200 grid place-items-center text-xs"
                >
                  👁
                </button>
              </div>

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  className="h-12 min-w-[200px] px-6 rounded-full bg-black text-white font-bold shadow-lg hover:shadow-xl active:translate-y-[1px]"
                >
                  保存
                </button>
              </div>
            </div>
          </Panel>

          <Panel k="favs">
            <h2 className="text-[22px] font-bold mb-4">お気に入り</h2>
            <div className="grid gap-3 max-w-[640px]">
              {[1, 2, 3].map((i) => (
                <article
                  key={i}
                  className="grid grid-cols-[96px_1fr] gap-4 p-4 bg-white border border-neutral-200 rounded-2xl"
                >
                  <div className="w-24 h-24 rounded-[14px] bg-neutral-100 overflow-hidden shadow-md">
                    <img
                      src="/pic/card.png"
                      alt="カード画像"
                      className="w-full h-full object-cover block"
                      loading="lazy"
                    />
                  </div>
                  <div className="grid gap-1">
                    <div className="font-bold">
                      2020 Lamelo Ball Sensational Auto #SS-LMB PSA 10 Rookie RC
                    </div>
                    <div className="flex gap-4 items-center text-sm text-neutral-500">
                      <span>◎ 1 点</span>
                      <span className="font-extrabold text-black">US $34.99</span>
                      <a className="underline" href="#">
                        お気に入りから削除
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel k="address">
            <div className="grid gap-4 max-w-[640px]">
              <div className="grid gap-2">
                <label htmlFor="country" className="font-bold text-sm">
                  国家
                </label>
                <select
                  id="country"
                  defaultValue="日本"
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                >
                  <option>日本</option>
                  <option>中国</option>
                  <option>United States</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="zip" className="font-bold text-sm">
                  郵便番号
                </label>
                <input
                  id="zip"
                  defaultValue="1660002"
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <label htmlFor="city" className="font-bold text-sm">
                    都市・区
                  </label>
                  <input
                    id="city"
                    defaultValue="東京・杉並区"
                    className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="block" className="font-bold text-sm">
                    番地
                  </label>
                  <input
                    id="block"
                    defaultValue="4-32-9"
                    className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="addr" className="font-bold text-sm">
                  住所
                </label>
                <input
                  id="addr"
                  defaultValue="ジュネス５ 303室"
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                />
              </div>

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  className="h-12 min-w-[200px] px-6 rounded-full bg-black text-white font-bold shadow-lg hover:shadow-xl active:translate-y-[1px]"
                >
                  保存
                </button>
              </div>
            </div>
          </Panel>

          <Panel k="settings">
            <div className="grid gap-4 max-w-[520px]">
              <div className="grid gap-2">
                <label htmlFor="lang" className="font-bold text-sm">
                  言語
                </label>
                <select
                  id="lang"
                  defaultValue="日本語"
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 bg-neutral-200/80 focus:outline-none focus:ring-4 focus:ring-black/10"
                >
                  <option>日本語</option>
                  <option>English</option>
                  <option>中文</option>
                </select>
              </div>

              <div className="mt-6">
                <h2 className="text-[22px] font-bold mb-4">サインアウト</h2>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="h-12 w-[560px] max-w-[95vw] px-6 rounded-full bg-black text-white font-bold shadow-lg hover:shadow-xl active:translate-y-[1px]"
                  >
                    サインアウト
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadein {
          from {
            opacity: 0.4;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
