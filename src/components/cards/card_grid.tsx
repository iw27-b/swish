"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

interface ProductItem {
  id: number;
  cardId?: string;
  image: string;
  category: string;
  title: string;
  price: string;
  href?: string;
}

interface CardGridProps {
  products: ProductItem[];
}

const CardGrid: React.FC<CardGridProps> = ({ products }) => {
  const { toggleFavorite, isFavorited, isLoading, isAuthenticated } =
    useFavorites();

  return (
    <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6 justify-items-center">
      {products.map((product) => {
        const cardId = product.cardId || product.id.toString();
        const favorited = isFavorited(cardId);
        const loading = isLoading(cardId);

        return (
          <section key={cardId} className="w-full max-w-[285px] relative">
            {/* 收藏按钮固定在卡片右上角 */}
            <button
              type="button"
              className={`absolute top-[15px] right-[10px] w-10 h-10 bg-white rounded-full flex items-center justify-center transition-all duration-300 z-10 focus:outline-none
    ${loading ? "opacity-50 cursor-not-allowed" : "hover:scale-110"}`}
              onClick={() => !loading && toggleFavorite(cardId)}
              title={
                !isAuthenticated
                  ? "Login to add to favorites"
                  : favorited
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
              aria-label={
                !isAuthenticated
                  ? "Login to add to favorites"
                  : favorited
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
            >
              {loading ? (
                <div className="w-[18px] h-[18px] border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <Heart
                  className={`w-5 h-5 transition-all duration-300
        ${favorited ? "fill-red-500 text-red-500" : "fill-none text-gray-400"}`}
                  aria-hidden="true"
                />
              )}
            </button>

            {/* 整块 hover：把交互加在整张卡片上 */}
            <Link
              href={product.href || "#"}
              className="group no-underline text-inherit block"
            >
              <article
                className="w-full rounded-2xl bg-white transition-transform duration-300]
                           focus-within:-translate-y-1 focus-within:shadow-[0_10px_20px_rgba(0,0,0,0.12)]
                           outline-none"
              >
                {/* 图像区：不再做 hover 浮起，把动效交给整卡片 */}
                <div className="w-full aspect-square rounded-2xl flex justify-center items-center bg-[#f7f7f7] p-4">
                  <div className="relative w-[85%] h-[85%]">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-contain rounded-lg"
                    />
                  </div>
                </div>

                {/* 文案区 */}
                <div className="px-1.5 pb-3 pt-2">
                  <small className="text-sm text-gray-400 block">
                    {product.category}
                  </small>
                  <h3 className="text-sm text-black leading-[1.4] my-[0.3rem]">
                    {product.title}
                  </h3>
                  <p className="text-xl text-black font-bold my-[0.3rem]">
                    {product.price}
                  </p>
                </div>
              </article>
            </Link>
          </section>
        );
      })}
    </div>
  );
};

export default CardGrid;
