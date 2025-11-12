"use client";

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  readCart,
  changeQty as cartChangeQty,
  removeItem as cartRemoveItem,
  totals as cartTotals,
} from "@/utils/cart";

type ViewItem = {
  id: string;
  name: string;
  price?: number; // 现在假设为 USD
  imageUrl?: string;
  qty: number;
};

// 你也可以保留这个 Intl 格式器（此处未直接使用）
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// ✅ 统一的“US $xxx.xx”加粗显示
const formatUSD = (n: number) =>
  `US $${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const FX_USD_JPY = 155; // 1 USD = ¥155（可按需调整）
const SHIPPING_USD_FLAT = 24; // ✅ 快递费固定为 24 美金

// ✅ 每页展示的商品种类数
const PAGE_SIZE = 5;

export default function CartPage() {
  // ----- 顶部搜索 -----
  const [searchInput, setSearchInput] = useState("");

  const router = useRouter();

  // ----- 原始购物车（与 localStorage 对齐）-----
  const [rawItems, setRawItems] = useState<ViewItem[]>([]);

  // ✅ 分页：当前页（从 1 开始）
  const [page, setPage] = useState(1);

  // 首次加载 + 同步（storage + BroadcastChannel）
  useEffect(() => {
    // 初次加载
    setRawItems(safeRead());

    // 跨标签页同步
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart") {
        setRawItems(safeRead());
      }
    };
    window.addEventListener("storage", onStorage);

    // 同标签页/同路由组件间同步
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("swish-cart");
      bc.onmessage = (ev) => {
        if (ev.data?.type === "cart-updated") {
          setRawItems(safeRead());
        }
      };
    } catch {
      // BroadcastChannel 不可用时忽略
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      bc?.close();
    };
  }, []);

  // 读取工具函数的结果，并做最小视图映射
  function safeRead(): ViewItem[] {
    const items = readCart();
    return items.map((it: any) => ({
      id: it.id,
      name: it.name ?? "",
      price: typeof it.price === "number" ? it.price : 0, // 假设为 USD
      imageUrl: it.imageUrl ?? it.image ?? "/images/card.png",
      qty: Math.max(0, Number(it.qty ?? 0)),
    }));
  }

  // —— 数量增减 / 删除（用 utils，并回填本地状态）——
  const changeQty = useCallback((id: string, delta: number) => {
    const next = cartChangeQty(id, delta); // 写入存储并返回最新数组

    // 找到该商品的新数量
    const target = next.find((it: any) => it.id === id);
    const newQty = Number(target?.qty ?? 0);

    if (!target || newQty <= 0) {
      // 数量归零（或已不存在）→ 直接删除并刷新视图
      cartRemoveItem(id);
      setRawItems(safeRead());
      return;
    }

    // 正常回填视图
    setRawItems(
      next.map((it: any) => ({
        id: it.id,
        name: it.name ?? "",
        price: typeof it.price === "number" ? it.price : 0,
        imageUrl: it.imageUrl ?? it.image ?? "/images/card.png",
        qty: Math.max(0, Number(it.qty ?? 0)),
      }))
    );
  }, []);

  // ----- 右上邮编 & 统一运费 -----
  const [postcode, setPostcode] = useState("100-0001");
  const normalizePostcode = (v: string) => {
    const digits = v.replace(/[^\d]/g, "").slice(0, 7);
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  };

  // ✅ 运费：有商品固定 24 美金，否则 0
  const shippingUSD = useMemo(() => {
    return rawItems.length ? SHIPPING_USD_FLAT : 0;
  }, [rawItems.length]);

  // ----- 搜索（仅过滤“视图”，不改写存储）-----
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const kw = searchInput.trim().toLowerCase();
    if (!kw) {
      setRawItems(safeRead());
    } else {
      const source = safeRead();
      setRawItems(
        source.filter((it) => (it.name ?? "").toLowerCase().includes(kw))
      );
    }
    // ✅ 搜索后回到第一页
    setPage(1);
  };

  // ✅ 分页计算
  const totalPages = Math.max(1, Math.ceil(rawItems.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rawItems.slice(start, start + PAGE_SIZE);
  }, [rawItems, page]);

  // ✅ 当 rawItems 变化导致总页数变小，夹紧当前页
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (rawItems.length === 0 && page !== 1) setPage(1);
  }, [rawItems.length, totalPages, page]);

  // ----- 小计（USD）-----
  const itemsTotalUSD = useMemo(
    () => rawItems.reduce((s, it) => s + (it.price ?? 0) * it.qty, 0),
    [rawItems]
  );
  const totalQty = useMemo(
    () => rawItems.reduce((s, it) => s + it.qty, 0),
    [rawItems]
  );

  const grandTotalUSD = itemsTotalUSD + shippingUSD;

  // 灰字：按汇率换算的 JPY
  const grandTotalJPYText = useMemo(() => {
    const jpy = Math.round(grandTotalUSD * FX_USD_JPY);
    return `JPY ¥${jpy.toLocaleString("ja-JP")}`;
  }, [grandTotalUSD]);

  const year = new Date().getFullYear();

  // ✅ 页信息（X–Y of N）
  const startIndex = rawItems.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(page * PAGE_SIZE, rawItems.length);

  return (
    <div className="min-h-screen w-full bg-white text-black">
      {/* 搜索栏 */}
      <section className="mx-auto max-w-[1200px] px-4 pt-6 mb-[80px]">
        <form
          onSubmit={handleSearchSubmit}
          className="flex w-full gap-3"
          role="search"
          aria-label="検索"
        >
          <div className="relative flex-1">
            <span
              className="absolute left-[14px] top-1/2 -translate-y-1/2 inline-flex"
              aria-hidden
            >
              <Search className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </span>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="1998 Michael Jordan..."
              className="w-full bg-[#e5e7eb] rounded-full text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black pl-11 pr-3 py-3"
              aria-label="検索キーワード"
            />
          </div>
          <button
            type="submit"
            className="min-w-[110px] px-6 py-3 bg-black text-white font-semibold rounded-full hover:brightness-90"
          >
            検索
          </button>
        </form>
      </section>
      {/* 主体 */}
      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <div className="flex justify-center gap-10">
          {/* 左：商品列表 */}
          <section className="w-[868px]" aria-label="ショッピングカート">
            {pageItems.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                カートは空です。
              </div>
            ) : (
              <>
                {pageItems.map((it, idx) => (
                  <article
                    key={it.id}
                    className="w-[868px] h-[200px] rounded-2xl border border-[#eee] p-6 flex items-center ]"
                    style={{ marginTop: idx === 0 ? 0 : 20 }}
                  >
                    {/* 缩略图 */}
                    <div className="w-[120px] h-[120px] rounded-3xl bg-[#efefef] overflow-hidden flex items-center justify-center flex-none">
                      <img
                        src={it.imageUrl ?? "/images/card.png"}
                        alt={it.name}
                        className="w-[46px] h-auto object-contain"
                      />
                    </div>

                    {/* 右侧 */}
                    <div className="ml-[12px] flex-1">
                      <div className="h-[120px] flex flex-col justify-between">
                        <h3 className="text-[16px] leading-6 font-semibold line-clamp-2">
                          {it.name}
                        </h3>

                        <div className="flex items-end">
                          {/* 数量控制 */}
                          <div
                            className="flex items-center select-none"
                            aria-label={`数量調整: ${it.name}`}
                          >
                            <button
                              aria-label="减少数量"
                              onClick={() => changeQty(it.id, -1)}
                              className="w-8 h-8 rounded-full bg-[#efefef] text-[#999] inline-flex items-center justify-center text-xl leading-none hover:opacity-40 transition-opacity"
                            >
                              -
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
                              className="w-8 h-8 rounded-full bg-[#efefef] text-[#999] inline-flex items-center justify-center text-xl leading-none hover:opacity-40 transition-opacity"
                            >
                              +
                            </button>
                          </div>

                          <div className="w-[20px]" />

                          {/* 行金额：加粗 US $xxx.xx */}
                          <div className="text-[18px]">
                            <strong className="font-bold">
                              {formatUSD((it.price ?? 0) * it.qty)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {/* ✅ 分页条 */}
                {rawItems.length > PAGE_SIZE && (
                  <nav
                    className="mt-6 flex items中心 justify-between"
                    aria-label="ページネーション"
                  >
                    <div className="text-sm text-[#666]">
                      {rawItems.length
                        ? `${startIndex}–${endIndex} / ${rawItems.length}`
                        : "0 / 0"}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-9 px-3 rounded-lg border border-[#ddd] disabled:opacity-40"
                        aria-label="前のページ"
                      >
                        ←
                      </button>

                      {/* 数字页码 */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (n) => (
                          <button
                            key={n}
                            onClick={() => setPage(n)}
                            aria-current={page === n ? "page" : undefined}
                            className={[
                              "h-9 w-9 rounded-full border",
                              page === n
                                ? "bg-black text-white border-black"
                                : "border-[#ddd] hover:bg-[#f7f7f7]",
                            ].join(" ")}
                          >
                            {n}
                          </button>
                        )
                      )}

                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className="h-9 px-3 rounded-lg border border-[#ddd] disabled:opacity-40"
                        aria-label="次のページ"
                      >
                        →
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </section>

          {/* 右：摘要 */}
          <aside className="w-[292px]" aria-label="注文概要">
            {/* 商品总价（USD） */}
            <div className="flex items-start justify-between">
              <div className="text-[16px] leading-8 font-medium">
                アイテム<span className="text-[#999]">({totalQty})</span>
              </div>
              <div className="text-[16px] leading-8">
                <strong className="font-bold">
                  {formatUSD(itemsTotalUSD)}
                </strong>
              </div>
            </div>

            {/* 配送费（固定 24 美金） */}
            <div className="mt-4 flex items-center justify-between">
              <label className="text-[16px] leading-8 font-medium">
                <span className="align-middle">{postcode}</span>への配送
              </label>
              <div className="text-[16px] leading-8">
                <strong className="font-bold">{formatUSD(shippingUSD)}</strong>
              </div>
            </div>
            <input
              value={postcode}
              onChange={(e) => setPostcode(normalizePostcode(e.target.value))}
              placeholder="郵便番号を入力 (例: 100-0001)"
              className="w-full rounded-xl border border-[#ddd] px-3 py-2 text-[10px] mt-2"
              inputMode="numeric"
              aria-label="配送先の郵便番号"
            />

            {/* 虚线 */}
            <div
              className="mt-5 border-t border-dashed"
              style={{ borderTopColor: "#dcdcdc", borderTopWidth: 1 }}
            />

            {/* 小计（USD） + 灰字换算（JPY） */}
            <div className="mt-5 flex items-start justify-between">
              <div className="text-[24px] leading-[36px] font-semibold">
                小計
              </div>
              <div className="text-right" aria-live="polite">
                <div className="text-[28px] leading-[36px]">
                  <strong className="font-bold">
                    {formatUSD(grandTotalUSD)}
                  </strong>
                </div>
                {/* ✅ 灰色小字：按汇率换算的日元 */}
                <div className="mt-[6px] text-[18px] text-[#666]">
                  {grandTotalJPYText}
                </div>
              </div>
            </div>

            <div
              className="mt-5 border-t border-dashed"
              style={{ borderTopColor: "#dcdcdc", borderTopWidth: 1 }}
            />

            <button
              className="block mx-auto mt-5 w-[292px] h-[56px] rounded-[40px] bg-black text-white text-[16px] font-semibold disabled:opacity-50 hover:opacity-80 transition-opacity duration-200"
              onClick={() => router.push("/checkout")}
              disabled={rawItems.length === 0}
            >
              チェックアウトに移動
            </button>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#eee] mt-10">
        <div className="mx-auto max-w-[1200px] px-4 py-5 flex items-center justify-between text-[#666] text-sm">
          <div>© {year} SWISH. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <a className="hover:underline" href="#">
              Terms
            </a>
            <span className="text-[#bbb]">·</span>
            <a className="hover:underline" href="#">
              Privacy
            </a>
            <span className="text-[#bbb]">·</span>
            <a className="hover:underline" href="#">
              Help
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
