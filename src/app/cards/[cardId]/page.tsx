'use client';

import React, { useEffect, useState } from "react";
import $ from "jquery";
import "./style.css"; // 确保 style.css 在同目录下

interface CardPageProps {
  params: { cardId: string }; // ✅ 跟文件夹 [cardId] 保持一致
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
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 缩略图点击切换大图
  useEffect(() => {
    const handler = (event: JQuery.ClickEvent) => {
      const src = (event.currentTarget as HTMLImageElement).src;
      $("#main-image").fadeOut(300, function () {
        $("#main-image").attr("src", src).fadeIn(300);
      });
    };

    $(".thumbnail").on("click", handler);

    return () => {
      $(".thumbnail").off("click", handler); // ✅ 避免重复绑定
    };
  }, [card]);

  // 拉取单卡数据
  useEffect(() => {
    const fetchCard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cards/${params.cardId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch card ${params.cardId}`);
        }

        const data = await response.json();
        // ✅ 兼容 { data: card } 或 { card: card }
        setCard(data.data ?? data.card ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [params.cardId]);

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
      <header className="header">
        <div className="container">
          <div className="logo">
            <a href="/">SWISH</a>
          </div>
          <nav className="nav">
            <span>ホーム</span>
            <div className="divider">|</div>
            <span>最新情報</span>
            <div className="divider">|</div>
            <span>チーム紹介</span>
          </nav>
          <div className="avatar">
            <img src="/images/avatar.png" alt="You" />
          </div>
        </div>
      </header>

      <div className="page">
        <main className="gallery">
          {/* 缩略图 */}
          <ul className="thumbnails">
            {[card.imageUrl || "/images/card.png",
              card.imageUrl || "/images/card.png",
              card.imageUrl || "/images/card.png"].map((img, idx) => (
              <li key={idx}>
                <img className="thumbnail" src={img} alt={`thumbnail-${idx}`} />
              </li>
            ))}
          </ul>

          {/* 大图 */}
          <div className="main-image">
            <img
              id="main-image"
              src={card.imageUrl || "/images/card.png"}
              alt={card.name}
            />
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
                <span className="label">Player</span>
                <span className="value">{card.player}</span>
              </div>
              <div className="row">
                <span className="label">Team</span>
                <span className="value">{card.team}</span>
              </div>
              <div className="row">
                <span className="label">Grade</span>
                <span className="value">{card.condition}</span>
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
