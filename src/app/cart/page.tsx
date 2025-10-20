"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  FormEvent,
  useCallback,
} from "react";
import { Trash2 } from "lucide-react";

interface CardOwner {
  id: string;
  name: string;
  email: string;
}

interface Card {
  id: string;
  name: string;
  player: string;
  team: string;
  year: number;
  brand: string;
  cardNumber: string;
  condition: string;
  rarity: string;
  description?: string;
  imageUrl?: string;
  isForTrade: boolean;
  isForSale: boolean;
  price?: number; // USD
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: CardOwner;
}

type AnyCartItem =
  | (Card & { qty: number })
  | { id: string; name: string; price?: number; image?: string; qty: number };

// 固定汇率（与后端保持一致）
const USD_TO_JPY = 155;

const JPY = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
});

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const CART_KEY = "cart";

export default function CartPageTSX() {
  const [postcode, setPostcode] = useState("100-0001");
  const [rawItems, setRawItems] = useState<AnyCartItem[]>([]);
  const [searchInput, setSearchInput] = useState("");

  const viewItems = useMemo(() => {
    return rawItems.map((it) => {
      const img =
        "image" in it && it.image
          ? it.image
          : "imageUrl" in it
          ? it.imageUrl
          : undefined;
      const price = typeof it.price === "number" ? it.price : 0; // USD
      const name = it.name ?? "";
      const id = it.id as string;
      const qty = (it as any).qty ?? 0;
      return { id, name, price, image: img ?? "/images/card.png", qty };
    });
  }, [rawItems]);

  const SHIPPING_FLAT = useMemo(
    () => (viewItems.length ? 800 : 0), // JPY
    [viewItems.length]
  );

  const totalQty = useMemo(
    () => viewItems.reduce((s, it) => s + it.qty, 0),
    [viewItems]
  );

  // 统一按 USD 累加 → 固定汇率换算为 JPY
  const itemsTotalUSD = useMemo(
    () => viewItems.reduce((s, it) => s + it.qty * it.price, 0),
    [viewItems]
  );
  const itemsTotalJPY = Math.round(itemsTotalUSD * USD_TO_JPY);
  const grandTotal = itemsTotalJPY + SHIPPING_FLAT;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const stored: AnyCartItem[] = raw ? JSON.parse(raw) : [];
      setRawItems(Array.isArray(stored) ? stored : []);
    } catch {
      setRawItems([]);
    }
  }, []);

  const persist = useCallback((items: AnyCartItem[]) => {
    setRawItems(items);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {}
  }, []);

  const changeQty = useCallback(
    (id: string, delta: number) => {
      persist(
        rawItems
          .map((it) =>
            it.id === id
              ? { ...it, qty: Math.max(0, (it as any).qty + delta) }
              : it
          )
          .filter((it) => (it as any).qty > 0)
      );
    },
    [rawItems, persist]
  );

  const removeItem = useCallback(
    (id: string) => {
      persist(rawItems.filter((it) => it.id !== id));
    },
    [rawItems, persist]
  );

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const kw = searchInput.trim().toLowerCase();
    if (!kw) {
      try {
        const raw = localStorage.getItem(CART_KEY);
        const stored: AnyCartItem[] = raw ? JSON.parse(raw) : [];
        setRawItems(Array.isArray(stored) ? stored : []);
      } catch {
        setRawItems([]);
      }
    } else {
      try {
        const raw = localStorage.getItem(CART_KEY);
        const source: AnyCartItem[] = raw ? JSON.parse(raw) : [];
        setRawItems(
          source.filter((it) => (it.name ?? "").toLowerCase().includes(kw))
        );
      } catch {
        setRawItems([]);
      }
    }
  };

  useEffect(() => {
    const assert = (name: string, cond: boolean) =>
      console[cond ? "log" : "error"](
        `[Test ${cond ? "Passed" : "Failed"}]`,
        name
      );
    assert(
      "qty never negative",
      rawItems.every((it) => (it as any).qty >= 0)
    );
    assert(
      "derived totals are numbers",
      Number.isFinite(itemsTotalJPY) && Number.isFinite(grandTotal)
    );
  }, [rawItems, itemsTotalJPY, grandTotal]);

  const normalizePostcode = (v: string) => {
    const digits = v.replace(/[^\d]/g, "").slice(0, 7);
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  };

  return (
    <div className="min-h-screen w-full bg-white text-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <form
          onSubmit={handleSearchSubmit}
          className="mb-8 w-full"
          role="search"
          aria-label="検索"
        >
          <div className="flex w-full">
            <div className="relative flex-1">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                aria-hidden
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="1998 Michael Jordan..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 pr-4 py-3 w-full bg-gray-200 rounded-full border-none focus:ring-2 focus:ring-black text-base placeholder-gray-400"
                style={{ borderRadius: "9999px" }}
                aria-label="検索キーワード"
              />
            </div>
            <button
              type="submit"
              className="ml-3 px-8 py-3 bg-black text-white rounded-full font-semibold text-base hover:bg-gray-900 transition-all shadow-sm"
              style={{ borderRadius: "9999px", minWidth: "110px" }}
            >
              検索
            </button>
          </div>
        </form>
      </div>

      {/* 主体：按给定 HTML/CSS 对齐 */}
      <main className="mx-auto max-w-[1200px] px-4 py-10">
        <div className="flex justify-center gap-10">
          {/* 左：商品列表（宽 868px） */}
          <section className="w-[868px]" aria-label="购物车商品列表">
            {viewItems.length === 0 ? (
              <div className="text-center text-[#666] py-16">
                カートは空です。
              </div>
            ) : (
              viewItems.map((it, idx) => (
                <article
                  key={it.id}
                  className="w-[868px] h-[200px] rounded-[16px] border border-[#eee] p-6 flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.06),_0_8px_24px_rgba(0,0,0,0.04)]"
                  style={{ marginTop: idx === 0 ? 0 : 20 }}
                >
                  {/* 缩略图 120×120 */}
                  <div className="w-[120px] h-[120px] rounded-[16px] bg-[#f7f7f7] overflow-hidden flex items-center justify-center flex-none">
                    <img
                      src={it.image}
                      alt={it.name}
                      className="w-[120px] h-[120px] object-cover block"
                    />
                  </div>

                  {/* 右侧内容 与缩略图相距12px，高度 120 */}
                  <div className="ml-[12px] flex-1 h-[120px] flex flex-col justify-between">
                    {/* 商品名：18/24，2 行截断 */}
                    <h3 className="text-[18px] leading-6 font-semibold overflow-hidden line-clamp-2">
                      {it.name}
                    </h3>

                    {/* 底部数量与价格 与缩略图下对齐 */}
                    <div className="flex items-end">
                      {/* 数量控制 */}
                      <div
                        className="flex items-center select-none"
                        aria-label={`数量調整: ${it.name}`}
                      >
                        <button
                          aria-label="减少数量"
                          onClick={() => changeQty(it.id, -1)}
                          className="w-8 h-8 rounded-full border border-[#ddd] inline-flex items-center justify-center text-[20px] leading-none bg-white hover:bg-[#f5f5f5]"
                        >
                          −
                        </button>
                        <span
                          className="mx-3 min-w-[2ch] text-center text-[16px] font-semibold"
                          aria-live="polite"
                        >
                          {it.qty}
                        </span>
                        <button
                          aria-label="增加数量"
                          onClick={() => changeQty(it.id, +1)}
                          className="w-8 h-8 rounded-full border border-[#ddd] inline-flex items-center justify-center text-[20px] leading-none bg-white hover:bg-[#f5f5f5]"
                        >
                          ＋
                        </button>
                      </div>

                      {/* 数量与价格左右间距 20px */}
                      <div className="w-[20px] flex-none" />
                      <div className="text-right">
                        <div className="text-[18px] font-semibold">
                          {USD.format(it.price * it.qty)}
                        </div>
                      </div>

                      <button
                        aria-label="删除此商品"
                        onClick={() => removeItem(it.id)}
                        className="ml-4 inline-flex items-center gap-1 text-sm text-[#666] hover:text-red-600"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                        削除
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* 右：总计（宽 292px，无大矩形，仅内容对齐） */}
          <aside className="w-[292px]" aria-label="订单总计">
            <div className="w-[292px]">
              {/* アイテム小計（美元） */}
              <div className="flex items-start justify-between">
                <div className="text-[16px] leading-8 font-medium">
                  アイテム<span className="text-[#999]">({totalQty})</span>
                </div>
                <div className="text-[16px] leading-8 font-bold">
                  {USD.format(itemsTotalUSD)} {/* ← 改为美元 */}
                </div>
              </div>

              {/* 配送费（美元表示） */}
              <div className="mt-4 flex items-start justify-between">
                <label className="text-[16px] leading-8 font-medium">
                  <span className="align-middle">{postcode}</span>への配送
                </label>
                <div className="text-[16px] leading-8 font-bold">
                  {USD.format(SHIPPING_FLAT / USD_TO_JPY)}{" "}
                  {/* ← 日元转回美元显示 */}
                </div>
              </div>

              <input
                value={postcode}
                onChange={(e) => setPostcode(normalizePostcode(e.target.value))}
                placeholder="郵便番号を入力 (例: 100-0001)"
                className="w-full mt-2 rounded-full border border-[#ddd] px-4 py-2 text-[14px] bg-white"
                inputMode="numeric"
                aria-label="配送先の郵便番号"
                style={{ borderRadius: "9999px" }}
              />

              <div
                className="mt-5 border-t border-dashed"
                style={{ borderTopColor: "#dcdcdc", borderTopWidth: 1 }}
              />

              {/* 小計块 */}
              <div className="mt-5 flex items-start justify-between">
                <div className="text-[28px] leading-[28px] font-bold">小計</div>
                <div className="text-right" aria-live="polite">
                  {/* 美元总额 */}
                  <div className="text-[28px] leading-9 font-[800]">
                    {USD.format(itemsTotalUSD + SHIPPING_FLAT / USD_TO_JPY)}
                  </div>
                  {/* ≈日元总额 */}
                  <div className="mt-[6px] text-[16px] leading-7 text-[#666]">
                    JPY {grandTotal.toLocaleString("ja-JP")}
                  </div>
                </div>
              </div>

              <div
                className="mt-5 border-t border-dashed"
                style={{ borderTopColor: "#dcdcdc", borderTopWidth: 1 }}
              />

              <button
                className="block mx-auto mt-5 w-[292px] h-[56px] rounded-full bg-black text-white text-[16px] font-bold disabled:opacity-50"
                onClick={() => alert("チェックアウトに移動")}
                disabled={viewItems.length === 0}
                style={{ borderRadius: "9999px" }}
              >
                チェックアウトに移動
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
