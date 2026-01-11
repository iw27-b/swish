'use client';

import { useEffect } from 'react';

export default function RegisterPage() {
  useEffect(() => {
    const LOGIN_URL = '/auth/login';

    const form = document.querySelector<HTMLFormElement>('.card form');
    if (!form) return;

    const email = document.getElementById('email') as HTMLInputElement;
    const pw = document.getElementById('password') as HTMLInputElement;
    const nameEl = document.getElementById('name') as HTMLInputElement;
    const contactEl = document.getElementById('contact') as HTMLInputElement;

    const emailErr = document.getElementById('emailError') as HTMLElement;
    const pwErr = document.getElementById('passwordError') as HTMLElement;
    const nameErr = document.getElementById('nameError') as HTMLElement;
    const contactErr = document.getElementById('contactError') as HTMLElement;

    function clearFieldError(inputEl: HTMLInputElement, errorEl: HTMLElement) {
      inputEl.classList.remove('is-invalid');
      errorEl.textContent = '';
    }

    email.addEventListener('input', () => clearFieldError(email, emailErr));
    pw.addEventListener('input', () => clearFieldError(pw, pwErr));
    nameEl.addEventListener('input', () => clearFieldError(nameEl, nameErr));
    contactEl.addEventListener('input', () =>
      clearFieldError(contactEl, contactErr)
    );

    // 密码规则：>=12 且包含 大写/小写/数字/符号
    function validatePassword(p: string) {
      const hasUpper = /[A-Z]/.test(p);
      const hasLower = /[a-z]/.test(p);
      const hasNumber = /[0-9]/.test(p);
      const hasSymbol = /[^A-Za-z0-9]/.test(p);
      const longEnough = p.length >= 12;

      return {
        ok: hasUpper && hasLower && hasNumber && hasSymbol && longEnough,
        longEnough,
        hasUpper,
        hasLower,
        hasNumber,
        hasSymbol,
      };
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      clearFieldError(email, emailErr);
      clearFieldError(pw, pwErr);
      clearFieldError(nameEl, nameErr);
      clearFieldError(contactEl, contactErr);

      let hasError = false;

      const emailValue = email.value.trim();
      const pwValue = pw.value; // 密码别 trim，避免用户首尾空格被误处理
      const nameValue = nameEl.value.trim();
      const contactValue = contactEl.value.trim();

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // メールチェック
      if (!emailValue) {
        email.classList.add('is-invalid');
        emailErr.textContent = 'メールアドレスを入力してください。';
        hasError = true;
      } else if (!emailPattern.test(emailValue)) {
        email.classList.add('is-invalid');
        emailErr.textContent = 'メール形式が正しくありません。';
        hasError = true;
      }

      // 名前チェック
      if (!nameValue) {
        nameEl.classList.add('is-invalid');
        nameErr.textContent = '名前を入力してください。';
        hasError = true;
      }

      // 連絡方法チェック
      if (!contactValue) {
        contactEl.classList.add('is-invalid');
        contactErr.textContent = '連絡方法を入力してください。';
        hasError = true;
      }

      // パスワードチェック（新规则）
      if (!pwValue) {
        pw.classList.add('is-invalid');
        pwErr.textContent = 'パスワードを入力してください。';
        hasError = true;
      } else {
        const r = validatePassword(pwValue);

        if (!r.ok) {
          pw.classList.add('is-invalid');

          // 给一个清晰的错误提示（日本语）
          const missing: string[] = [];
          if (!r.longEnough) missing.push('12文字以上');
          if (!r.hasUpper) missing.push('英大文字');
          if (!r.hasLower) missing.push('英小文字');
          if (!r.hasNumber) missing.push('数字');
          if (!r.hasSymbol) missing.push('記号');

          pwErr.textContent =
            'パスワードは「12文字以上」かつ「英大文字・英小文字・数字・記号」を含めてください。' +
            (missing.length ? `（不足：${missing.join('・')}）` : '');
          hasError = true;
        }
      }

      if (hasError) return;

      // OK → 跳转 login 并带上参数
      const params = new URLSearchParams({
        registered: '1',
        email: emailValue.toLowerCase(),
      });

      window.location.href = `${LOGIN_URL}?${params.toString()}`;
    });
  }, []);

  return (
    <>
      <style>{`
        *{box-sizing:border-box}
        html,body{height:100%}
        body{
          margin:0;background:#f0f0f1;color:#111;
          font-family: ui-sans-serif, system-ui, -apple-system, "Noto Sans JP", Roboto, Arial;
        }
        .logo-bar{position:fixed;top:18px;left:28px;z-index:10}
        .logo-bar img{width:120px}
        .container{
          min-height:100vh;display:flex;align-items:center;justify-content:center;
          max-width:1120px;margin:0 auto;
        }
        .hero{flex:0 1 500px;display:flex;justify-content:center}
        .hero img{max-width:460px;width:100%}
        .card{
          flex:0 0 460px;background:#fff;border-radius:22px;
          padding:28px;margin-left:-6px;
        }
        .head{display:flex;justify-content:space-between;margin-bottom:10px}
        .head span:first-child{font-weight:700;font-size:18px}
        form{display:grid;gap:16px}
        .field{display:grid;gap:8px}
        label{font-weight:700;font-size:14px}
        .input{
          padding:12px 14px;border:1px solid #d1d5db;border-radius:12px
        }
        .error{color:#e11d48;font-size:12px}
        .input.is-invalid{border-color:#ef4444}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .submit-row{display:flex;justify-content:flex-end}
        .signup-btn{
          background:#111;color:#fff;border-radius:9999px;
          height:48px;padding:0 28px;font-weight:700;border:0;
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
              アカウントがあります？ <a href="/auth/login">ログイン</a>
            </span>
          </div>

          <h1>新規登録</h1>

          <form noValidate>
            <div className="field">
              <label htmlFor="email">メールアドレス</label>
              <input id="email" className="input" placeholder="メールアドレス" />
              <p className="error" id="emailError" />
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="name">名前</label>
                <input id="name" className="input" placeholder="名前" />
                <p className="error" id="nameError" />
              </div>
              <div className="field">
                <label htmlFor="contact">連絡方法</label>
                <input
                  id="contact"
                  className="input"
                  placeholder="連絡方法"
                />
                <p className="error" id="contactError" />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="12文字以上 / 大小英字 + 数字 + 記号"
              />
              <p className="error" id="passwordError" />
            </div>

            <div className="submit-row">
              <button className="signup-btn">サインアップ</button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}


