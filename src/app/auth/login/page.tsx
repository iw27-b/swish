'use client';

import React, { useEffect, useState } from 'react';

export default function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [infoText, setInfoText] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // ✅ 登录成功后要回去的页面（默认去 /me）
  const [nextPath, setNextPath] = useState('/me');

  // ✅ 错误提示
  const [errorText, setErrorText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // ✅ 读取 URL 参数：email / registered / next
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);

    const emailParam = qs.get('email') || '';
    const registered = qs.get('registered');
    const next = qs.get('next') || '/me';

    setNextPath(next);

    if (emailParam) setEmail(emailParam);

    if (registered === '1') {
      setInfoText('登録が完了しました。ログインしてください。');
      setShowInfo(true);
    }

    // ✅ 如果已经登录（有 cookie），就别停在 login，直接回 next
    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        if (res.ok) {
          window.location.replace(next);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // ✅ provider：暂时也走同一个后端登录流程（真实项目应跳 OAuth）
  const onProviderLogin = async (provider: string) => {
    setErrorText('');
    setSubmitting(true);

    try {
      // 如果你后端没有 provider 登录接口，这里会失败（这是正常的）
      // 你可以之后把它换成：window.location.href = `/api/auth/oauth/${provider}?next=...`
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 这里先传 provider，让后端有机会识别（如果后端不支持会忽略/报错）
          provider,
          email: (email || '').trim(),
          password,
        }),
      });

      if (!res.ok) {
        let msg = `ログインに失敗しました（${provider}）`;
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
          if (data?.message) msg = data.message;
        } catch {}
        setErrorText(msg);
        return;
      }

      // ✅ 登录成功：服务器已 set-cookie
      window.location.href = nextPath;
    } catch {
      setErrorText('ネットワークエラー。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 表单登录：调用后端 /api/auth/login 设置 cookie
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    const emailValue = email.trim();
    const pwValue = password; // 不 trim

    // 简单邮箱校验（保留你的）
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue || !emailPattern.test(emailValue)) {
      setErrorText('メールアドレスの形式が正しくありません。');
      return;
    }
    if (!pwValue) {
      setErrorText('パスワードを入力してください。');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', // ✅ 关键：接收 & 发送 cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, password: pwValue }),
      });

      if (!res.ok) {
        let msg = 'ログインに失敗しました。';
        try {
          const data = await res.json();
          if (data?.error) msg = data.error;
          if (data?.message) msg = data.message;
        } catch {}
        setErrorText(msg);
        return;
      }

      // ✅ （可选）你如果还想在前端也留一份状态，OK，但真正鉴权还是 cookie
      localStorage.setItem('swish_logged_in', '1');
      localStorage.setItem('swish_email', emailValue.toLowerCase());

      // ✅ 回到“点 login 的页面”（没 next 就去 /me）
      window.location.href = nextPath;
    } catch {
      setErrorText('ネットワークエラー。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
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

        /* 左上角 LOGO（图片） */
        .logo-bar{ position:fixed; top:18px; left:28px; z-index:10 }
        .logo-bar img{ width:120px; height:auto; display:block }

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

        @media (max-width: 960px){
          .container{ flex-direction:column; gap:-10px; padding:100px 16px 32px }
          .card{ width:100%; flex-basis:auto }
          .hero img{ width:66%; max-width:320px }
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

          {errorText && (
            <p
              style={{
                color: '#b91c1c',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '8px 12px',
                borderRadius: '8px',
                margin: '0 0 10px',
              }}
            >
              {errorText}
            </p>
          )}

          <form onSubmit={onSubmit}>
            <div className="icon-row">
              <button
                type="button"
                className="img-btn"
                aria-label="Googleでログイン"
                onClick={() => onProviderLogin('google')}
                disabled={submitting}
              >
                <img src="/pic/Google.png" alt="" />
              </button>

              <button
                type="button"
                className="img-btn"
                aria-label="GitHubでログイン"
                onClick={() => onProviderLogin('github')}
                disabled={submitting}
              >
                <img src="/pic/fb.png" alt="" />
              </button>

              <button
                type="button"
                className="img-btn"
                aria-label="ゲストで入る"
                onClick={() => onProviderLogin('guest')}
                disabled={submitting}
              >
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
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? '...' : 'ログイン'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
