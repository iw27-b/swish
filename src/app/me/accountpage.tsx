"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client_auth";

export default function AccountPage(): React.ReactElement {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/login"); // ✅ 未登录去登录
    }
  }, [loading, isAuthenticated, router]);

  const maskedPassword = useMemo(() => (user ? "••••••••" : ""), [user]);

  if (loading) {
    return (
      <main className="account-page">
        <h1>アカウント情報</h1>
        <p>読み込み中…</p>
        <style jsx>{styles}</style>
      </main>
    );
  }

  // ✅ 防止闪一下空白/错误渲染
  if (!isAuthenticated) {
    return (
      <main className="account-page">
        <h1>アカウント情報</h1>
        <p>ログイン画面へ移動しています…</p>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="account-page">
      <h1>アカウント情報</h1>

      <div className="account-info">
        <p>
          <strong>ユーザー名前:</strong> {user?.name ?? ""}
        </p>
        <p>
          <strong>メールアドレス:</strong> {user?.email ?? ""}
        </p>
        <p>
          <strong>パスワード:</strong> {maskedPassword}
        </p>
      </div>

      <button className="logout-btn" onClick={logout}>
        ログアウト
      </button>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
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
`;
