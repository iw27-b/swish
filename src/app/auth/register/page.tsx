'use client';

import { useEffect, useRef, useState } from 'react';

export default function RegisterPage() {
  const LOGIN_URL = '/auth/login';

  const formRef = useRef<HTMLFormElement | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');

  const [emailErr, setEmailErr] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [contactErr, setContactErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const [emailInvalid, setEmailInvalid] = useState(false);
  const [nameInvalid, setNameInvalid] = useState(false);
  const [contactInvalid, setContactInvalid] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);

  // 输入时自动清除红字
  useEffect(() => {
    if (emailErr && email.trim()) {
      setEmailErr('');
      setEmailInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useEffect(() => {
    if (nameErr && name.trim()) {
      setNameErr('');
      setNameInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    if (contactErr && contact.trim()) {
      setContactErr('');
      setContactInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact]);

  useEffect(() => {
    if (passwordErr && password.trim()) {
      setPasswordErr('');
      setPasswordInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  function clearAllErrors() {
    setEmailErr('');
    setNameErr('');
    setContactErr('');
    setPasswordErr('');

    setEmailInvalid(false);
    setNameInvalid(false);
    setContactInvalid(false);
    setPasswordInvalid(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    clearAllErrors();

    let hasError = false;

    const emailValue = email.trim();
    const nameValue = name.trim();
    const contactValue = contact.trim();
    const pwValue = password.trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // メールチェック
    if (!emailValue) {
      setEmailInvalid(true);
      setEmailErr('メールアドレスを入力してください。');
      hasError = true;
    } else if (!emailPattern.test(emailValue)) {
      setEmailInvalid(true);
      setEmailErr('メール形式が正しくありません。もう一度入力してください。');
      hasError = true;
    }

    // 名前チェック
    if (!nameValue) {
      setNameInvalid(true);
      setNameErr('名前を入力してください。');
      hasError = true;
    }

    // 連絡方法チェック
    if (!contactValue) {
      setContactInvalid(true);
      setContactErr('連絡方法を入力してください。');
      hasError = true;
    }

    // パスワードチェック
    const FIXED_PASSWORD = 'Asdfqw123.!?';
    if (!pwValue) {
      setPasswordInvalid(true);
      setPasswordErr('パスワードを入力してください。');
      hasError = true;
    } else if (pwValue !== FIXED_PASSWORD) {
      setPasswordInvalid(true);
      setPasswordErr('パスワードが正しくありません。');
      hasError = true;
    }

    if (hasError) return;

    // 全部OK → 跳转 /auth/login 并带上参数
    const params = new URLSearchParams({
      registered: '1',
      email: emailValue.toLowerCase(),
    });

    window.location.href = `${LOGIN_URL}?${params.toString()}`;
  }

  return (
    <>
      <div className="logo-bar">
        <img src="/pic/logo.png" alt="SWICH ロゴ" />
      </div>

      <main className="container">
        {/* 左侧插画 */}
        <section className="hero">
          <img src="/pic/man.png" alt="バスケットボールのイラスト" />
        </section>

        {/* 右侧：注册卡片 */}
        <section className="card">
          <div className="head">
            <span>ようこそ SWICH</span>
            <span>
              アカウントがあります？ <a href="/auth/login">ログイン</a>
            </span>
          </div>

          <h1>新規登録</h1>

          {/* 自定义验证，不用浏览器默认气泡 */}
          <form ref={formRef} action="#" method="post" noValidate onSubmit={handleSubmit}>
            {/* メール */}
            <div className="field">
              <label htmlFor="email">メールアドレスを入力してください</label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input ${emailInvalid ? 'is-invalid' : ''}`}
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="error" id="emailError">
                {emailErr}
              </p>
            </div>

            {/* 名前 & 連絡方法 */}
            <div className="grid-2">
              <div className="field">
                <label htmlFor="name">あなたの名前</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className={`input ${nameInvalid ? 'is-invalid' : ''}`}
                  placeholder="名前"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="error" id="nameError">
                  {nameErr}
                </p>
              </div>

              <div className="field">
                <label htmlFor="contact">連絡方法</label>
                <input
                  id="contact"
                  name="contact"
                  type="text"
                  className={`input ${contactInvalid ? 'is-invalid' : ''}`}
                  placeholder="連絡方法"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
                <p className="error" id="contactError">
                  {contactErr}
                </p>
              </div>
            </div>

            {/* パスワード */}
            <div className="field">
              <label htmlFor="password">パスワードを入力してください</label>
              <input
                id="password"
                name="password"
                type="password"
                className={`input ${passwordInvalid ? 'is-invalid' : ''}`}
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="error" id="passwordError">
                {passwordErr}
              </p>
            </div>

            <div className="actions">
              <a href="#">パスワードを忘れます</a>
            </div>

            <div className="submit-row">
              <button type="submit" className="btn signup-btn">
                サインアップ
              </button>
            </div>
          </form>
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        html,
        body {
          height: 100%;
        }
        body {
          margin: 0;
          background: #f0f0f1;
          color: #111;
          font-family: ui-sans-serif, system-ui, -apple-system, "Noto Sans JP", Roboto, Arial;
        }

        /* 左上角 LOGO（图片） */
        .logo-bar {
          position: fixed;
          top: 18px;
          left: 28px;
          z-index: 10;
        }
        .logo-bar img {
          width: 120px;
          height: auto;
          display: block;
        }

        /* 主区域：左图 + 右卡片 */
        .container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: -20px;
          padding: 60px 40px 40px;
        }
        .card {
          margin-left: -30px;
        }

        /* 左侧插画 */
        .hero {
          flex: 1 1 48%;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 320px;
        }
        .hero img {
          width: 60%;
          max-width: 380px;
          height: auto;
          display: block;
          filter: drop-shadow(0 16px 24px rgba(0, 0, 0, 0.18));
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 55%, #000 75%, transparent 100%);
          mask-image: radial-gradient(ellipse 70% 60% at 50% 55%, #000 75%, transparent 100%);
        }

        /* 右侧卡片 */
        .card {
          flex: 0 0 460px;
          background: #fff;
          border-radius: 22px;
          padding: 28px;
          border: none;
          box-shadow: none;
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

        h1 {
          margin: 6px 0 22px;
          font-size: 36px;
          line-height: 1.1;
          font-weight: 900;
        }

        /* 表单 */
        form {
          display: grid;
          gap: 16px;
        }
        .field {
          display: grid;
          gap: 8px;
        }
        label {
          font-weight: 700;
          font-size: 14px;
        }
        .input {
          width: 100%;
          padding: 12px 14px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          outline: none;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .input:focus {
          outline: none;
          border-color: #bbb;
          box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.06);
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          font-size: 12px;
        }
        .actions a {
          color: #0a58ff;
          text-decoration: none;
        }
        .actions a:hover {
          text-decoration: underline;
        }

        /* 小屏：上下布局 */
        @media (max-width: 960px) {
          .container {
            flex-direction: column;
            gap: -10px;
            padding: 100px 16px 32px;
          }
          .card {
            width: 100%;
            flex-basis: auto;
          }
          .hero img {
            width: 66%;
            max-width: 320px;
          }
        }

        .container,
        .stage {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 16px !important;
          max-width: 1120px !important;
          margin: 0 auto !important;
          min-height: 100vh;
        }
        .hero {
          flex: 0 1 500px !important;
        }
        .hero img {
          width: 100%;
          max-width: 460px;
          height: auto;
        }
        .card {
          flex: 0 0 460px !important;
          margin-left: -6px;
        }

        /* 错误提示文字 & 红框 */
        .error {
          color: #e11d48;
          font-size: 12px;
          margin-top: 6px;
          min-height: 16px; /* 防止布局抖动 */
        }
        .input.is-invalid {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 960px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }

        /* 按钮行：靠右 */
        .submit-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }

        /* 黑色胶囊按钮 */
        .signup-btn {
          background: #111;
          color: #fff;
          border: 0;
          border-radius: 9999px;
          height: 48px;
          padding: 0 28px;
          font-weight: 700;
          letter-spacing: 0.2px;
          box-shadow: 0 12px 22px rgba(0, 0, 0, 0.22);
          cursor: pointer;
          transition: background-color 0.15s, box-shadow 0.15s, transform 0.02s;
        }
        .signup-btn:hover {
          background: #000;
          box-shadow: 0 14px 26px rgba(0, 0, 0, 0.28);
        }
        .signup-btn:active {
          transform: translateY(1px);
        }
        .signup-btn:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08), 0 12px 22px rgba(0, 0, 0, 0.22);
        }

        @media (max-width: 960px) {
          .submit-row {
            justify-content: center;
          }
          .signup-btn {
            width: 100%;
            max-width: 320px;
          }
        }
      `}</style>
    </>
  );
}
