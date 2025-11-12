"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

interface RecommendedCard {
  id: string;
  name: string;
  player: string;
  team: string;
  year: number;
  brand: string;
  condition: string;
  rarity: string;
  price?: number;
  imageUrl?: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

const RecommendedCards: React.FC = () => {
  const [cards, setCards] = useState<RecommendedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // ❤️ 收藏逻辑
  const { toggleFavorite, isFavorited, isLoading, isAuthenticated } =
    useFavorites();

  useEffect(() => {
    const fetchRecommendedCards = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/cards/recommended");
        const data = await response.json();

        if (data.success) {
          setCards(data.data.recommendations);
        } else {
          setError(data.error || "Failed to fetch recommended cards");
        }
      } catch (err) {
        setError("Failed to fetch recommended cards");
        console.error("Error fetching recommended cards:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedCards();
  }, []);

  const formatPrice = (price?: number) => {
    if (!price) return "Price not set";
    return `$${price.toFixed(2)}`;
  };

  const getCardDescription = (card: RecommendedCard) => {
    return `${card.year} ${card.brand} ${card.player} - ${card.team}`;
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-3xl font-bold mb-6">おすすめのアイテム</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative w-full bg-gray-100 rounded-[32px] py-6 px-6 flex flex-col items-center animate-pulse">
                <div className="absolute top-5 right-5 w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="w-full h-48 bg-gray-200 rounded-2xl"></div>
              </div>
              <div className="w-full text-left mt-3">
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-3xl font-bold mb-6">おすすめのアイテム</h2>
        <div className="text-center py-8">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div>
        <h2 className="text-3xl font-bold mb-6">おすすめのアイテム</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">只今おすすめのアイテムがありません。</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">おすすめのアイテム</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {cards.map((card) => {
          const favId = card.id.toString();
          const fav = isFavorited(favId);
          const favLoading = isLoading(favId);

          return (
            <div
              key={card.id}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => router.push(`/cards/${card.id}`)}
            >
              <div className="relative w-full bg-gray-100 rounded-[32px] py-6 px-6 flex flex-col items-center">
                {/* ❤️ 收藏按钮（白色圆底、未收藏灰线空心、收藏后红色实心） */}
                <button
                  type="button"
                  className={`absolute top-5 right-5 w-10 h-10 bg-white rounded-full flex items-center justify-center transition-all duration-300 z-10 focus:outline-none ${
                    favLoading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-110"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止触发整卡片跳转
                    if (!favLoading) toggleFavorite(favId);
                  }}
                  title={
                    !isAuthenticated
                      ? "Login to add to favorites"
                      : fav
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                  aria-label={
                    !isAuthenticated
                      ? "Login to add to favorites"
                      : fav
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                >
                  {favLoading ? (
                    <div className="w-[18px] h-[18px] border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                  ) : (
                    <Heart
                      className={`w-5 h-5 transition-all duration-300 ${
                        fav
                          ? "fill-red-500 text-red-500"
                          : "fill-none text-gray-400"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </button>

                {/* 卡片图片 */}
                <Image
                  src={card.imageUrl || "/images/cards/1.png"}
                  alt={getCardDescription(card)}
                  width={300}
                  height={192}
                  className="w-full h-48 object-contain"
                  style={{ borderRadius: 16 }}
                />
              </div>

              {/* 文案区 */}
              <div className="w-full text-left mt-3">
                <div className="text-gray-400 text-xs mb-1">{card.brand}</div>
                <div className="text-black text-sm font-normal mb-2">
                  {getCardDescription(card)}
                </div>
                <div className="text-black text-xl font-bold">
                  {formatPrice(card.price)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendedCards;
