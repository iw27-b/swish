'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFavorites } from '@/lib/favorites';

type PanelKey = 'p-profile' | 'p-favs' | 'p-address' | 'p-settings';

type CardLite = {
  id: string;
  title?: string;
  price?: string | number;
  imageUrl?: string;
  name?: string;
  img?: string;
  image?: string;
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

  // ✅ 完全匹配你贴的 useFavorites()
  const { favorites, loading, isAuthenticated, toggleFavorite } = useFavorites();

  // ✅ Set<string> -> string[]，并保持稳定顺序
  const favIds = useMemo(() => Array.from(favorites).map(String).sort(), [favorites]);
  const favKey = useMemo(() => favIds.join('|'), [favIds]);

  // ✅ 卡片详情缓存：ref 防止 effect 依赖导致循环
  const cacheRef = useRef<Record<string, CardLite>>({});
  const [favCards, setFavCards] = useState<Record<string, CardLite>>({});
  const [favCardsLoading, setFavCardsLoading] = useState(false);

  // ✅ 当收藏列表变化时，拉取缺失的卡片详情
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      // 未登录：你的 hook 会 setFavorites(new Set())，这里顺手清空显示
      if (!isAuthenticated || favIds.length === 0) {
        cacheRef.current = {};
        setFavCards({});
        return;
      }

      const missing = favIds.filter((id) => !cacheRef.current[id]);
      if (missing.length === 0) {
        // 仍然同步一次（避免 cache 与 state 不一致）
        setFavCards({ ...cacheRef.current });
        return;
      }

      setFavCardsLoading(true);
      try {
        const results = await Promise.all(
          missing.map((id) => fetchCardById(id, controller.signal))
        );
        if (cancelled) return;

        for (const c of results) {
          cacheRef.current[String(c.id)] = c;
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
  }, [favKey, isAuthenticated]);

  const isBusy = loading instanceof Set ? loading.size > 0 : Boolean(loading);

  return (
    <>
      <main className="wrap">
        {/* 左侧导航 */}
        <nav className="sidenav" aria-label="アカウントメニュー">
          <button
            className={`nav-btn ${active === 'p-profile' ? 'active' : ''}`}
            onClick={() => setActive('p-profile')}
            type="button"
          >
            個人情報
          </button>
          <button
            className={`nav-btn ${active === 'p-favs' ? 'active' : ''}`}
            onClick={() => setActive('p-favs')}
            type="button"
          >
            お気に入り
          </button>
          <button
            className={`nav-btn ${active === 'p-address' ? 'active' : ''}`}
            onClick={() => setActive('p-address')}
            type="button"
          >
            住所
          </button>
          <button
            className={`nav-btn ${active === 'p-settings' ? 'active' : ''}`}
            onClick={() => setActive('p-settings')}
            type="button"
          >
            設定
          </button>
        </nav>

        {/* 個人情報 */}
        <section className={`panel ${active === 'p-profile' ? 'active' : ''}`}>
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
              <button
                className="pw-toggle"
                type="button"
                aria-label="パスワード表示切替"
                onClick={() => setShowPw((v) => !v)}
              >
                👁
              </button>
            </div>

            <div className="actions" style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn" type="button">
                保存
              </button>
            </div>
          </div>
        </section>

        {/* お気に入り */}
        <section className={`panel ${active === 'p-favs' ? 'active' : ''}`}>
          <h2></h2>

          {!isAuthenticated && (
            <p style={{ color: '#6b7280' }}>
              お気に入りを表示するにはログインが必要です。
            </p>
          )}

          {isAuthenticated && isBusy && <p>読み込み中…</p>}

          {isAuthenticated && !isBusy && favIds.length === 0 && (
            <p>お気に入りはまだありません。</p>
          )}

          {isAuthenticated && favIds.length > 0 && (
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                            onClick={() => toggleFavorite(String(id))}
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

        {/* 住所 */}
        <section className={`panel ${active === 'p-address' ? 'active' : ''}`}>
          <div className="section" style={{ maxWidth: 640 }}>
            <div>
              <label htmlFor="country">国家</label>
              <select id="country" className="select">
                <option>日本</option>
                <option>中国</option>
                <option>United States</option>
              </select>
            </div>

            <div>
              <label htmlFor="zip">郵便番号</label>
              <input id="zip" className="input" placeholder="例：1660002" />
            </div>

            <div className="row-2">
              <div>
                <label htmlFor="city">都市・区</label>
                <input id="city" className="input" placeholder="例：東京・杉並区" />
              </div>
              <div>
                <label htmlFor="block">番地</label>
                <input id="block" className="input" placeholder="例：4-32-9" />
              </div>
            </div>

            <div>
              <label htmlFor="addr">住所</label>
              <input id="addr" className="input" placeholder="例：ジュネス５ 303室" />
            </div>

            <div className="actions" style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn" type="button">
                保存
              </button>
            </div>
          </div>
        </section>

        {/* 設定 */}
        <section className={`panel ${active === 'p-settings' ? 'active' : ''}`} id="p-settings">
          <div className="section" style={{ maxWidth: 520 }}>
            <div>
              <label htmlFor="lang">言語</label>
              <select id="lang" className="select">
                <option>日本語</option>
                <option>English</option>
                <option>中文</option>
              </select>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="actions" style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="btn" type="button">
                  サインアウト
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 样式 */}
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


