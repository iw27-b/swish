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
      setPasswordErr(
        'パスワードは12文字以上で、大文字・小文字・数字・記号を含めてください。'
      );
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
    </>
  );
}
