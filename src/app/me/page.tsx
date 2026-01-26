'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFavorites } from '@/lib/favorites';
import { useAuth, authFetch } from '@/lib/client_auth';
import { useRouter } from 'next/navigation';

type PanelKey = 'p-profile' | 'p-favs' | 'p-address' | 'p-settings';

type CardLite = {
  id: string;
  title?: string;
  price?: string | number;
  imageUrl?: string;
};

// ✅ 改：用 authFetch + 兼容 data 包裹 + 更稳的 imageUrl 提取
async function fetchCardById(cardId: string, signal?: AbortSignal): Promise<CardLite> {
  const res = await authFetch(`/api/cards/${encodeURIComponent(cardId)}`, {
    cache: 'no-store',
    signal,
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!res.ok) return { id: String(cardId) };

  const json = await res.json();

  // ✅ 兼容常见结构：{data:{...}} / {data:{card:{...}}} / 直接 {...}
  const data = json?.data?.card ?? json?.data ?? json?.card ?? json;

  // ✅ 兼容各种图片字段（尽量都吃）
  const imageUrl =
    data?.imageUrl ??
    data?.img ??
    data?.image ??
    data?.thumbnailUrl ??
    data?.frontImageUrl ??
    data?.frontImage ??
    data?.front ??
    data?.images?.[0]?.url ??
    data?.images?.[0] ??
    data?.card?.imageUrl ??
    data?.card?.img ??
    data?.card?.image ??
    undefined;

  return {
    // ✅ 永远用请求的 cardId 做 key，避免后端返回结构导致覆盖
    id: String(cardId),
    title: data?.title ?? data?.name ?? data?.cardTitle ?? data?.itemTitle,
    price: data?.price ?? data?.currentPrice ?? data?.amount,
    imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
  };
}

export default function MePage(): React.ReactElement {
  const router = useRouter();

  const [active, setActive] = useState<PanelKey>('p-profile');
  const [showPw, setShowPw] = useState(false);

  const authAny = useAuth() as any;
  const { user, isAuthenticated } = authAny as { user?: any; isAuthenticated?: boolean };

  // ✅ 兼容 logout / signOut / signout
  const doLogout: undefined | (() => Promise<void> | void) =
    authAny?.logout ?? authAny?.signOut ?? authAny?.signout;

  const { toggleFavorite } = useFavorites();

  // ✅ me 页面自己维护 favorites id（不依赖 hook 内 state）
  const [favIds, setFavIds] = useState<string[]>([]);
  const [favIdsLoading, setFavIdsLoading] = useState(false);

  // ✅ 把“读不到”的原因显示出来
  const [favIdsError, setFavIdsError] = useState<string | null>(null);

  const cacheRef = useRef<Record<string, CardLite>>({});
  const [favCards, setFavCards] = useState<Record<string, CardLite>>({});
  const [favCardsLoading, setFavCardsLoading] = useState(false);

  const favKey = useMemo(() => favIds.slice().sort().join('|'), [favIds]);

  // ✅ 强制刷新收藏 id：进入 fav 面板就拉一次
  const refreshFavIds = async () => {
    setFavIdsError(null);

    if (!isAuthenticated || !user) {
      setFavIds([]);
      setFavIdsError('未ログインのため、お気に入りを表示できません。');
      return;
    }

    setFavIdsLoading(true);
    try {
      const res = await authFetch(`/api/users/${user.id}/favorites?pageSize=50`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setFavIds([]);
        setFavIdsError(
          `お気に入り取得に失敗しました（${res.status}）${text ? `: ${text}` : ''}`
        );
        return;
      }

      const data = await res.json();

      // ✅ 兼容多种返回结构（fav.card.id / fav.cardId / fav.card_id）
      const raw = data?.data?.favorites ?? data?.favorites ?? [];
      const ids = (raw as any[])
        .map((f) => {
          const id = f?.card?.id ?? f?.cardId ?? f?.card_id ?? f?.cardID ?? f?.id;
          return id == null ? null : String(id);
        })
        .filter(Boolean) as string[];

      setFavIds(ids);
    } catch (e: any) {
      setFavIds([]);
      setFavIdsError(`お気に入り取得で例外が発生しました: ${e?.message ?? String(e)}`);
    } finally {
      setFavIdsLoading(false);
    }
  };

  // ✅ 切到 “お気に入り” 时刷新：清缓存，避免旧缓存挡住新数据
  useEffect(() => {
    if (active === 'p-favs') {
      cacheRef.current = {};
      setFavCards({});
      refreshFavIds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isAuthenticated, user?.id]);

  // ✅ 拉卡片详情（更稳：永远用 missing[i] 当 key，避免覆盖成同一张图）
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

        const nextCache: Record<string, CardLite> = { ...cacheRef.current };
        for (let i = 0; i < missing.length; i++) {
          const key = String(missing[i]);
          nextCache[key] = results[i] ?? { id: key };
        }

        cacheRef.current = nextCache;
        setFavCards(nextCache);
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

        {/* ✅ お気に入り */}
        <section className={`panel ${active === 'p-favs' ? 'active' : ''}`}>
          {isBusy && <p>読み込み中…</p>}

          {!isBusy && favIdsError && <p style={{ color: '#ef4444' }}>{favIdsError}</p>}

          {!isBusy && !favIdsError && favIds.length === 0 && (
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
                              await toggleFavorite(id);
                              // ✅ 强制刷新列表：以数据库为准
                              cacheRef.current = {};
                              setFavCards({});
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

        {/* ✅ 設定（加入登出 + 回首页） */}
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
                <button
                  className="btn"
                  type="button"
                  onClick={async () => {
                    try {
                      if (typeof doLogout === 'function') {
                        await doLogout();
                      } else {
                        // fallback：如果你有 logout API
                        await authFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
                      }
                    } finally {
                      router.push('/');
                      // 可选：让 header/导航立刻刷新登录态
                      try {
                        router.refresh?.();
                      } catch {}
                    }
                  }}
                >
                  サインアウト
                </button>
              </div>
            </div>
          </div>
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

