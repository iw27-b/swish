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

  // ✅ provider：暂时也走同一个后端登录流程
  const onProviderLogin = async (provider: string) => {
    setErrorText('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

      window.location.href = nextPath;
    } catch {
      setErrorText('ネットワークエラー。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ 表单登录
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    const emailValue = email.trim();
    const pwValue = password;

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
        credentials: 'include',
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

      localStorage.setItem('swish_logged_in', '1');
      localStorage.setItem('swish_email', emailValue.toLowerCase());

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

        .logo-bar{ position:fixed; top:18px; left:28px; z-index:10 }
        .logo-bar img{ width:120px; height:auto; display:block }

        .container{
          min-height:100vh;
          display:flex; align-items:center; justify-content:center;
          gap:-20px; padding:60px 40px 40px;
        }
        .card{ margin-left:-30px }

        .hero{
          flex:1 1 48%;
          display:flex; align-items:center; justify-content:center;
          min-height:320px;
        }
        .hero img{
          width:100%;
          max-width:780px;
          height:auto;
          filter: drop-shadow(0 18px 30px rgba(0,0,0,.25));
        }

        .card{
          flex:0 0 520px;
          background:#fff;
          border-radius:22px;
          padding:32px;
          box-shadow:0 20px 60px rgba(0,0,0,.12);
        }

        h1{ margin:6px 0 22px; font-size:36px; font-weight:900 }

        form{ display:grid; gap:16px }
        .field{ display:grid; gap:8px }
        label{ font-weight:700; font-size:14px }

        .input{
          width:100%;
          height:48px;
          padding:12px 14px;
          border:1.5px solid #e5e7eb;
          border-radius:12px;
        }

        .actions{ display:flex; justify-content:flex-end; font-size:12px }

        .card .icon-row{
          display:grid;
          grid-template-columns:1fr 48px 48px;
          gap:10px;
          margin-bottom:12px;
        }

        .card .img-btn{
          width:44px;
          height:44px;
          padding:6px;
          border:1px solid #e5e7eb;
          border-radius:12px;
          background:#fff;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .card .img-btn img{
          width:100%;
          height:100%;
          object-fit:contain;
        }

        /* ===== Google 登录按钮：恢复最初的大按钮样式 ===== */
        .card .icon-row .img-btn.google{
          width:100%;
          height:48px;
          padding:0 14px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:flex-start;
          gap:10px;
        }

        .card .icon-row .img-btn.google img{
          width:auto;
          height:70%;
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
          <h1>ログイン</h1>

          {showInfo && <p>{infoText}</p>}
          {errorText && <p style={{ color: 'red' }}>{errorText}</p>}

          <form onSubmit={onSubmit}>
            <div className="icon-row">
              <button
                type="button"
                className="img-btn google"
                onClick={() => onProviderLogin('google')}
                disabled={submitting}
              >
                <img src="/pic/Google.png" alt="" />
              </button>

              <button
                type="button"
                className="img-btn"
                onClick={() => onProviderLogin('github')}
                disabled={submitting}
              >
                <img src="/pic/fb.png" alt="" />
              </button>

              <button
                type="button"
                className="img-btn"
                onClick={() => onProviderLogin('guest')}
                disabled={submitting}
              >
                <img src="/pic/ios.png" alt="" />
              </button>
            </div>

            <div className="field">
              <label>メールアドレス</label>
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label>パスワード</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={submitting}>
              ログイン
            </button>
          </form>
        </section>
      </main>
    </>
  );
}

