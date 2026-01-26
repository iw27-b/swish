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

/**
 * ✅ 不改其他文件的前提下，尽可能把“收藏ID列表”找出来
 * 优先级：
 * 1) useFavorites 暴露的 favorites / favoriteIds / ids
 * 2) localStorage 扫描（找 key 包含 favorite 的，解析出数组/Set）
 * 3) /api/favorites（如果存在）
 */
function getIdsFromHook(fav: any): string[] | null {
  const raw = fav?.favorites ?? fav?.favoriteIds ?? fav?.ids;
  if (!raw) return null;

  if (raw instanceof Set) return Array.from(raw).map(String);
  if (Array.isArray(raw)) return raw.map(String);

  return null;
}

function tryParseIds(value: string): string[] | null {
  // 可能是 JSON 数组：["1","2"]
  // 可能是 JSON 对象：{"ids":["1","2"]} 或 {"favorites":["1"]}
  // 可能是逗号字符串："1,2,3"
  try {
    const j = JSON.parse(value);
    if (Array.isArray(j)) return j.map(String);
    if (j && typeof j === 'object') {
      const maybeArr = (j.ids ?? j.favorites ?? j.items ?? j.data) as unknown;
      if (Array.isArray(maybeArr)) return maybeArr.map(String);
    }
  } catch {
    // ignore
  }

  if (value.includes(',')) {
    const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts.map(String);
  }

  return null;
}

function getIdsFromLocalStorage(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const keys = Object.keys(localStorage);
    // 找所有可能的收藏key（更宽松：包含 fav / favorite / favourites）
    const cand = keys.filter((k) =>
      /fav|favorite|favourite/i.test(k)
    );

    for (const k of cand) {
      const v = localStorage.getItem(k);
      if (!v) continue;
      const ids = tryParseIds(v);
      if (ids && ids.length) return ids;
    }
  } catch {
    // ignore
  }
  return null;
}

async function getIdsFromApi(): Promise<string[] | null> {
  try {
    const res = await fetch('/api/favorites', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();

    // 兼容：["1","2"] 或 { ids: [...] } 或 { favorites: [...] }
    if (Array.isArray(data)) return data.map(String);
    if (data && typeof data === 'object') {
      const arr = data.ids ?? data.favorites ?? data.items;
      if (Array.isArray(arr)) return arr.map(String);
    }
  } catch {
    // ignore
  }
  return null;
}

export default function MePage(): React.ReactElement {
  const [active, setActive] = useState<PanelKey>('p-profile');
  const [showPw, setShowPw] = useState(false);

  // ✅ 仍然用你的 favorites 系统（Card页也在用它）
  const fav = useFavorites() as any;
  const toggleFavorite: (cardId: string) => Promise<void> | void = fav?.toggleFavorite;
  const loading = fav?.loading; // 兼容：Set<string> | boolean
  const isBusy = (loading instanceof Set && loading.size > 0) || loading === true;

  // ✅ Me 页自己维护收藏ID列表（关键）
  const [favIds, setFavIds] = useState<string[]>([]);

  // ✅ 刷新收藏ID来源（hook -> localStorage -> api）
  const refreshFavIds = async () => {
    const fromHook = getIdsFromHook(fav);
    if (fromHook && fromHook.length) {
      setFavIds(fromHook);
      return;
    }

    const fromLS = getIdsFromLocalStorage();
    if (fromLS && fromLS.length) {
      setFavIds(fromLS);
      return;
    }

    const fromApi = await getIdsFromApi();
    if (fromApi && fromApi.length) {
      setFavIds(fromApi);
      return;
    }

    setFavIds([]);
  };

  // 初次加载 + 切到 fav 面板时刷新一次
  useEffect(() => {
    refreshFavIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active === 'p-favs') refreshFavIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // 跨 tab 同步 / 从别页返回同步
  useEffect(() => {
    const onStorage = () => refreshFavIds();
    const onFocus = () => refreshFavIds();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 卡片详情缓存（避免反复请求）
  const cacheRef = useRef<Record<string, CardLite>>({});
  const [favCards, setFavCards] = useState<Record<string, CardLite>>({});
  const [favCardsLoading, setFavCardsLoading] = useState(false);

  const favKey = useMemo(() => favIds.slice().sort().join('|'), [favIds]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      if (favIds.length === 0) {
        cacheRef.current = {};
        setFavCards({});
        return;
      }

      const missing = favIds.filter((id) => !cacheRef.current[String(id)]);
      if (missing.length === 0) {
        setFavCards({ ...cacheRef.current });
        return;
      }

      setFavCardsLoading(true);
      try {
        const results = await Promise.all(
          missing.map((id) => fetchCardById(String(id), controller.signal))
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

        {/* お気に入り（✅ 动态） */}
        <section className={`panel ${active === 'p-favs' ? 'active' : ''}`}>
          <h2></h2>

          {isBusy && <p>読み込み中…</p>}

          {!isBusy && favIds.length === 0 && <p>お気に入りはまだありません。</p>}

          {favIds.length > 0 && (
            <>
              {favCardsLoading && <p style={{ color: '#6b7280' }}>カード情報を取得中…</p>}

              <div className="fav-list">
                {favIds.map((id) => {
                  const card = favCards[String(id)];
                  const title = card?.title ?? `カードID: ${id}`;
                  const price = card?.price ?? '';
                  const imgSrc = card?.imageUrl ?? '/pic/card.png';

                  return (
                    <article className="card" key={String(id)}>
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
                            onClick={async () => {
                              // ✅ 删除后也立刻刷新列表
                              await toggleFavorite?.(String(id));
                              await refreshFavIds();
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

