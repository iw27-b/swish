'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  
  useEffect(() => {

    const qs = new URLSearchParams(window.location.search);

    // ✅ next：登录后要回去的页面
    const next = qs.get('next') || '/';

    // ✅ 注册后提示
    const email = qs.get('email');
    const registered = qs.get('registered');

    const isLoggedIn = localStorage.getItem('swish_logged_in') === '1';

    if (isLoggedIn) {
      window.location.href = next;
      return;
    }
    if (email) {
      const emailInput =
        document.getElementById('email') as HTMLInputElement | null;

      if (emailInput) emailInput.value = email;
    }
    if (registered === '1') {
      const info = document.getElementById('info') as HTMLElement | null;

      if (info) {
        info.textContent = '登録が完了しました。ログインしてください。';
        info.style.display = 'block';
      }
    }
    const form = document.querySelector<HTMLFormElement>('.card form');
    if (!form) return;

    const emailInput =
      document.getElementById('email') as HTMLInputElement | null;
    const pwInput =
      document.getElementById('password') as HTMLInputElement | null;

    if (!emailInput || !pwInput) return;
    const providerBtns =
      document.querySelectorAll<HTMLButtonElement>(
        '.img-btn[data-provider]'
      );
    const onProviderClick = (e: Event) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const provider = btn.dataset.provider || '';

      // 模拟登录成功
      localStorage.setItem('swish_logged_in', '1');
      localStorage.setItem('swish_provider', provider);

      const currentEmail =
        (emailInput.value || '').trim().toLowerCase();

      if (currentEmail) {
        localStorage.setItem('swish_email', currentEmail);
      }

      window.location.href = next;
    };

    providerBtns.forEach((b) =>
      b.addEventListener('click', onProviderClick)
    );
    const onSubmit = (e: Event) => {
      e.preventDefault();

      const emailValue = emailInput.value.trim();
      const pwValue = pwInput.value;
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailValue || !emailPattern.test(emailValue)) {
        emailInput.focus();
        return;
      }

      if (!pwValue) {
        pwInput.focus();
        return;
      }
      localStorage.setItem('swish_logged_in', '1');
      localStorage.setItem(
        'swish_email',
        emailValue.toLowerCase()
      );

      window.location.href = next;
    };

    form.addEventListener('submit', onSubmit);
    return () => {
      providerBtns.forEach((b) =>
        b.removeEventListener('click', onProviderClick)
      );
      form.removeEventListener('submit', onSubmit);
    };
  }, []);
  return (
    <>
<style>
  {`
    /* 全局 reset */
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0;
      background:#f0f0f1;
      color:#111;
      font-family: ui-sans-serif, system-ui,
      -apple-system, "Noto Sans JP", Roboto, Arial;
    }

    /* logo */
    .logo-bar{ ... }

    /* 主布局 */
    .container{ ... }

    /* hero 插画 */
    .hero{ ... }

    /* 登录卡片 */
    .card{ ... }

    /* 表单、按钮、响应式 */
    ...
  `}
</style>
<div className="logo-bar">
  <img src="/pic/logo.png" alt="SWICH ロゴ" />
</div>
<main className="container">
<section className="hero">
  <img
    src="/pic/man.png"
    alt="バスケットボールのイラスト"
  />
</section>
<section className="card">
<div className="head">
  <span>ようこそ SWICH</span>
  <span>
    アカウントがありません？
    <a href="/auth/register">新規登録</a>
  </span>
</div>
<p
  id="info"
  style={{
    display: 'none',
    color: '#065f46',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    padding: '8px 12px',
    borderRadius: '8px',
    margin: '-6px 0 6px',
  }}
></p>
<form action="#" method="post">
<div className="icon-row">
  <button
    type="button"
    className="img-btn"
    data-provider="google"
  >
    <img src="/pic/Google.png" />
  </button>

  <button
    type="button"
    className="img-btn"
    data-provider="github"
  >
    <img src="/pic/fb.png" />
  </button>

  <button
    type="button"
    className="img-btn"
    data-provider="guest"
  >
    <img src="/pic/ios.png" />
  </button>
</div>
<div className="field">
  <label htmlFor="email">
    メールアドレスを入力してください
  </label>
  <input
    id="email"
    type="email"
    className="input"
    required
  />
</div>

<div className="field">
  <label htmlFor="password">
    パスワードを入力してください
  </label>
  <input
    id="password"
    type="password"
    className="input"
    required
    minLength={8}
  />
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
