'use client';

import React, { use, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import "./style.css";

interface CardPageProps {
  params: Promise<{ cardId: string }>; // ✅ Next.js 15 params 是 Promise
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
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

export default function CardPage({ params }: CardPageProps) {
  const { cardId } = use(params); // ✅ 解包 Promise
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 搜索框状态
  const [searchInput, setSearchInput] = useState("");

    const [liked, setLiked] = useState(false);
  const toggleLike = () => {
    setLiked(!liked);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Search:", searchInput);
    // TODO: 这里可以做跳转或者搜索 API 请求
  };

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
        const cardData = data.data ?? data.card ?? null;
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

  return (
    <div>
      {/* 🔍 搜索框 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <form onSubmit={handleSearchSubmit} className="mb-8 w-full">
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
                style={{ borderRadius: "9999px" }}
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

      {/* 📄 卡片详情 */}
      <div className="page">
        <main className="gallery">
          {/* 缩略图 */}
          <ul className="thumbnails">
            {[card.imageUrl || "/images/card.png",
              card.imageUrl || "/images/card.png",
              card.imageUrl || "/images/card.png"].map((img, idx) => (
              <li key={idx}>
                <img
                  className="thumbnail"
                  src={img}
                  alt={`thumbnail-${idx}`}
                  onClick={() => setMainImage(img)} // ✅ React 方式切换大图
                />
              </li>
            ))}
          </ul>

          {/* 大图 */}
          {/* 大图 + 收藏按钮 */}
<div className="main-image relative">
  {/* 收藏按钮 */}
  <div
    onClick={toggleLike}
    role="button"
    aria-pressed={liked}
    aria-label={liked ? '取消收藏' : '收藏'}
    className="absolute top-[15px] right-[15px] w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 z-10 hover:scale-105 hover:opacity-80"
  >
    <Heart
      className={`w-5 h-5 transition-colors duration-200 ${liked ? 'text-red-500 fill-current' : 'text-gray-400'}`}
      fill={liked ? 'currentColor' : 'none'}
      aria-hidden="true"
    />
  </div>

  {/* 大图 */}
  <img id="main-image" src={mainImage} alt={card.name} />
</div>


          {/* 卡片信息 */}
          <div className="introduce">
            <p className="title">{card.name}</p>
            <p className="subtitle">
              {card.brand} {card.year}
            </p>
            <hr className="divider2" />
            <p className="price">
              {card.price ? `US $${card.price.toFixed(2)}` : "Price on request"}
            </p>

            <div className="info">
              <div className="row">
                <span className="label">Grade</span>
                <span className="value">{card.condition}</span>
              </div>
              <div className="row">
                <span className="label">Team</span>
                <span className="value">{card.team}</span>
              </div>
              <div className="row">
                <span className="label">Rarity</span>
                <span className="value">{card.rarity}</span>
              </div>
            </div>

            <hr className="divider2" />

            <button className="btn primary">今すぐ購入</button>
            <button className="btn secondary">カートに入れる</button>
          </div>
        </main>
      </div>
    </div>
  );
}
