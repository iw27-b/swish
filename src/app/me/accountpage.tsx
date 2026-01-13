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
      router.replace('me');
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

      {/* 旧版里有引入 AccountInfo（你截图第6行被删掉的那行） */}
      <AccountInfo user={user} maskedPassword={maskedPassword} />

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

