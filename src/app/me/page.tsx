"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client_auth";

type TabKey = "profile" | "favs" | "address" | "settings";

export default function Page(): React.ReactElement {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  // tab state
  const [tab, setTab] = useState<TabKey>("profile");

  // password show/hide
  const [pwVisible, setPwVisible] = useState(false);

  // fill form with user info when logged in (fallback to your sample)
  const username = useMemo(() => user?.name ?? "ユーザー１", [user]);
  const email = useMemo(() => user?.email ?? "Jason@gmail.com", [user]);

  // ✅ 未登录 -> /auth/login
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <main className="max-w-[1100px] mx-auto my-20 text-center">
        <p>Loading...</p>
      </main>
    );
  }

  // ✅ 未登录但还没跳走：给个提示，避免白屏
  if (!isAuthenticated) {
    return (
      <main className="max-w-[1100px] mx-auto my-20 text-center">
        <p>ログイン画面へ移動しています…</p>
      </main>
    );
  }

  return (
    <>
      <main className="wrap">
        {/* 左侧导航 */}
        <nav className="sidenav" aria-label="アカウントメニュー">
          <button
            type="button"
            className={`nav-btn ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            個人情報
          </button>
          <button
            type="button"
            className={`nav-btn ${tab === "favs" ? "active" : ""}`}
            onClick={() => setTab("favs")}
          >
            お気に入り
          </button>
          <button
            type="button"
            className={`nav-btn ${tab === "address" ? "active" : ""}`}
            onClick={() => setTab("address")}
          >
            住所
          </button>
          <button
            type="button"
            className={`nav-btn ${tab === "settings" ? "active" : ""}`}
            onClick={() => setTab("settings")}
          >
            設定
          </button>
        </nav>

        {/* 個人情報 */}
        <section id="p-profile" className={`panel ${tab === "profile" ? "active" : ""}`}>
          <div className="section">
            <div>
              <label htmlFor="name">名前</label>
              <input id="name" className="input" placeholder="ユーザー１" defaultValue={username} />
            </div>

            <div>
              <label htmlFor="email">メールアドレス</label>
              <input id="email" className="input" placeholder="Jason@gmail.com" defaultValue={email} />
            </div>

            <div className="pw-wrap">
              <label htmlFor="pw">パスワード</label>
              <input
                id="pw"
                className="input"
                type={pwVisible ? "text" : "password"}
                defaultValue="*****"
                aria-describedby="pwHelp"
              />
              <button
                className="pw-toggle"
                type="button"
                aria-label="パスワード表示切替"
                onClick={() => setPwVisible((v) => !v)}
              >
                👁
              </button>
            </div>

            <div className="actions" style={{ display: "flex", justifyContent: "center" }}>
              <button className="btn" type="button">
                保存
              </button>
            </div>
          </div>
        </section>

        {/* お気に入り */}
        <section id="p-favs" className={`panel ${tab === "favs" ? "active" : ""}`}>
          <h2>お気に入り</h2>

          <div className="fav-list">
            {[1, 2, 3].map((i) => (
              <article className="card" key={i}>
                <div className="thumb">
                  {/* ✅ public/pic/card.png -> /pic/card.png */}
                  <img src="/pic/card.png" alt="カード画像" loading="lazy" />
                </div>

                <div className="meta">
                  <div className="title">2020 Lamelo Ball Sensational Auto #SS-LMB PSA 10 Rookie RC</div>
                  <div className="chip-row">
                    <span>◎ 1 点</span>
                    <span className="price">US $34.99</span>
                    <a className="sub" href="#">
                      お気に入りから削除
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 住所 */}
        <section id="p-address" className={`panel ${tab === "address" ? "active" : ""}`}>
          <div className="section" style={{ maxWidth: 640 }}>
            <div>
              <label htmlFor="country">国家</label>
              <select id="country" className="select" defaultValue="日本">
                <option>日本</option>
                <option>中国</option>
                <option>United States</option>
              </select>
            </div>

            <div>
              <label htmlFor="zip">郵便番号</label>
              <input id="zip" className="input" placeholder="1660002" defaultValue="1660002" />
            </div>

            <div className="row-2">
              <div>
                <label htmlFor="city">都市・区</label>
                <input id="city" className="input" placeholder="東京・杉並区" defaultValue="東京・杉並区" />
              </div>
              <div>
                <label htmlFor="block">番地</label>
                <input id="block" className="input" placeholder="4-32-9" defaultValue="4-32-9" />
              </div>
            </div>

            <div>
              <label htmlFor="addr">住所</label>
              <input id="addr" className="input" placeholder="ジュネス５ 303室" defaultValue="ジュネス５ 303室" />
            </div>

            <div className="actions" style={{ display: "flex", justifyContent: "center" }}>
              <button className="btn" type="button">
                保存
              </button>
            </div>
          </div>
        </section>

        {/* 設定 */}
        <section id="p-settings" className={`panel ${tab === "settings" ? "active" : ""}`}>
          <div className="section" style={{ maxWidth: 520 }}>
            <div>
              <label htmlFor="lang">言語</label>
              <select id="lang" className="select" defaultValue="日本語">
                <option>日本語</option>
                <option>English</option>
                <option>中文</option>
              </select>
            </div>

            <div style={{ marginTop: 24 }}>
              <h2>サインアウト</h2>

              {/* ✅ 你 HTML 里那张 avatar 我按你的 CSS 规则是要隐藏的，所以这里不放 */}
              <div className="actions">
                <button className="btn" type="button" onClick={logout}>
                  サインアウト
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 原样保留你的 CSS（用 styled-jsx 放在组件里） */}
      <style jsx>{`
        :root {
          --bg: #ffffff;
          --muted: #6b7280;
          --border: #e5e7eb;
          --chip: #efefef;
          --card: #ffffff;
          --primary: #111111;
          --radius: 14px;
          --radius-lg: 24px;
        }
        * {
          box-sizing: border-box;
        }
        .wrap {
          max-width: 1100px;
          margin: 32px auto;
          padding: 0 16px;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 40px;
          background: var(--bg);
          color: #111;
          font-family: "Noto Sans JP", ui-sans-serif, system-ui, -apple-system, Roboto, Arial;
        }

        .sidenav {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .nav-btn {
          width: 100%;
          text-align: left;
          padding: 12px 16px;
          border: 1px dashed #e6e6e6;
          border-radius: 9999px;
          background: #fff;
          color: #111;
          cursor: pointer;
          font-weight: 600;
          transition: 0.15s box-shadow, 0.15s transform, 0.15s background;
        }
        .nav-btn:hover {
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
        }
        .nav-btn.active {
          background: #111;
          color: #fff;
          border-color: #111;
        }

        .panel {
          display: none;
          animation: 0.18s ease fadein;
        }
        .panel.active {
          display: block;
        }
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

        h2 {
          margin: 0 0 18px;
          font-size: 22px;
        }
        .section {
          display: grid;
          gap: 14px;
          max-width: 520px;
        }
        .row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        label {
          font-weight: 700;
          font-size: 14px;
        }
        .input,
        .select {
          width: 100%;
          height: 44px;
          padding: 10px 12px;
          background: #ededed;
          border: 1.5px solid var(--border);
          border-radius: 12px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus,
        .select:focus {
          border-color: #9ca3af;
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.06);
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          padding: 0 22px;
          min-width: 200px;
          background: var(--primary);
          color: #fff;
          border: 0;
          border-radius: 9999px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.18);
          transition: 0.15s background, 0.15s box-shadow, 0.02s transform;
        }
        .btn:hover {
          background: #000;
          box-shadow: 0 14px 26px rgba(0, 0, 0, 0.22);
        }
        .btn:active {
          transform: translateY(1px);
        }
        .actions {
          margin-top: 20px;
        }

        .pw-wrap {
          position: relative;
        }
        .pw-toggle {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid var(--border);
          background: #fff;
          cursor: pointer;
          font-size: 12px;
        }

        .fav-list {
          display: grid;
          gap: 12px;
          max-width: 640px;
        }
        .card {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 16px;
          padding: 16px;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 20px;
        }
        .thumb {
          width: 96px;
          height: 96px;
          border-radius: 14px;
          background: #f3f3f3;
          overflow: hidden;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .meta {
          display: grid;
          gap: 6px;
        }
        .meta .title {
          font-weight: 700;
        }
        .meta .sub {
          color: var(--muted);
          font-size: 13px;
        }
        .meta .price {
          font-weight: 800;
        }
        .chip-row {
          display: flex;
          gap: 16px;
          align-items: center;
          color: var(--muted);
          font-size: 13px;
        }

        @media (max-width: 900px) {
          .wrap {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .row-2 {
            grid-template-columns: 1fr;
          }
        }

        #p-settings img,
        #p-settings [class*="avatar"],
        #p-settings [data-avatar],
        #p-settings [alt*="avatar" i] {
          display: none !important;
        }
        #p-settings .actions,
        #p-settings .actions::before,
        #p-settings .actions::after {
          background-image: none !important;
          content: none !important;
        }
        #p-settings .actions {
          display: flex;
          justify-content: center;
        }
        #p-settings .actions .btn {
          width: 560px;
          max-width: 95vw;
        }
      `}</style>
    </>
  );
}
