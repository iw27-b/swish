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
};

async function fetchCardById(cardId: string): Promise<CardLite> {
  const res = await fetch(`/api/cards/${cardId}`, { cache: 'no-store' });
  if (!res.ok) return { id: cardId };

  const raw = await res.json();

  if (process.env.NODE_ENV === 'development') {
    console.log('[api/cards/:id]', raw);
  }

  const c = raw?.card ?? raw?.data ?? raw?.item ?? raw ?? {};

  const title =
    c.title ??
    c.name ??
    c.cardTitle ??
    c.itemTitle ??
    c.card_title ??
    c.item_title ??
    c.productTitle ??
    c.product_title;

  let price: string | number | undefined =
    c.price ??
    c.currentPrice ??
    c.amount ??
    c.current_price ??
    c.price_amount ??
    c.priceAmount;

  const cents =
    c.priceCents ?? c.price_cents ?? c.amountCents ?? c.amount_cents;

  if (price == null && typeof cents === 'number') {
    price = cents / 100;
  }

  const imageUrl =
    c.imageUrl ??
    c.image_url ??
    c.img ??
    c.image ??
    c.thumbnailUrl ??
    c.thumbnail_url ??
    c.thumb ??
    c.thumb_url ??
    c.coverImage ??
    c.cover_image ??
    c.imagePath ??
    c.image_path ??
    c.imageKey ??
    c.image_key ??
    (Array.isArray(c.images) ? (c.images[0]?.url ?? c.images[0]) : undefined) ??
    (Array.isArray(c.imageUrls) ? c.imageUrls[0] : undefined);

  return { id: cardId, title, price, imageUrl };
}

export default function MePage(): React.ReactElement {
  const [active, setActive] = useState<PanelKey>('p-profile');
  const [showPw, setShowPw] = useState(false);

  const { favorites, loading } = useFavorites() as {
    favorites: Set<string>;
    loading: Set<string>;
  };

  const favIds = useMemo(() => Array.from(favorites ?? []), [favorites]);

  const [favCards, setFavCards] = useState<Record<string, CardLite>>({});
  const [favCardsLoading, setFavCardsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setFavCards((prev) => {
        const next: Record<string, CardLite> = {};
        for (const id of favIds) {
          if (prev[id]) next[id] = prev[id];
        }
        return next;
      });

      if (favIds.length === 0) return;

      const missing = favIds.filter((id) => !favCards[id]);
      if (missing.length === 0) return;

      setFavCardsLoading(true);
      try {
        const results = await Promise.all(
          missing.map((id) => fetchCardById(id))
        );
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
  }, [favIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* 个⼈信息 */}
        <section className={`panel ${active === 'p-profile' ? 'active' : ''}`}>
          <div className="section">
            <label>名前</label>
            <input className="input" placeholder="ユーザー名" />

            <label>メールアドレス</label>
            <input className="input" placeholder="example@example.com" />

            <div className="pw-wrap">
              <label>パスワード</label>
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="********"
              />
              <button
                className="pw-toggle"
                type="button"
                onClick={() => setShowPw((v) => !v)}
              >
                👁
              </button>
            </div>

            <button className="btn">保存</button>
          </div>
        </section>

        {/* お気に入り */}
        <section className={`panel ${active === 'p-favs' ? 'active' : ''}`}>
          <h2>お気に入り</h2>

          {loading.size > 0 && <p>読み込み中…</p>}
          {loading.size === 0 && favIds.length === 0 && (
            <p>お気に入りはありません。</p>
          )}

          <div className="fav-list">
            {favIds.map((id) => {
              const card = favCards[id];
              return (
                <article className="card" key={id}>
                  <div className="thumb">
                    <img
                      src={card?.imageUrl ?? '/pic/card.png'}
                      alt=""
                    />
                  </div>
                  <div>
                    <div className="title">
                      {card?.title ?? `カードID: ${id}`}
                    </div>
                    {card?.price && (
                      <div className="price">{card.price}</div>
                    )}
                    <button
                      className="sub"
                      onClick={() => toggleFavorite(id)}
                    >
                      お気に入りから削除
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 地址 */}
        <section className={`panel ${active === 'p-address' ? 'active' : ''}`}>
          <div className="section">
            <label>住所</label>
            <input className="input" placeholder="東京都…" />
            <button className="btn">保存</button>
          </div>
        </section>

        {/* 设置（只保留按钮，没有标题） */}
        <section className={`panel ${active === 'p-settings' ? 'active' : ''}`}>
          <div className="section">
            <label>言語</label>
            <select className="select">
              <option>日本語</option>
              <option>English</option>
              <option>中文</option>
            </select>

            <button className="btn">サインアウト</button>
          </div>
        </section>
      </main>

      <style jsx global>{`
        body {
          font-family: 'Noto Sans JP', sans-serif;
        }
        .wrap {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 40px;
          max-width: 1100px;
          margin: 32px auto;
        }
        .sidenav {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .nav-btn {
          border-radius: 9999px;
          padding: 12px;
          border: 1px dashed #ddd;
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
        .input,
        .select {
          height: 44px;
          border-radius: 12px;
          padding: 0 12px;
          background: #eee;
        }
        .btn {
          height: 48px;
          border-radius: 9999px;
          background: #111;
          color: #fff;
          font-weight: bold;
        }
        .fav-list {
          display: grid;
          gap: 12px;
        }
        .card {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 16px;
          border: 1px solid #eee;
          padding: 16px;
          border-radius: 20px;
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


