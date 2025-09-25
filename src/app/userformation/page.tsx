"use client";
/* eslint-disable @next/next/no-img-element */
import { FormEvent } from "react";

export default function Page(): JSX.Element {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const username = (form.querySelector("#username") as HTMLInputElement).value;
    const email = (form.querySelector("#email") as HTMLInputElement).value;
    const password = (form.querySelector("#password") as HTMLInputElement).value;

    // 保存到 sessionStorage
    sessionStorage.setItem("username", username);
    sessionStorage.setItem("email", email);
    sessionStorage.setItem("password", password);

    // 跳转
    window.location.href = "/account";
  };

  return (
    <main>
      <section className="login-section">
        {/* 左側圖片 */}
        <div className="login-left">
          <img src="/images/userformation/uf-0.png" alt="左側画像1" />
          <img src="/images/userformation/uf-1.png" alt="左側画像2" />
        </div>

        {/* 右側表單 */}
        <div className="login-right">
          <form className="login-form" id="loginForm" onSubmit={handleSubmit}>
            <label>
              <span>ユーザー名前</span>
              <input type="text" id="username" placeholder="ユーザー_1" required />
            </label>

            <label>
              <span>メールアドレス</span>
              <input type="email" id="email" placeholder="Jason@Gmail.Com" required />
            </label>

            <label>
              <span>パスワード</span>
              <input type="password" id="password" placeholder="Qwer1234" required />
            </label>

            {/* 图片按钮 */}
            <button type="submit" className="image-btn">ログイン</button>
          </form>
        </div>
      </section>

      <style jsx>{`
        .login-section {
          display: flex;
          justify-content: center;
          align-items: center;
          max-width: 1080px;
          margin: 40px auto;
          padding: 0 16px;
          gap: 30px;
        }

        .login-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }

        .login-left img {
          display: block;
          border: none;
          background: none;
          filter: none;
        }

        .login-left img:first-child {
          width: 280px;
          height: auto;
        }

        .login-left img:last-child {
          width: 200px;
          height: auto;
        }

        .login-right {
          display: flex;
          justify-content: flex-start;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 320px;
        }

        .login-form label span {
          display: block;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .login-form input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #ccc;
          background: #f5f5f5;
          font-size: 14px;
          border-radius: 24px;
          outline: none;
        }

        .login-form input:focus {
          border-color: #7b3cff;
          box-shadow: 0 0 0 3px rgba(123, 60, 255, 0.15);
        }

        .image-btn {
          width: 100%;
          height: 56px;
          border: none;
          border-radius: 28px;
          cursor: pointer;
          background: url("/images/userformation/uf-3.png") no-repeat center/contain;
          text-indent: -9999px;
        }

        @media (max-width: 880px) {
          .login-section {
            flex-direction: column;
            gap: 18px;
          }
          .login-left {
            align-items: center;
          }
          .login-left img:first-child {
            width: 60vw;
            max-width: 320px;
          }
          .login-left img:last-child {
            width: 44vw;
            max-width: 240px;
          }
          .login-form {
            width: 92vw;
            max-width: 420px;
          }
        }
      `}</style>
    </main>
  );
}