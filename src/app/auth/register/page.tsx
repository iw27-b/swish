'use client';

import { useEffect } from 'react';

export default function RegisterPage() {
  useEffect(() => {
    const LOGIN_URL = '/auth/login';

    const form = document.querySelector<HTMLFormElement>('.card form');
    const email = document.getElementById('email') as HTMLInputElement | null;
    const pw = document.getElementById('password') as HTMLInputElement | null;
    const nameEl = document.getElementById('name') as HTMLInputElement | null;
    const contactEl = document.getElementById('contact') as HTMLInputElement | null;

    const emailErr = document.getElementById('emailError') as HTMLElement | null;
    const pwErr = document.getElementById('passwordError') as HTMLElement | null;
    const nameErr = document.getElementById('nameError') as HTMLElement | null;
    const contactErr = document.getElementById('contactError') as HTMLElement | null;

    if (
      !form ||
      !email ||
      !pw ||
      !nameEl ||
      !contactEl ||
      !emailErr ||
      !pwErr ||
      !nameErr ||
      !contactErr
    )
      return;

    function clearFieldError(inputEl: HTMLInputElement, errorEl: HTMLElement) {
      inputEl.classList.remove('is-invalid');
      errorEl.textContent = '';
    }

    const onEmailInput = () => clearFieldError(email, emailErr);
    const onPwInput = () => clearFieldError(pw, pwErr);
    const onNameInput = () => clearFieldError(nameEl, nameErr);
    const onContactInput = () => clearFieldError(contactEl, contactErr);

    email.addEventListener('input', onEmailInput);
    pw.addEventListener('input', onPwInput);
    nameEl.addEventListener('input', onNameInput);
    contactEl.addEventListener('input', onContactInput);

    function validatePassword(p: string) {
      const longEnough = p.length >= 12;
      const hasUpper = /[A-Z]/.test(p);
      const hasLower = /[a-z]/.test(p);
      const hasNumber = /[0-9]/.test(p);
      const hasSymbol = /[^A-Za-z0-9]/.test(p);
      return { ok: longEnough && hasUpper && hasLower && hasNumber && hasSymbol, longEnough, hasUpper, hasLower, hasNumber, hasSymbol };
    }

    const onSubmit = (e: Event) => {
      e.preventDefault();

      clearFieldError(email, emailErr);
      clearFieldError(pw, pwErr);
      clearFieldError(nameEl, nameErr);
      clearFieldError(contactEl, contactErr);

      let hasError = false;

      const emailValue = email.value.trim();
      const pwValue = pw.value;
      const nameValue = nameEl.value.trim();
      const contactValue = contactEl.value.trim();

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailValue) {
        email.classList.add('is-invalid');
        emailErr.textContent = 'メールアドレスを入力してください。';
        hasError = true;
      } else if (!emailPattern.test(emailValue)) {
        email.classList.add('is-invalid');
        emailErr.textContent = 'メール形式が正しくありません。';
        hasError = true;
      }

      if (!nameValue) {
        nameEl.classList.add('is-invalid');
        nameErr.textContent = '名前を入力してください。';
        hasError = true;
      }

      if (!contactValue) {
        contactEl.classList.add('is-invalid');
        contactErr.textContent = '連絡方法を入力してください。';
        hasError = true;
      }

      if (!pwValue) {
        pw.classList.add('is-invalid');
        pwErr.textContent = 'パスワードを入力してください。';
        hasError = true;
      } else {
        const r = validatePassword(pwValue);
        if (!r.ok) {
          pw.classList.add('is-invalid');
          pwErr.textContent =
            'パスワードは「12文字以上」かつ「英大文字・英小文字・数字・記号」を含めてください。';
          hasError = true;
        }
      }

      if (hasError) return;

      const params = new URLSearchParams({
        registered: '1',
        email: emailValue.toLowerCase(),
      });

      window.location.href = `${LOGIN_URL}?${params.toString()}`;
    };

    form.addEventListener('submit', onSubmit);

    return () => {
      email.removeEventListener('input', onEmailInput);
      pw.removeEventListener('input', onPwInput);
      nameEl.removeEventListener('input', onNameInput);
      contactEl.removeEventListener('input', onContactInput);
      form.removeEventListener('submit', onSubmit);
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

        /* ✅ logo（login と同一） */
        .logo-bar{
          position:fixed;
          top:18px;
          left:44px;
          z-index:10;
        }
        .logo-bar img{
          width:90px;
          height:auto;
          display:block;
        }

        /* 主区域 */
        .container{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:60px 40px 40px;
        }

        /* 左侧插画 */
        .hero{
          flex:1;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .hero img{
          width:60%;
          max-width:380px;
          filter:drop-shadow(0 16px 24px rgba(0,0,0,.18));
        }

        /* 右侧卡片 */
        .card{
          flex:0 0 460px;
          background:#fff;
          border-radius:22px;
          padding:28px;
        }

        h1{ margin:6px 0 22px; font-size:36px; font-weight:900 }

        form{ display:grid; gap:16px }
        .field{ display:grid; gap:8px }
        label{ font-weight:700; font-size:14px }

        .input{
          width:100%;
          padding:12px 14px;
          border:1px solid #d1d5db;
          border-radius:12px;
        }

        .error{
          color:#e11d48;
          font-size:12px;
        }
        .input.is-invalid{
          border-color:#ef4444;
          box-shadow:0 0 0 3px rgba(239,68,68,.15);
        }

        .submit-row{
          display:flex;
          justify-content:flex-end;
          margin-top:12px;
        }

        .signup-btn{
          background:#111;
          color:#fff;
          border:0;
          border-radius:9999px;
          height:48px;
          padding:0 28px;
          font-weight:700;
        }

        /* ✅ SP */
        @media (max-width: 960px){
          .container{
            flex-direction:column;
            padding:100px 16px 32px;
          }
          .logo-bar{
            top:14px;
            left:16px;
          }
          .logo-bar img{
            width:76px;
          }
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
          <h1>新規登録</h1>
          {/* フォームはそのまま */}
        </section>
      </main>
    </>
  );
}


