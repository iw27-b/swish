"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

export default function AccountPage(): JSX.Element {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  useEffect(() => {
    setUsername(sessionStorage.getItem("username") || "");
    setEmail(sessionStorage.getItem("email") || "");
    setPassword(sessionStorage.getItem("password") || "");
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/userformation";
  };

  return (
    <main className="account-page">
      <h1>アカウント情報</h1>

      <div className="account-info">
        <p><strong>ユーザー名前:</strong> {username}</p>
        <p><strong>メールアドレス:</strong> {email}</p>
        <p><strong>パスワード:</strong> {password}</p>
      </div>

      <button className="logout-btn" onClick={handleLogout}>ログアウト</button>

      <style jsx>{`
        .account-page {
          max-width: 600px;
          margin: 60px auto;
          padding: 0 16px;
          font-family: Arial, sans-serif;
          line-height: 1.6;
          text-align: center;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 24px;
        }
        .account-info {
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          text-align: left;
        }
        .account-info p {
          font-size: 16px;
          margin: 12px 0;
        }
        strong {
          color: #333;
        }
        .logout-btn {
          padding: 12px 24px;
          background: #7b3cff;
          color: white;
          font-size: 16px;
          border: none;
          border-radius: 24px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .logout-btn:hover {
          background: #5d2fb5;
        }
      `}</style>
    </main>
  );
}