"use client";

import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);

    // ✅ next：登录后要回去的页面（恢复原来的默认主页体验）
    const next = qs.get("next") || "/";

    // ✅ 注册后提示
    const email = qs.get("email");
    const registered = qs.get("registered");

    const infoEl = document.getElementById("info") as HTMLElement | null;

    const showError = (msg: string) => {
      if (!infoEl) return;
      infoEl.textContent = msg;
      infoEl.style.display = "block";
      infoEl.style.color = "#b91c1c";
      infoEl.style.background = "#fef2f2";
      infoEl.style.border = "1px solid #fecaca";
    };

    const showInfo = (msg: string) => {
      if (!infoEl) return;
      infoEl.textContent = msg;
      infoEl.style.display = "block";
      infoEl.style.color = "#065f46";
      infoEl.style.background = "#ecfdf5";
      infoEl.style.border = "1px solid #a7f3d0";
    };

    // ✅ 如果“旧逻辑”认为已登录：直接回 next（保持你原来的体验）
    const isLoggedIn = localStorage.getItem("swish_logged_in") === "1";
    if (isLoggedIn) {
      window.location.href = next;
      return;
    }

    // 预填邮箱
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    if (email && emailInput) emailInput.value = email;

    // 显示注册成功提示
    if (registered === "1") {
      showInfo("登録が完了しました。ログインしてください。");
    }

    // 绑定登录表单
    const form = document.querySelector<HTMLFormElement>(".card form");
    if (!form) return;

    const pwInput = document.getElementById("password") as HTMLInputElement | null;
    if (!emailInput || !pwInput) return;

    // provider buttons：保留“原来体验”（点了就当成功），同时也尝试真登录（但你没接 OAuth，所以这里走旧逻辑）
    const providerBtns = document.querySelectorAll<HTMLButtonElement>(".img-btn[data-provider]");
    const onProviderClick = (e: Event) => {
      e.preventDefault();

      // 旧逻辑：点一下也视为“登录成功”
      localStorage.setItem("swish_logged_in", "1");
      const currentEmail = (emailInput.value || "").trim().toLowerCase();
      if (currentEmail) localStorage.setItem("swish_email", currentEmail);

      window.location.href = next;
    };
    providerBtns.forEach((b) => b.addEventListener("click", onProviderClick));

    const onSubmit = async (e: Event) => {
      e.preventDefault();

      const emailValue = emailInput.value.trim();
      const pwValue = pwInput.value; // 不 trim

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailValue || !emailPattern.test(emailValue)) {
        emailInput.focus();
        showError("メールアドレスの形式が正しくありません。");
        return;
      }
      if (!pwValue) {
        pwInput.focus();
        showError("パスワードを入力してください。");
        return;
      }

      // ✅ 先尝试真登录（后端 /api/auth/login，写 httpOnly cookie）
      try {
        showInfo("ログイン中…");

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // ⭐关键：让 Set-Cookie 生效
          body: JSON.stringify({ email: emailValue, password: pwValue }),
        });

        if (res.ok) {
          // ✅ 真登录成功：跳转 next
          // （可选）同时写一份本地标记，方便你做旧逻辑页面展示
          localStorage.setItem("swish_logged_in", "1");
          localStorage.setItem("swish_email", emailValue.toLowerCase());

          window.location.href = next;
          return;
        }

        // ❗真登录失败：退回旧逻辑（恢复你原来的“能跳转”体验）
        localStorage.setItem("swish_logged_in", "1");
        localStorage.setItem("swish_email", emailValue.toLowerCase());

        // 给个提示，但仍然跳（你说你要回到原来的体验）
        // showError("サーバー認証に失敗したため、簡易ログインで続行します。");
        window.location.href = next;
      } catch {
        // ❗网络/后端错误：也退回旧逻辑
        localStorage.setItem("swish_logged_in", "1");
        localStorage.setItem("swish_email", emailValue.toLowerCase());

        // showError("通信エラーのため、簡易ログインで続行します。");
        window.location.href = next;
      }
    };

    form.addEventListener("submit", onSubmit);

    return () => {
      providerBtns.forEach((b) => b.removeEventListener("click", onProviderClick));
      form.removeEventListener("submit", onSubmit);
    };
  }, []);

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        html,body{height:100%}
        body{
          margin:0; background:#f0f0f1; color:#111;
          font-family: ui-sans-serif, system-ui, -apple-system, "Noto Sans JP", Roboto, Arial;
        }

        /* ✅ logo tweak：小さく + 少し右へ */
        .logo-bar{ position:fixed; top:18px; left:44px; z-index:10 }
        .logo-bar img{ width:90px; height:auto; display:block }

        /* 主区域：左图 + 右登录卡片 */
        .container{
          min-height:100vh;
          display:flex; align-items:center; justify-content:center;
          gap:-20px; padding:60px 40px 40px;
        }
        .card{ margin-left: -30px; }

        /* 左侧插画 */
        .hero{
          flex:1 1 48%;
          display:flex; align-items:center; justify-content:center;
          min-height:320px;
        }
        .hero img{
          width: 100%;
          max-width: 780px;
          height: auto;
          display: block;
          filter: drop-shadow(0 18px 30px rgba(0,0,0,.25));
          transform: translateY(4px);
        }

        /* 右侧登录卡片 */
        .card{
          flex:0 0 520px;
          background:#fff;
          border-radius:22px;
          padding:32px;
          border:none;
          box-shadow:0 20px 60px rgba(0,0,0,.12);
        }

        .head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          color: #6b7280;
          font-size: 14px;
        }
        .head span:first-child {
          color: #000;
          font-weight: 700;
          font-size: 18px;
        }
        .head span:last-child {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.3;
        }
        .head span:last-child a {
          color: #000;
          font-weight: 700;
          text-decoration: none;
        }
        .head span:last-child a:hover {
          text-decoration: underline;
        }

        h1{ margin:6px 0 22px; font-size:36px; line-height:1.1; font-weight:900 }

        /* 表单 */
        form{ display:grid; gap:16px }
        .field{ display:grid; gap:8px }
        label{ font-weight:700; font-size:14px }
        .input{
          width:100%;
          height:48px;
          padding:12px 14px;
          background:#fff;
          border:1.5px solid #e5e7eb;
          border-radius:12px;
          outline:none;
          transition: box-shadow .15s, border-color .15s;
        }
        .input:focus{
          outline:none; border-color:#bbb;
          box-shadow:0 0 0 3px rgba(17,17,17,.06);
        }

        .actions{ display:flex; justify-content:flex-end; font-size:12px }
        .actions a{ color:#0a58ff; text-decoration:none }
        .actions a:hover{ text-decoration:underline }

        /* 图标行 */
        .card .icon-row{
          display:grid;
          grid-template-columns: 1fr 48px 48px;
          gap:10px;
          width:100%;
          margin-bottom:12px;
        }

        .card .img-btn{
          flex:0 0 auto;
          width:44px;
          height:44px;
          padding:6px;
          border:1px solid #e5e7eb;
          border-radius:12px;
          background:#fff;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        }
        .card .img-btn img{
          width:100%;
          height:100%;
          object-fit:contain;
          display:block;
        }
        .card .img-btn:hover{ box-shadow:0 6px 14px rgba(0,0,0,.10); border-color:#d1d5db; }
        .card .img-btn:focus{ outline:none; box-shadow:0 0 0 3px rgba(17,17,17,.08); }

        .icon-row{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:nowrap;
        }
        .img-btn{
          flex:0 0 auto;
          width:44px;
          height:44px;
          padding:6px;
          border:1px solid #e5e7eb;
          border-radius:12px;
          background:#fff;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer;
        }
        .img-btn img{
          width:100%; height:100%; object-fit:contain; display:block;
        }
        .icon-row .img-btn:first-child{
          width:100%;
          height:48px;
          padding:0 14px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:flex-start;
          gap:10px;
        }
        .icon-row .img-btn:first-child img{
          width:auto;
          height:70%;
        }

        @media (max-width: 960px){
          .container{ flex-direction:column; gap:-10px; padding:100px 16px 32px }
          .card{ width:100%; flex-basis:auto }
          .hero img{ width:66%; max-width:320px }
          .icon-row .img-btn:first-child{ width:200px; }

          /* ✅ SPの時はロゴをさらに少し小さめ */
          .logo-bar{ left:16px; top:14px; }
          .logo-bar img{ width:76px; }
        }

        .hero img{
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 55%, #000 75%, transparent 100%);
                  mask-image: radial-gradient(ellipse 70% 60% at 50% 55%, #000 75%, transparent 100%);
        }
        .container, .stage{
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          padding: 96px 40px 40px;
          max-width: 1440px;
          margin: 0 auto;
        }
        .hero{ flex:0 1 500px !important; }
        .hero img{ width:100%; max-width:460px; height:auto; }
        .card{ flex:0 0 460px !important; margin-left:-6px; }

        /* 登录按钮样式 */
        .card form button.btn[type="submit"]{
          background:#111 !important;
          color:#fff !important;
          border:0 !important;
          border-radius:9999px !important;
          padding:14px 22px !important;
          width:40% !important;
          max-width:260px !important;
          font-weight:700;
          letter-spacing:.2px;
          box-shadow:0 12px 22px rgba(0,0,0,.22);
          cursor:pointer;
          transition:background-color .15s, box-shadow .15s, transform .02s;
        }
        .card form button.btn[type="submit"]:hover{ background:#000; box-shadow:0 14px 26px rgba(0,0,0,.28); }
        .card form button.btn[type="submit"]:active{ transform:translateY(1px); }
        .card form button.btn[type="submit"]:focus-visible{
          outline:none; box-shadow:0 0 0 3px rgba(17,17,17,.08), 0 12px 22px rgba(0,0,0,.22);
        }

        /* ✅ 按钮行：靠右 */
        .submit-row{
          display:flex;
          justify-content:flex-end;
          margin-top:8px;
          margin-right:20px;
        }
      `}</style>

      <div className="logo-bar">
        <img src="/pic/logo.png" alt="SWICH ロゴ" />
      </div>

      <main className="container">
        <section className="hero">
          <img src="/pic/man.png" alt="バスケットボールのイラスト" />
        </section>

        <section className="card">
          <div className="head">
            <span>ようこそ SWICH</span>
            <span>
              アカウントがありません？ <a href="/auth/register">新規登録</a>
            </span>
          </div>
          <h1>ログイン</h1>

          <p
            id="info"
            style={{
              display: "none",
              color: "#065f46",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              padding: "8px 12px",
              borderRadius: "8px",
              margin: "-6px 0 6px",
            }}
          ></p>

          <form action="#" method="post">
            <div className="icon-row">
              <button type="button" className="img-btn" data-provider="google" aria-label="Googleでログイン">
                <img src="/pic/Google.png" alt="" />
              </button>
              <button type="button" className="img-btn" data-provider="github" aria-label="GitHubでログイン">
                <img src="/pic/fb.png" alt="" />
              </button>
              <button type="button" className="img-btn" data-provider="guest" aria-label="ゲストで入る">
                <img src="/pic/ios.png" alt="" />
              </button>
            </div>

            <div className="field">
              <label htmlFor="email">メールアドレスを入力してください</label>
              <input id="email" name="email" type="email" className="input" placeholder="メールアドレス" required />
            </div>

            <div className="field">
              <label htmlFor="password">パスワードを入力してください</label>
              <input id="password" name="password" type="password" className="input" placeholder="パスワード" required minLength={8} />
            </div>

            <div className="actions">
              <a href="#">パスワードを忘れます</a>
            </div>

            <div className="submit-row">
              <button type="submit" className="btn">
                ログイン
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}



