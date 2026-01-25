"use client";

import React, { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client_auth";
import { addToCart, isInCart } from "@/utils/cart";
import LoadingSpinner from "@/components/loading_spinner";

interface CardPageProps {
  params: Promise<{ cardId: string }>; // ✅ Next.js 15 params 是 Promise
}

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
  price?: number;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: CardOwner;
}

const CART_KEY = "cart";

function readCart(): Array<(Card & { qty: number }) | any> {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeCart(items: any[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {}
}

/** 将商品写入本地 cart：若存在则 qty+1；否则新增 { ...card, qty: 1 } */
function upsertLocalCart(card: Card) {
  const items = readCart();
  const idx = items.findIndex((it: any) => it.id === card.id);
  if (idx >= 0) {
    const next = [...items];
    const old = next[idx];
    next[idx] = { ...old, qty: Math.max(0, (old.qty ?? 0) + 1) };
    writeCart(next);
    return next[idx].qty as number;
  } else {
    const next = [...items, { ...card, qty: 1 }];
    writeCart(next);
    return 1;
  }
}

export default function CardPage({ params }: CardPageProps) {
  const { cardId } = use(params); // ✅ 解包 Promise
  const router = useRouter();
  const { user } = useAuth();

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false); // ✅ 是否已加入购物车（控制按钮文案/行为）

  // 轻提示（仅保留错误用）
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 2200);
  };

  const [searchInput, setSearchInput] = useState("");
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search:", searchInput);
  };

  // ✅ 预取购物车页面
  useEffect(() => {
    router.prefetch?.("/cart");
  }, [router]);

  // 大图状态
  const [mainImage, setMainImage] = useState<string>("");

  // 拉取单卡数据
  useEffect(() => {
    const fetchCard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cards/${cardId}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Failed to fetch card ${cardId}`);

        const data = await response.json();
        const cardData: Card | null = data.data ?? data.card ?? null;
        setCard(cardData);

        // 初始化大图
        if (cardData?.imageUrl) {
          setMainImage(cardData.imageUrl);
        } else {
          setMainImage("/images/card.png");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [cardId]);

  // ✅ 卡片加载后检查是否已在购物车中，已存在则直接显示「カートで見る」
  useEffect(() => {
    if (!card?.id || !user) return;

    const checkCart = async () => {
      const inCart = await isInCart(card.id);
      if (inCart) setAddedToCart(true);
    };

    checkCart();
  }, [card?.id, user]);

  // —— 操作：加入购物车（首次点击变更按钮，不弹 toast）/ 再次点击跳转 ——
  const handleAddToCart = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!card?.id) {
      console.error("Card ID is not found: ", card?.id);
      showToast("商品情報が見つかりません。", "error");
      return;
    }

    // 若已在购物车中：直接前往购物车
    if (addedToCart) {
      router.push("/cart");
      return;
    }

    setAddingToCart(true);
    // show toast if error to help debug
    const result = await addToCart(card.id);

    if (result.success) {
      setAddedToCart(true);
    } else {
      showToast(result.message || "カート追加に失敗しました。", "error");
      console.error("Error adding to cart: ", result.message);
    }
    setAddingToCart(false);
  };

  // —— 操作：今すぐ購入（写入后直接进入 /cart） ——
  const handleBuyNow = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!card?.id) {
      console.error("Card ID is not found: ", card?.id);
      showToast("商品情報が見つかりません。", "error");
      return;
    }

    setAddingToCart(true);
    // show toast if error to help debug
    const result = await addToCart(card.id);

    if (!result.success) {
      showToast(result.message || "カート追加に失敗しました。", "error");
      console.error("Error adding to cart: ", result.message);
    }

    setAddingToCart(false);
    router.push("/cart");
  };

  if (loading) {
    return <p style={{ textAlign: "center", padding: "40px" }}>Loading...</p>;
  }

  if (error) {
    return (
      <p style={{ color: "red", textAlign: "center", padding: "40px" }}>
        {error}
      </p>
    );
  }

  if (!card) {
    return <p style={{ textAlign: "center" }}>Card not found</p>;
  }

  const usd =
    typeof card?.price === "number"
      ? `US $${card.price.toFixed(2)}`
      : "Price on request";

  // 「カートに入れる」按钮的文案与样式切换
  const addBtnLabel = addedToCart ? "カートで見る" : "カートに入れる";
  const addBtnClasses = [
    "w-[292px] h-14 rounded-[40px] text-sm font-bold text-center leading-14 cursor-pointer mb-3 disabled:opacity-50 disabled:cursor-not-allowed border transition-opacity hover:opacity-40",
    addedToCart
      ? "bg-white text-black border-black"
      : "bg-white text-black border-black",
  ].join(" ");

  return (
    <div className="min-h-screen font-sans text-black">
      {/* 🔔 轻提示（仅错误） */}
      {toast && (
        <div
          role="status"
          className={[
            "fixed right-4 top-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm",
            toast.type === "success"
              ? "bg-black text-white"
              : "bg-red-600 text-white",
          ].join(" ")}
        >
          {toast.msg}
        </div>
      )}

      {/* 🔍 搜索框 */}
      <div className="mb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <form onSubmit={handleSearchSubmit} className="mb-16 w-full">
          <div className="flex w-full">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                🔍
              </span>
              <input
                type="text"
                placeholder="1998 Michael Jordan..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 pr-4 py-3 w-full bg-gray-200 rounded-full border-none focus:ring-2 focus:ring-black text-base placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              className="ml-3 px-8 py-3 bg-black text-white rounded-full font-semibold text-base hover:bg-gray-900 transition-all shadow-sm min-w-[110px]"
            >
              検索
            </button>
          </div>
        </form>
      </div>

      {/* 📄 卡片详情 */}
      <div className="min-h-screen pt-8 font-sans">
        <main className="max-w-[1200px] h-[520px] mx-auto flex gap-6 bg-white rounded-lg p-6 box-border">
          {/* 缩略图 */}
          <ul className="flex flex-col gap-5 p-0 m-0 list-none">
            {[
              card.imageUrl || "/images/card.png",
              card.imageUrl || "/images/card.png",
              card.imageUrl || "/images/card.png",
            ].map((img, idx) => (
              <li
                key={idx}
                className="w-[92px] h-[92px] bg-gray-100 rounded-3xl flex items-center justify-center overflow-hidden shadow-sm"
              >
                <img
                  className="max-w-[50%] max-h-[60%] object-contain cursor-pointer transition-transform hover:scale-105"
                  src={img}
                  alt={`thumbnail-${idx}`}
                  onClick={() => setMainImage(img)}
                />
              </li>
            ))}
          </ul>

          {/* 大图 */}
          <div className="flex-1 flex justify-center items-center w-[756px] h-[520px] rounded-[40px] bg-gray-100">
            <img
              className="w-[250px] h-[472px] object-cover block mx-auto shadow-lg"
              src={mainImage}
              alt={card.name}
            />
          </div>

          {/* 卡片信息 */}
          <div className="w-[292px] h-[520px] font-sans text-black">
            <p className="text-2xl font-bold leading-8 m-0">{card.name}</p>
            <p className="text-base text-gray-500 mt-4 mb-0">
              {card.brand} {card.year}
            </p>
            <hr className="border-0 border-t border-dotted border-gray-500 w-[292px] my-5" />
            <p className="text-[28px] font-bold text-black m-0 mb-10">{usd}</p>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-base text-gray-500">Grade</span>
                <span className="text-base font-bold text-black">
                  {card.condition}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base text-gray-500">Team</span>
                <span className="text-base font-bold text-black">
                  {card.team}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-base text-gray-500">Rarity</span>
                <span className="text-base font-bold text-black">
                  {card.rarity}
                </span>
              </div>
            </div>

            <hr className="border-0 border-t border-dotted border-gray-500 w-[292px] my-5" />

            <button
              onClick={handleBuyNow}
              disabled={addingToCart || !card.isForSale}
              className="w-[292px] h-14 rounded-[40px] text-sm font-bold text-center leading-14 cursor-pointer mb-3 bg-black text-white border border-black transition-opacity hover:opacity-40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToCart ? <LoadingSpinner /> : "今すぐ購入"}
            </button>

            <button
              onClick={handleAddToCart}
              disabled={addingToCart || !card.isForSale}
              className={addBtnClasses}
            >
              {addingToCart ? <LoadingSpinner /> : addBtnLabel}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
