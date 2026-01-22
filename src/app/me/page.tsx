'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFavorites } from '@/lib/favorites';
import { toggleFavorite } from '@/lib/card_actions';

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

async function fetchCardById(cardId: string): Promise<CardLite> {
  const res = await fetch(`/api/cards/${cardId}`, { cache: 'no-store' });
  if (!res.ok) return { id: cardId };

  const data = await res.json();

  return {
    id: cardId,
    title: data.title ?? data.name ?? data.cardTitle ?? data.itemTitle,
    price: data.price ?? data.currentPrice ?? data.amount,
    imageUrl: data.imageUrl ?? data.img ?? data.image ?? data.thumbnailUrl,
  };
}

export default function MePage(): React.ReactElement {
  const [active, setActive] = useState<PanelKey>('p-profile');
  const [showPw, setShowPw] = useState(false);

  const { favorites, loading } = useFavorites() as {
    favorites: Set<string>;
    loading: Set<string> | boolean;
  };

  const favIds = useMemo(() => Array.from(favorites ?? []), [favorites]);

  const [favCards, setFavCards] = useState<Record<string, CardLite>>({});
  const [favCardsLoading, setFavCardsLoading] = useState(false);

  const [hiddenFavs, setHiddenFavs] = useState<Set<string>>(new Set());

  const viewFavIds = useMemo(
    () => favIds.filter((id) => !hiddenFavs.has(id)),
    [favIds, hiddenFavs]
  );

  async function removeFav(id: string) {
    setHiddenFavs((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setFavCards((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      await toggleFavorite(id);
    } catch {
      setHiddenFavs((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!viewFavIds || viewFavIds.length === 0) {
        setFavCards({});
        setHiddenFavs(new Set());
        return;
      }

      const missing = viewFavIds.filter((id) => !favCards[id]);
      if (missing.length === 0) return;

      setFavCardsLoading(true);
      try {
        const results = await Promise.all(missing.map((id) => fetchCardById(id)));
        if (cancelled) return;

        setFavCards((prev) => {
          const next = { ...prev };
          for (const card of results) next[card.id] = card;
          return next;
        });
      } finally {
        if (!cancelled) setFavCardsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // 🔴 关键修复：绝对不要把 favCards 放进依赖
  }, [viewFavIds.join('|')]);

  return (
    <>
      <main className="wrap">
        <nav className="sidenav" aria-label="アカウントメニュー">
          <button className={`nav-btn ${active === 'p-profile' ? 'active' : ''}`} onClick={() => setActive('p-profile')} type="button">個人情報</button>
          <button className={`nav-btn ${active === 'p-favs' ? 'active' : ''}`} onClick={() => setActive('p-favs')} type="button">お気に入り</button>
          <button className={`nav-btn ${active === 'p-address' ? 'active' : ''}`} onClick={() => setActive('p-address')} type="button">住所</button>
          <button className={`nav-btn ${active === 'p-settings' ? 'active' : ''}`} onClick={() => setActive('p-settings')} type="button">設定</button>
        </nav>

        <section className={`panel ${active === 'p-profile' ? 'active' : ''}`}>
          <div className="section">
            <div>
              <label>名前</label>
              <input className="input" placeholder="ユーザー名を入力してください" />
            </div>
            <div>
              <label>メールアドレス</label>
              <input className="input" placeholder="example@example.com" />
            </div>
            <div className="pw-wrap">
              <label>パスワード</label>
              <input className="input" type={showPw ? 'text' : 'password'} placeholder="パスワードを入力してください" />
              <button className="pw-toggle" type="button" onClick={() => setShowPw(v => !v)}>👁</button>
            </div>
            <div className="actions"><button className="btn">保存</button></div>
          </div>
        </section>

        <section className={`panel ${active === 'p-favs' ? 'active' : ''}`}>
          <h2>お気に入り</h2>

          {((loading instanceof Set && loading.size > 0) || loading === true) && <p>読み込み中…</p>}
          {!((loading instanceof Set && loading.size > 0) || loading === true) && viewFavIds.length === 0 && <p>お気に入りはありません。</p>}

          {viewFavIds.length > 0 && (
            <>
              {favCardsLoading && <p style={{ color: '#6b7280' }}>カード情報を取得中…</p>}
              <div className="fav-list">
                {viewFavIds.map((id) => {
                  const card = favCards[id];
                  return (
                    <article className="card" key={id}>
                      <div className="thumb"><img src={card?.imageUrl ?? '/pic/card.png'} /></div>
                      <div className="meta">
                        <div className="title">{card?.title ?? `カードID: ${id}`}</div>
                        <div className="chip-row">
                          <span>◎ 1 点</span>
                          {card?.price && <span className="price">{card.price}</span>}
                          <button className="sub" type="button" onClick={() => removeFav(id)}>お気に入りから削除</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className={`panel ${active === 'p-address' ? 'active' : ''}`}>
          <div className="section" style={{ maxWidth: 640 }}>
            <label>国家</label>
            <select className="select"><option>日本</option><option>中国</option><option>United States</option></select>
            <label>郵便番号</label>
            <input className="input" placeholder="例：166-0002" />
            <div className="row-2">
              <input className="input" placeholder="例：東京都杉並区" />
              <input className="input" placeholder="例：4-32-9" />
            </div>
            <label>住所</label>
            <input className="input" placeholder="例：ジュネス5 303号室" />
            <div className="actions"><button className="btn">保存</button></div>
          </div>
        </section>

        <section className={`panel ${active === 'p-settings' ? 'active' : ''}`}>
          <div className="section">
            <label>言語</label>
            <select className="select"><option>日本語</option><option>English</option><option>中文</option></select>
            <div className="actions"><button className="btn">サインアウト</button></div>
          </div>
        </section>
      </main>
    </>

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

