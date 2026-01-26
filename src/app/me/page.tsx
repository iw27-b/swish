'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFavorites } from '@/lib/favorites';
import { useAuth, authFetch } from '@/lib/client_auth';

type PanelKey = 'p-profile' | 'p-favs' | 'p-address' | 'p-settings';

type CardLite = {
  id: string;
  title?: string;
  price?: string | number;
  imageUrl?: string;
};

async function fetchCardById(cardId: string, signal?: AbortSignal): Promise<CardLite> {
  const res = await fetch(`/api/cards/${cardId}`, { cache: 'no-store', signal });
  if (!res.ok) return { id: String(cardId) };

  const data = await res.json();
  return {
    id: String(cardId),
    title: data.title ?? data.name ?? data.cardTitle ?? data.itemTitle,
    price: data.price ?? data.currentPrice ?? data.amount,
    imageUrl: data.imageUrl ?? data.img ?? data.image ?? data.thumbnailUrl,
  };
}

export default function MePage(): React.ReactElement {
  const [active, setActive] = useState<PanelKey>('p-profile');
  const [showPw, setShowPw] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const { toggleFavorite } = useFavorites();

  // ✅ me 页面自己维护 favorites id（不依赖 hook 内 state）
  const [favIds, setFavIds] = useState<string[]>([]);
  const [favIdsLoading, setFavIdsLoading] = useState(false);

  const cacheRef = useRef<Record<string, CardLite>>({});
  const [favCards, setFavCards] = useState<Record<string, CardLite>>({});
  const [favCardsLoading, setFavCardsLoading] = useState(false);

  const favKey = useMemo(() => favIds.slice().sort().join('|'), [favIds]);

  // ✅ 强制刷新收藏 id：进入 fav 面板就拉一次
  async function refreshFavIds() {
    if (!isAuthenticated || !user) {
      setFavIds([]);
      return;
    }
    setFavIdsLoading(true);
    try {
      const res = await authFetch(`/api/users/${user.id}/favorites?pageSize=50`);
      if (!res.ok) {
        setFavIds([]);
        return;
      }
      const data = await res.json();
      const ids = (data?.data?.favorites ?? [])
        .map((f: any) => String(f?.card?.id))
        .filter(Boolean);
      setFavIds(ids);
    } finally {
      setFavIdsLoading(false);
    }
  }

  // ✅ 切到 “お気に入り” 时刷新
  useEffect(() => {
    if (active === 'p-favs') {
      refreshFavIds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isAuthenticated, user?.id]);

  // ✅ 拉卡片详情（只拉缺失的）
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      if (favIds.length === 0) {
        cacheRef.current = {};
        setFavCards({});
        return;
      }

      const missing = favIds.filter((id) => !cacheRef.current[id]);
      if (missing.length === 0) {
        setFavCards({ ...cacheRef.current });
        return;
      }

      setFavCardsLoading(true);
      try {
        const results = await Promise.all(
          missing.map((id) => fetchCardById(id, controller.signal))
        );
        if (cancelled) return;

        for (const card of results) {
          cacheRef.current[String(card.id)] = card;
        }
        setFavCards({ ...cacheRef.current });
      } finally {
        if (!cancelled) setFavCardsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [favKey]);

  const isBusy = favIdsLoading;

  return (
    <>
      <main className="wrap">
        <nav className="sidenav" aria-label="アカウントメニュー">
          <button className={`nav-btn ${active === 'p-profile' ? 'active' : ''}`} onClick={() => setActive('p-profile')} type="button">
            個人情報
          </button>
          <button className={`nav-btn ${active === 'p-favs' ? 'active' : ''}`} onClick={() => setActive('p-favs')} type="button">
            お気に入り
          </button>
          <button className={`nav-btn ${active === 'p-address' ? 'active' : ''}`} onClick={() => setActive('p-address')} type="button">
            住所
          </button>
          <button className={`nav-btn ${active === 'p-settings' ? 'active' : ''}`} onClick={() => setActive('p-settings')} type="button">
            設定
          </button>
        </nav>

        {/* 個人情報（原样保留） */}
        <section className={`panel ${active === 'p-profile' ? 'active' : ''}`}>
          {/* ...你原来的 profile UI 不动... */}
          <div className="section">
            <div>
              <label htmlFor="name">名前</label>
              <input id="name" className="input" placeholder="ユーザー名を入力してください" />
            </div>

            <div>
              <label htmlFor="email">メールアドレス</label>
              <input id="email" className="input" placeholder="example@example.com" />
            </div>

            <div className="pw-wrap">
              <label htmlFor="pw">パスワード</label>
              <input
                id="pw"
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="パスワードを入力してください"
              />
              <button className="pw-toggle" type="button" aria-label="パスワード表示切替" onClick={() => setShowPw((v) => !v)}>
                👁
              </button>
            </div>

            <div className="actions" style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn" type="button">保存</button>
            </div>
          </div>
        </section>

        {/* ✅ お気に入り：只改这里的逻辑 */}
        <section className={`panel ${active === 'p-favs' ? 'active' : ''}`}>
          {isBusy && <p>読み込み中…</p>}

          {!isBusy && favIds.length === 0 && (
            <p style={{ color: '#6b7280' }}>お気に入りはまだありません。</p>
          )}

          {favIds.length > 0 && (
            <>
              {favCardsLoading && <p style={{ color: '#6b7280' }}>カード情報を取得中…</p>}

              <div className="fav-list">
                {favIds.map((id) => {
                  const card = favCards[id];
                  const title = card?.title ?? `カードID: ${id}`;
                  const price = card?.price ?? '';
                  const imgSrc = card?.imageUrl ?? '/pic/card.png';

                  return (
                    <article className="card" key={id}>
                      <div className="thumb">
                        <img src={imgSrc} alt="カード画像" />
                      </div>

                      <div className="meta">
                        <div className="title">{title}</div>

                        <div className="chip-row">
                          <span>◎ 1 点</span>
                          {price !== '' && <span className="price">{price}</span>}

                          <button
                            className="sub"
                            type="button"
                            onClick={async () => {
                              await toggleFavorite(id);   // 删除
                              await refreshFavIds();      // ✅ 强制刷新列表
                            }}
                            style={{
                              background: 'transparent',
                              border: '0',
                              padding: 0,
                              cursor: 'pointer',
                              color: '#6b7280',
                              textDecoration: 'underline',
                            }}
                          >
                            お気に入りから削除
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* 住所 / 設定：你原样保留即可 */}
        <section className={`panel ${active === 'p-address' ? 'active' : ''}`}>
          {/* ...原样... */}
        </section>

        <section className={`panel ${active === 'p-settings' ? 'active' : ''}`} id="p-settings">
          {/* ...原样... */}
        </section>
      </main>


      <style jsx global>{`
        :root {
          --bg: #ffffff;
          --muted: #6b7280;
          --border: #e5e7eb;
          --primary: #111111;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: 'Noto Sans JP', system-ui, -apple-system, Roboto, Arial;
          background: var(--bg);
          color: #111;
        }
        .wrap {
          max-width: 1100px;
          margin: 32px auto;
          padding: 0 16px;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 40px;
        }
        .sidenav {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .nav-btn {
          padding: 12px 16px;
          border-radius: 9999px;
          border: 1px dashed #e6e6e6;
          background: #fff;
          font-weight: 600;
          cursor: pointer;
        }
        .nav-btn.active {
          background: #111;
          color: #fff;
        }
        .panel {
          display: none;
        }
        .panel.active {
          display: block;
        }
        .section {
          display: grid;
          gap: 14px;
          max-width: 520px;
        }
        .row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        label {
          font-weight: 700;
          font-size: 14px;
        }
        .input,
        .select {
          width: 100%;
          height: 44px;
          padding: 10px 12px;
          background: #ededed;
          border: 1.5px solid var(--border);
          border-radius: 12px;
        }
        .btn {
          height: 48px;
          min-width: 200px;
          border-radius: 9999px;
          background: var(--primary);
          color: #fff;
          font-weight: 700;
          border: 0;
          cursor: pointer;
        }
        .pw-wrap {
          position: relative;
        }
        .pw-toggle {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: #fff;
          cursor: pointer;
        }
        .fav-list {
          display: grid;
          gap: 12px;
        }
        .card {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 16px;
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: #fff;
        }
        .thumb {
          width: 96px;
          height: 96px;
          overflow: hidden;
          border-radius: 14px;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </>
  );
}

