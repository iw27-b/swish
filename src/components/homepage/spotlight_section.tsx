"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import styles from "../../styles/HomeSection.module.css";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const slides = [
  {
    playerName: "STEPH CURRY",
    teamName: "GOLDEN STATE WARRIORS",
    playerImage: "/images/sl2.png",
    leftCard: "/images/sl.png",
    rightCard: "/images/sl3.png",
    cardRotation: 22, // increased by 10 degrees from 12
    cardMargin: "-mr-8 sm:-mr-14 md:-mr-20 lg:-mr-28 xl:-mr-36",
    cardMarginRight: "-ml-8 sm:-ml-14 md:-ml-20 lg:-ml-28 xl:-ml-36",
    leftCardTopOffset: "top-[15px]",
  },
  {
    playerName: "LEBRON JAMES",
    teamName: "LOS ANGELES LAKERS",
    playerImage: "/images/33.png",
    leftCard: "/images/s-l1600 2.png",
    rightCard: "/images/s-l1600 3.png",
    cardRotation: 12,
    cardMargin: "-mr-4 sm:-mr-8 md:-mr-12 lg:-mr-16 xl:-mr-20", // moved further from player
    cardMarginRight: "-ml-4 sm:-ml-8 md:-ml-12 lg:-ml-16 xl:-ml-20",
    leftCardTopOffset: "-top-[10px]",
  },
  {
    playerName: "KEVIN DURANT",
    teamName: "HOUSTON ROCKETS",
    playerImage: "/images/22.png",
    leftCard: "/images/s-l1600 2-1.png",
    rightCard: "/images/s-l1600 3-1.png",
    cardRotation: 8, // smaller rotation to fit cards better
    cardMargin: "-mr-4 sm:-mr-8 md:-mr-12 lg:-mr-16 xl:-mr-20", // moved further from player
    cardMarginRight: "-ml-4 sm:-ml-8 md:-ml-12 lg:-ml-16 xl:-ml-20",
    leftCardTopOffset: "-top-[20px]", // left card higher
  },
];

const HomeSpotlightSection: React.FC = () => {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [displaySlide, setDisplaySlide] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeSlide = useCallback(
    (newSlide: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);

      // Fade out
      setOpacity(0);

      // After fade out, change slide and fade in
      setTimeout(() => {
        setDisplaySlide(newSlide);
        setCurrentSlide(newSlide);
        setOpacity(1);
      }, 300);

      // Allow next transition after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    },
    [isTransitioning]
  );

  const goToPrevSlide = useCallback(() => {
    const newSlide = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
    changeSlide(newSlide);
  }, [currentSlide, changeSlide]);

  const goToNextSlide = useCallback(() => {
    const newSlide = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
    changeSlide(newSlide);
  }, [currentSlide, changeSlide]);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      goToNextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [goToNextSlide]);

  const currentData = slides[displaySlide];

  return (
    <section className={styles.spotlight}>
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-2xl">🏀</span>
        </div>
      </div>
      <div className="max-w-6xl mx-auto text-center pt-24 sm:pt-32">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-black mb-6">
          最新注目
        </h2>
        <p className="text-lg sm:text-xl text-black max-w-2xl mx-auto mb-0">
          限定版カード、クラシック復刻カード、そして最新シーズンの機能性カードが、あなたに充実したユニークなコレクション体験を提供します
        </p>
        {/* Player Spotlight Carousel */}
        <div className="relative">
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-screen flex flex-col items-center justify-center space-y-1 sm:space-y-2"
            style={{
              opacity: opacity,
              transition: "opacity 300ms ease-in-out",
            }}
          >
            <div
              className="font-bold text-gray-300 whitespace-nowrap text-center px-4"
              style={{ fontSize: "clamp(3rem, 11vw, 9rem)" }}
            >
              {currentData.playerName}
            </div>
            <div
              className="font-bold text-gray-200 whitespace-nowrap text-center px-4"
              style={{ fontSize: "clamp(1.5rem, 4.5vw, 4.5rem)" }}
            >
              {currentData.teamName}
            </div>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-0 py-0 sm:py-0">
            {/* Left Arrow */}
            <div
              className="absolute left-[10%] top-1/2 transform -translate-y-1/2 cursor-pointer z-30"
              onClick={goToPrevSlide}
            >
              <div
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                style={{ boxShadow: "0 0 20px rgba(0, 0, 0, 0.15)" }}
              >
                <ChevronLeft className="w-5 h-5 text-black" />
              </div>
            </div>
            {/* Right Arrow */}
            <div
              className="absolute right-[10%] top-1/2 transform -translate-y-1/2 cursor-pointer z-30"
              onClick={goToNextSlide}
            >
              <div
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                style={{ boxShadow: "0 0 20px rgba(0, 0, 0, 0.15)" }}
              >
                <ChevronRight className="w-5 h-5 text-black" />
              </div>
            </div>
            {/* Left Card */}
            <div
              className={`w-48 h-72 sm:w-56 sm:h-80 rounded-lg relative overflow-visible ${currentData.cardMargin} ${currentData.leftCardTopOffset}`}
              style={{
                opacity: opacity,
                transition: "opacity 300ms ease-in-out",
                transform: `rotate(-${currentData.cardRotation}deg)`,
              }}
            >
              <div
                className="absolute inset-0 origin-center p-0"
                style={{ transform: `rotate(${currentData.cardRotation}deg)` }}
              >
                <Image
                  src={currentData.leftCard}
                  alt="Card Left"
                  fill
                  className="object-contain pointer-events-none"
                />
              </div>
            </div>
            {/* Center Player Image */}
            <div
              className="w-64 h-80 sm:w-[30rem] sm:h-[36rem] rounded-lg relative overflow-hidden z-20"
              style={{
                opacity: opacity,
                transition: "opacity 300ms ease-in-out",
              }}
            >
              <Image
                src={currentData.playerImage}
                alt={currentData.playerName}
                fill
                className="object-contain"
              />
            </div>
            {/* Right Card */}
            <div
              className={`w-48 h-72 sm:w-56 sm:h-80 rounded-lg relative overflow-visible ${currentData.cardMarginRight} -top-[10px]`}
              style={{
                opacity: opacity,
                transition: "opacity 300ms ease-in-out",
                transform: `rotate(${currentData.cardRotation}deg)`,
              }}
            >
              <div
                className="absolute inset-0 origin-center p-0"
                style={{ transform: `rotate(-${currentData.cardRotation}deg)` }}
              >
                <Image
                  src={currentData.rightCard}
                  alt="Card Right"
                  fill
                  className="object-contain pointer-events-none"
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push("/cards")}
            className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto mt-6"
          >
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-sm font-bold uppercase">
              最も内容をチェック
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomeSpotlightSection;
