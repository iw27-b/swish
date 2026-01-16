'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/client_auth';
import AccountInfo from '@/components/me/account_info';

export default function AccountPage(): React.ReactElement {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // ✅ 未登录就去登录页，并带 next 回来
      router.replace('/auth/login?next=/me');
    }
  }, [loading, isAuthenticated, router]);

  const maskedPassword = useMemo(() => {
    return user ? '••••••••' : '';
  }, [user]);

  if (loading) {
    return (
      <main className="account-page">
        <h1>アカウント情報</h1>
      </main>
    );
  }

  return (
    <main className="account-page">
      <h1>アカウント情報</h1>

      <AccountInfo
        username={user?.name ?? null}
        email={user?.email ?? null}
        passwordMasked={maskedPassword}
        onLogout={logout}
      />

      <button className="logout-btn" onClick={logout}>
        ログアウト
      </button>

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
