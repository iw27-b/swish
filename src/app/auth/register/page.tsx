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
      return { ok: longEnough && hasUpper && hasLower && hasNumber && hasSymbol, longEnough, hasUpper, hasLower, hasNumber, hasSymbol };
    }

    const onSubmit = (e: Event) => {
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

      // ✅ パスワードチェック（固定ではなくルール判定）
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

      // 全部OK → 跳转 login 并带上参数
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

        /* 左上角 LOGO（图片） */
        .logo-bar{ position:fixed; top:18px; left:28px; z-index:10 }
        .logo-bar img{ width:120px; height:auto; display:block }

        /* 主区域：左图 + 右卡片 */
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
          width:60%;
          max-width:380px;
          height:auto; display:block;
          filter:drop-shadow(0 16px 24px rgba(0,0,0,.18));
        }

        /* 右侧卡片 */
        .card{
          flex:0 0 460px;
          background:#fff;
          border-radius:22px;
          padding:28px;
          border:none;
          box-shadow:none;
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

        /* 表单 */
        form{ display:grid; gap:16px }
        .field{ display:grid; gap:8px }
        label{ font-weight:700; font-size:14px }
        .input{
          width:100%; padding:12px 14px;
          background:#fff; border:1px solid #d1d5db; border-radius:12px; outline:none;
          transition: box-shadow .15s, border-color .15s;
        }
        .input:focus{
          outline:none; border-color:#bbb;
          box-shadow:0 0 0 3px rgba(17,17,17,.06);
        }

        .actions{ display:flex; justify-content:flex-end; font-size:12px }
        .actions a{ color:#0a58ff; text-decoration:none }
        .actions a:hover{ text-decoration:underline }

        /* 小屏：上下布局 */
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
          display:flex !important;
          align-items:center !important;
          justify-content:center !important;
          gap:16px !important;
          max-width:1120px !important;
          margin:0 auto !important;
          min-height:100vh;
        }
        .hero{ flex:0 1 500px !important; }
        .hero img{ width:100%; max-width:460px; height:auto; }
        .card{ flex:0 0 460px !important; margin-left:-6px; }

        /* 错误提示文字 & 红框 */
        .error{
          color:#e11d48;
          font-size:12px;
          margin-top:6px;
        }
        .input.is-invalid{
          border-color:#ef4444;
          box-shadow:0 0 0 3px rgba(239,68,68,.15);
        }

        .grid-2{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 960px){
          .grid-2{ grid-template-columns: 1fr; }
        }

        /* 按钮行：靠右 */
        .submit-row{
          display:flex;
          justify-content:flex-end;
          margin-top: 12px;
        }

        /* 黑色胶囊按钮 */
        .signup-btn{
          background:#111;
          color:#fff;
          border:0;
          border-radius:9999px;
          height: 48px;
          padding: 0 28px;
          font-weight:700;
          letter-spacing:.2px;
          box-shadow:0 12px 22px rgba(0,0,0,.22);
          cursor:pointer;
          transition:background-color .15s, box-shadow .15s, transform .02s;
        }
        .signup-btn:hover{ background:#000; box-shadow:0 14px 26px rgba(0,0,0,.28); }
        .signup-btn:active{ transform:translateY(1px); }
        .signup-btn:focus-visible{
          outline:none;
          box-shadow:0 0 0 3px rgba(17,17,17,.08), 0 12px 22px rgba(0,0,0,.22);
        }

        @media (max-width: 960px){
          .submit-row{ justify-content:center; }
          .signup-btn{ width: 100%; max-width: 320px; }
        }
      `}</style>

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
          <form action="#" method="post" noValidate>
            {/* メール */}
            <div className="field">
              <label htmlFor="email">メールアドレスを入力してください</label>
              <input id="email" name="email" type="email" className="input" placeholder="メールアドレス" />
              <p className="error" id="emailError"></p>
            </div>

            {/* 名前 & 連絡方法 */}
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

            {/* パスワード */}
            <div className="field">
              <label htmlFor="password">パスワードを入力してください</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder="12文字以上 / 英大小文字 + 数字 + 記号"
              />
              <p className="error" id="passwordError"></p>
            </div>

            <div className="actions">
              <a href="#">パスワードを忘れます</a>
            </div>

            <div className="submit-row">
              <button type="submit" className="btn signup-btn">サインアップ</button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}


