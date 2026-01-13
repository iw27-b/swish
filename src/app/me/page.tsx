"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client_auth";

type TabKey = "profile" | "favs" | "address" | "settings";

export default function MePage(): React.ReactElement {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();

  // 当前选中的菜单
  const [tab, setTab] = useState<TabKey>("profile");

  // 密码显示/隐藏
  const [pwVisible, setPwVisible] = useState(false);

  // 默认显示的用户信息
  const username = useMemo(() => user?.name ?? "ユーザー１", [user]);
  const email = useMemo(() => user?.email ?? "Jason@gmail.com", [user]);

  // 未登录 → 强制去登录页
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  // 加载中
  if (loading) {
    return (
      <main className="max-w-[1080px] mx-auto my-10 px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </main>
    );
  }

  // 未登录但还没跳走（防白屏）
  if (!isAuthenticated) {
    return (
      <main className="max-w-[1080px] mx-auto my-10 px-4">
        <p style={{ textAlign: "center" }}>ログイン画面へ移動しています…</p>
      </main>
    );
  }

  return (
    <>
      <main className="wrap">
        {/* 左侧菜单 */}
        <nav className="sidenav">
          <button className={`nav-btn ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
            個人情報
          </button>
          <button className={`nav-btn ${tab === "favs" ? "active" : ""}`} onClick={() => setTab("favs")}>
            お気に入り
          </button>
          <button className={`nav-btn ${tab === "address" ? "active" : ""}`} onClick={() => setTab("address")}>
            住所
          </button>
          <button className={`nav-btn ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
            設定
          </button>
        </nav>

        {/* 個人情報 */}
        <section className={`panel ${tab === "profile" ? "active" : ""}`}>
          <div className="section">
            <div>
              <label>名前</label>
              <input className="input" defaultValue={username} />
            </div>

            <div>
              <label>メールアドレス</label>
              <input className="input" defaultValue={email} />
            </div>

            <div className="pw-wrap">
              <label>パスワード</label>
              <input className="input" type={pwVisible ? "text" : "password"} defaultValue="*****" />
              <button className="pw-toggle" onClick={() => setPwVisible(v => !v)}>👁</button>
            </div>

            <div className="actions">
              <button className="btn">保存</button>
            </div>
          </div>
        </section>

        {/* お気に入り */}
        <section className={`panel ${tab === "favs" ? "active" : ""}`}>
          <h2>お気に入り</h2>
          <div className="fav-list">
            {[1, 2, 3].map(i => (
              <article className="card" key={i}>
                <div className="thumb">
                  <img src="/pic/card.png" alt="card" />
                </div>
                <div className="meta">
                  <div className="title">2020 Lamelo Ball Sensational Auto</div>
                  <div className="chip-row">
                    <span>◎ 1 点</span>
                    <span className="price">US $34.99</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 住所 */}
        <section className={`panel ${tab === "address" ? "active" : ""}`}>
          <div className="section">
            <input className="input" defaultValue="日本" />
            <input className="input" defaultValue="1660002" />
            <input className="input" defaultValue="東京・杉並区" />
            <input className="input" defaultValue="4-32-9" />
            <input className="input" defaultValue="ジュネス５ 303室" />
            <div className="actions">
              <button className="btn">保存</button>
            </div>
          </div>
        </section>

        {/* 設定 */}
        <section className={`panel ${tab === "settings" ? "active" : ""}`} id="p-settings">
          <div className="section">
            <select className="select" defaultValue="日本語">
              <option>日本語</option>
              <option>English</option>
              <option>中文</option>
            </select>

            <div className="actions">
              <button className="btn" onClick={logout}>サインアウト</button>
            </div>
          </div>
        </section>
      </main>

      {/* 样式 */}
      <style jsx>{`
        .wrap{max-width:1100px;margin:32px auto;padding:0 16px;display:grid;grid-template-columns:220px 1fr;gap:40px}
        .sidenav{display:flex;flex-direction:column;gap:10px}
        .nav-btn{padding:12px 16px;border-radius:9999px;border:1px dashed #e6e6e6;background:#fff;font-weight:600;cursor:pointer}
        .nav-btn.active{background:#111;color:#fff}
        .panel{display:none}
        .panel.active{display:block}
        .section{display:grid;gap:14px;max-width:520px}
        .input,.select{height:44px;padding:10px;border-radius:12px;border:1px solid #ddd;background:#ededed}
        .btn{height:48px;border-radius:9999px;background:#111;color:#fff;font-weight:700}
        .fav-list{display:grid;gap:12px}
        .card{display:grid;grid-template-columns:96px 1fr;gap:16px;padding:16px;border:1px solid #e5e7eb;border-radius:20px}
        .thumb{width:96px;height:96px;overflow:hidden;border-radius:14px}
        .thumb img{width:100%;height:100%;object-fit:cover}
      `}</style>
    </>
  );
}
