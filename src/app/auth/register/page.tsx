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
    ) {
      return;
    }

    // 清除某个字段的错误显示
    function clearFieldError(inputEl: HTMLInputElement, errorEl: HTMLElement) {
      inputEl.classList.remove('is-invalid');
      errorEl.textContent = '';
    }

    // 输入时自动清除红字
    const onEmailInput = () => clearFieldError(email, emailErr);
    const onPwInput = () => clearFieldError(pw, pwErr);
    const onNameInput = () => clearFieldError(nameEl, nameErr);
    const onContactInput = () => clearFieldError(contactEl, contactErr);

    email.addEventListener('input', onEmailInput);
    pw.addEventListener('input', onPwInput);
    nameEl.addEventListener('input', onNameInput);
    contactEl.addEventListener('input', onContactInput);

    // ✅ 密码规则：12+字符 + 大写 + 小写 + 数字 + 符号
    function validatePassword(p: string) {
      const longEnough = p.length >= 12;
      const hasUpper = /[A-Z]/.test(p);
      const hasLower = /[a-z]/.test(p);
      const hasNumber = /[0-9]/.test(p);
      const hasSymbol = /[^A-Za-z0-9]/.test(p);
      return {
        ok: longEnough && hasUpper && hasLower && hasNumber && hasSymbol,
        longEnough,
        hasUpper,
        hasLower,
        hasNumber,
        hasSymbol,
      };
    }

    const onSubmit = async (e: Event)  => {
      e.preventDefault();

      // 每次提交先清空错误
      clearFieldError(email, emailErr);
      clearFieldError(pw, pwErr);
      clearFieldError(nameEl, nameErr);
      clearFieldError(contactEl, contactErr);

      let hasError = false;

      const emailValue = email.value.trim();
      const pwValue = pw.value; // 密码别 trim（避免用户首尾空格被误吞）
      const nameValue = nameEl.value.trim();
      const contactValue = contactEl.value.trim();

      // 简单邮箱正则
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // メールチェック
      if (!emailValue) {
        email.classList.add('is-invalid');
        emailErr.textContent = 'メールアドレスを入力してください。';
        hasError = true;
      } else if (!emailPattern.test(emailValue)) {
        email.classList.add('is-invalid');
        emailErr.textContent =
          'メール形式が正しくありません。もう一度入力してください。';
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

      // ✅ 真注册：POST /api/auth/register（写入数据库）
      // 注意：你的后端 RegisterSchema 只要 email/password/name，不需要 contact
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // 同域其实不必 include，但加了也没坏处
          credentials: 'include',
          body: JSON.stringify({
            email: emailValue.toLowerCase(),
            password: pwValue,
            name: nameValue,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          // 让你看得见具体原因（比如 409 user exists / 400 validation）
          const msg =
            (data && (data.message || data.error)) ||
            `登録に失敗しました（${res.status}）`;
          contactEl.classList.add('is-invalid');
          contactErr.textContent = msg;
          return;
        }

        // ✅ 注册成功 → 跳转 login 并带上 email
        const params = new URLSearchParams({
          registered: '1',
          email: emailValue.toLowerCase(),
        });
        window.location.href = `${LOGIN_URL}?${params.toString()}`;
      } catch (err) {
        contactEl.classList.add('is-invalid');
        contactErr.textContent = '通信エラーが発生しました。もう一度試してください。';
        return;
      }
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
        .logo-bar{ position:fixed; top:18px; left:44px; z-index:10 }
        .logo-bar img{ width:90px; height:auto; display:block }

        .container{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:16px;
          max-width:1120px;
          margin:0 auto;
          padding:96px 40px 40px;
        }
        .hero{ flex:0 1 500px; display:flex; justify-content:center }
        .hero img{ max-width:460px; width:100%; height:auto; }

        .card{
          flex:0 0 460px;
          background:#fff;
          border-radius:22px;
          padding:28px;
          margin-left:-6px;
        }

        .head{display:flex;justify-content:space-between;margin-bottom:10px;color:#6b7280;font-size:14px}
        .head span:first-child{color:#000;font-weight:700;font-size:18px}
        .head a{color:#000;font-weight:700;text-decoration:none}
        .head a:hover{text-decoration:underline}

        h1{ margin:6px 0 22px; font-size:36px; line-height:1.1; font-weight:900 }

        form{ display:grid; gap:16px }
        .field{ display:grid; gap:8px }
        label{ font-weight:700; font-size:14px }
        .input{
          width:100%;
          padding:12px 14px;
          background:#fff;
          border:1px solid #d1d5db;
          border-radius:12px;
          outline:none;
        }

        .error{ color:#e11d48; font-size:12px; margin-top:6px; }
        .input.is-invalid{
          border-color:#ef4444;
          box-shadow:0 0 0 3px rgba(239,68,68,.15);
        }

        .grid-2{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:16px;
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
          box-shadow:0 12px 22px rgba(0,0,0,.22);
          cursor:pointer;
        }
        .signup-btn:hover{ background:#000; box-shadow:0 14px 26px rgba(0,0,0,.28); }
        .signup-btn:active{ transform:translateY(1px); }

        @media (max-width: 960px){
          .container{ flex-direction:column; padding:100px 16px 32px; }
          .grid-2{ grid-template-columns:1fr; }
          .submit-row{ justify-content:center; }
          .signup-btn{ width:100%; max-width:320px; }

          /* ✅ SP logo */
          .logo-bar{ top:14px; left:16px; }
          .logo-bar img{ width:76px; }
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

          <form action="#" method="post" noValidate>
            <div className="field">
              <label htmlFor="email">メールアドレスを入力してください</label>
              <input id="email" name="email" type="email" className="input" placeholder="メールアドレス" />
              <p className="error" id="emailError"></p>
            </div>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="name">あなたの名前</label>
                <input id="name" name="name" type="text" className="input" placeholder="名前" />
                <p className="error" id="nameError"></p>
              </div>

              <div className="field">
                <label htmlFor="contact">連絡方法</label>
                <input id="contact" name="contact" type="text" className="input" placeholder="連絡方法" />
                <p className="error" id="contactError"></p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">パスワードを入力してください</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder="パスワードは「12文字以上」かつ「英大文字・英小文字・数字・記号」を含めてください。"
              />
              <p className="error" id="passwordError"></p>
            </div>

            <div className="submit-row">
              <button type="submit" className="signup-btn">サインアップ</button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}

