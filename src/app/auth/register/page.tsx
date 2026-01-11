'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

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
  }, [email, emailErr]);

  useEffect(() => {
    if (nameErr && name.trim()) {
      setNameErr('');
      setNameInvalid(false);
    }
  }, [name, nameErr]);

  useEffect(() => {
    if (contactErr && contact.trim()) {
      setContactErr('');
      setContactInvalid(false);
    }
  }, [contact, contactErr]);

  useEffect(() => {
    if (passwordErr && password.trim()) {
      setPasswordErr('');
      setPasswordInvalid(false);
    }
  }, [password, passwordErr]);

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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
      setEmailErr('メール形式が正しくありません。');
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

    // ✅ パスワードチェック（12文字以上 + 大写 + 小写 + 数字 + 記号）
    const longEnough = pwValue.length >= 12;
    const hasUpper = /[A-Z]/.test(pwValue);
    const hasLower = /[a-z]/.test(pwValue);
    const hasDigit = /[0-9]/.test(pwValue);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwValue);

    if (!pwValue) {
      setPasswordInvalid(true);
      setPasswordErr('パスワードを入力してください。');
      hasError = true;
    } else if (!(longEnough && hasUpper && hasLower && hasDigit && hasSymbol)) {
      setPasswordInvalid(true);
      setPasswordErr('パスワードは12文字以上で、大文字・小文字・数字・記号を含めてください。');
      hasError = true;
    }

    if (hasError) return;

    // 全部OK → 登录页
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
        <section className="hero">
          <img src="/pic/man.png" alt="バスケットボールのイラスト" />
        </section>

        <section className="card">
          <div className="head">
            <span>ようこそ SWICH</span>
            <span>
              アカウントがあります？ <a href="/auth/login">ログイン</a>
            </span>
          </div>

          <h1>新規登録</h1>

          <form ref={formRef} noValidate onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">メールアドレス</label>
              <input
                id="email"
                type="email"
                className={`input ${emailInvalid ? 'is-invalid' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="error">{emailErr}</p>
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="name">名前</label>
                <input
                  id="name"
                  type="text"
                  className={`input ${nameInvalid ? 'is-invalid' : ''}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="error">{nameErr}</p>
              </div>

              <div className="field">
                <label htmlFor="contact">連絡方法</label>
                <input
                  id="contact"
                  type="text"
                  className={`input ${contactInvalid ? 'is-invalid' : ''}`}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
                <p className="error">{contactErr}</p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                minLength={12}
                placeholder="12文字以上（大文字・小文字・数字・記号）"
                className={`input ${passwordInvalid ? 'is-invalid' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="error">{passwordErr}</p>
            </div>

            <div className="submit-row">
              <button type="submit" className="btn signup-btn">
                サインアップ
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* ✅ style 必须在 return 里面 */}
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
          font-family: ui-sans-serif, system-ui, -apple-system, "Noto Sans JP",
            Roboto, Arial;
        }

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

        .container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: -20px;
          padding: 60px 40px 40px;
        }

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
          -webkit-mask-image: radial-gradient(
            ellipse 70% 60% at 50% 55%,
            #000 75%,
            transparent 100%
          );
          mask-image: radial-gradient(
            ellipse 70% 60% at 50% 55%,
            #000 75%,
            transparent 100%
          );
        }

        .card {
          flex: 0 0 460px;
          background: #fff;
          border-radius: 22px;
          padding: 28px;
          border: none;
          box-shadow: none;
          margin-left: -6px;
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

        .error {
          color: #e11d48;
          font-size: 12px;
          margin-top: 6px;
          min-height: 16px;
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
          .container {
            flex-direction: column;
            padding: 100px 16px 32px;
          }
          .grid-2 {
            grid-template-columns: 1fr;
          }
          .card {
            width: 100%;
          }
          .hero img {
            width: 66%;
            max-width: 320px;
          }
        }

        .submit-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }

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
          box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08),
            0 12px 22px rgba(0, 0, 0, 0.22);
        }
      `}</style>
    </>
  );
}
