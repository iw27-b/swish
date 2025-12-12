"use client";

import React from "react";
import Image from "next/image";
import styles from "../../styles/HomeSection.module.css";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const HomeSpotlightSection: React.FC = () => {
  const router = useRouter();
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
        <p className="text-lg sm:text-xl text-black max-w-2xl mx-auto mb-2 sm:mb-18">
          限定版カード、クラシック復刻カード、そして最新シーズンの機能性カードが、あなたに充実したユニークなコレクション体験を提供します
        </p>
        {/* Stephen Curry Section */}
        <div className="relative">
          <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-screen flex flex-col items-center justify-center space-y-2 sm:space-y-3">
            <div className="text-[20vw] sm:text-[16vw] lg:text-[12vw] font-bold text-gray-300 whitespace-nowrap">
              STEPH CURRY
            </div>
            <div className="text-[8vw] sm:text-[7vw] lg:text-[6vw] font-bold text-gray-200 whitespace-nowrap">
              GOLDEN STATE WARRIORS
            </div>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-0 py-0 sm:py-0">
            {/* Left Arrow */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 cursor-pointer">
              <div
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center"
                style={{ boxShadow: "0 0 20px rgba(0, 0, 0, 0.15)" }}
              >
                <ChevronLeft className="w-5 h-5 text-black" />
              </div>
            </div>
            {/* Right Arrow */}
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 cursor-pointer">
              <div
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center"
                style={{ boxShadow: "0 0 20px rgba(0, 0, 0, 0.15)" }}
              >
                <ChevronRight className="w-5 h-5 text-black" />
              </div>
            </div>
            {/* Left Card */}
            <div className="w-48 h-72 sm:w-56 sm:h-80 rounded-lg transform -rotate-12 relative overflow-hidden -mr-8 sm:-mr-14 md:-mr-20 lg:-mr-28 xl:-mr-36 top-[15px]">
              <div className="absolute inset-0 origin-center transform rotate-12 p-0">
                <Image
                  src="/images/sl.png"
                  alt="Spotlight 1"
                  fill
                  className="object-contain pointer-events-none"
                />
              </div>
            </div>
            {/* Center Player Image */}
            <div className="w-64 h-80 sm:w-[30rem] sm:h-[36rem] rounded-lg relative overflow-hidden z-20">
              <Image
                src="/images/sl2.png"
                alt="Spotlight 2"
                fill
                className="object-cover"
              />
            </div>
            {/* Right Card */}
            <div className="w-48 h-72 sm:w-56 sm:h-80 rounded-lg transform rotate-12 relative overflow-hidden -ml-8 sm:-ml-14 md:-ml-20 lg:-ml-28 xl:-ml-36 -top-[10px]">
              <div className="absolute inset-0 origin-center transform -rotate-12 p-0">
                <Image
                  src="/images/sl3.png"
                  alt="Spotlight 3"
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
