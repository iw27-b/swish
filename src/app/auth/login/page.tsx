'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage(): React.ReactElement {
  const router = useRouter();

  const [next, setNext] = useState('/');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [infoText, setInfoText] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // ✅ 只在客户端读取 URL 参数（避免 useSearchParams + Suspense 报错）
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);

    const nextParam = qs.get('next') || '/';
    const emailParam = qs.get('email') || '';
    const registered = qs.get('registered');

    setNext(nextParam);

    // 如果已登录：直接回 next（“保持”体验）
    const isLoggedIn = localStorage.getItem('swish_logged_in') === '1';
    if (isLoggedIn) {
      router.replace(nextParam);
      return;
    }

    // 预填邮箱
    if (emailParam) setEmail(emailParam);

    // 注册成功提示
    if (registered === '1') {
      setInfoText('登録が完了しました。ログインしてください。');
      setShowInfo(true);
    }
  }, [router]);

  const onProviderLogin = (provider: string) => {
    localStorage.setItem('swish_logged_in', '1');
    localStorage.setItem('swish_provider', provider);

    const currentEmail = (email || '').trim().toLowerCase();
    if (currentEmail) localStorage.setItem('swish_email', currentEmail);

    router.push(next);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailValue = email.trim();
    const pwValue = password; // 不 trim

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue || !emailPattern.test(emailValue)) return;
    if (!pwValue) return;

    localStorage.setItem('swish_logged_in', '1');
    localStorage.setItem('swish_email', emailValue.toLowerCase());

    router.push(next);
  };

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        html,body{height:100%}
        body{
          margin:0; background:#f0f0f1; color:#111;
          font-family: ui-sans-serif, system-ui, -apple-system, "Noto Sans JP", Roboto, Arial;
        }
        .logo-bar{ position:fixed; top:18px; left:28px; z-index:10 }
        .logo-bar img{ width:120px; height:auto; display:block }
        .container{
          min-height:100vh;
          display:flex; align-items:center; justify-content:center;
          gap:-20px; padding:60px 40px 40px;
        }
        .card{ margin-left: -30px; }
        .hero{ flex:1 1 48%; display:flex; align-items:center; justify-content:center; min-height:320px; }
        .hero img{
          width: 100%; max-width: 780px; height: auto; display: block;
          filter: drop-shadow(0 18px 30px rgba(0,0,0,.25));
          transform: translateY(4px);
        }
        .card{
          flex:0 0 520px; background:#fff; border-radius:22px; padding:32px;
          border:none; box-shadow:0 20px 60px rgba(0,0,0,.12);
        }
        .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; color:#6b7280; font-size:14px; }
        .head span:first-child { color:#000; font-weight:700; font-size:18px; }
        .head span:last-child { display:flex; flex-direction:column; align-items:flex-end; line-height:1.3; }
        .head span:last-child a { color:#000; font-weight:700; text-decoration:none; }
        .head span:last-child a:hover { text-decoration:underline; }
        h1{ margin:6px 0 22px; font-size:36px; line-height:1.1; font-weight:900 }
        form{ display:grid; gap:16px }
        .field{ display:grid; gap:8px }
        label{ font-weight:700; font-size:14px }
        .input{
          width:100%; height:48px; padding:12px 14px; background:#fff;
          border:1.5px solid #e5e7eb; border-radius:12px; outline:none;
          transition: box-shadow .15s, border-color .15s;
        }
        .input:focus{ border-color:#bbb; box-shadow:0 0 0 3px rgba(17,17,17,.06); }
        .actions{ display:flex; justify-content:flex-end; font-size:12px }
        .actions a{ color:#0a58ff; text-decoration:none }
        .actions a:hover{ text-decoration:underline }
        .icon-row{ display:flex; align-items:center; gap:10px; flex-wrap:nowrap; }
        .img-btn{
          width:44px; height:44px; padding:6px; border:1px solid #e5e7eb; border-radius:12px;
          background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;
        }
        .img-btn img{ width:100%; height:100%; object-fit:contain; display:block; }
        .submit-row{ display:flex; justify-content:flex-end; margin-top:8px; margin-right:20px; }
        .card form button.btn[type="submit"]{
          background:#111 !important; color:#fff !important; border:0 !important; border-radius:9999px !important;
          padding:14px 22px !important; width:40% !important; max-width:260px !important;
          font-weight:700; letter-spacing:.2px; box-shadow:0 12px 22px rgba(0,0,0,.22);
          cursor:pointer;
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

          {showInfo && (
            <p
              style={{
                color: '#065f46',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '8px 12px',
                borderRadius: '8px',
                margin: '-6px 0 6px',
              }}
            >
              {infoText}
            </p>
          )}

          <form onSubmit={onSubmit}>
            <div className="icon-row">
              <button type="button" className="img-btn" onClick={() => onProviderLogin('google')}>
                <img src="/pic/Google.png" alt="" />
              </button>
              <button type="button" className="img-btn" onClick={() => onProviderLogin('github')}>
                <img src="/pic/fb.png" alt="" />
              </button>
              <button type="button" className="img-btn" onClick={() => onProviderLogin('guest')}>
                <img src="/pic/ios.png" alt="" />
              </button>
            </div>

            <div className="field">
              <label htmlFor="email">メールアドレスを入力してください</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="メールアドレス"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="password">パスワードを入力してください</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder="パスワード"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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


