'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/client_auth';
import AccountInfo from '@/components/me/account_info';

export default function AccountPage(): React.ReactElement {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();

  // 未登录时跳转到登录页（避免死循环）
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login'); // ← 如果你们登录页不是这个路径，改这里
    }
  }, [loading, isAuthenticated, router]);

  // 掩码密码
  const maskedPassword = useMemo(() => {
    return user ? '••••••••' : null;
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

      {/* ✅ 按 AccountInfoProps 正确传参 */}
      <AccountInfo
        username={user?.name ?? null}
        email={user?.email ?? null}
        passwordMasked={maskedPassword}
        onLogout={logout}
      />

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
      `}</style>
    </main>
  );
}
>
    );
}


