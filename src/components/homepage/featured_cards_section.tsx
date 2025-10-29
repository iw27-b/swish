"use client";

import React, { useState } from "react";
import Image from "next/image";
import styles from "../../styles/HomeSection.module.css";

const HomeFeaturedCardsSection: React.FC = () => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const openVideoModal = () => {
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
  };

  return (
    <>
      <section className={styles.featuredCards}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 items-end gap-6 sm:gap-8">
            {/* Left Card */}
            <div className="bg-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden flex self-start mt-12 sm:mt-16 lg:mt-24">
              <div className="relative flex-1 pl-1 pr-0 pt-1 pb-1">
                <button
                  onClick={openVideoModal}
                  className="block w-full h-auto rounded-2xl sm:rounded-3xl cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Image
                    src="/images/Mask group-1.png"
                    alt="Background"
                    width={400}
                    height={300}
                    className="block w-full h-auto rounded-2xl sm:rounded-3xl"
                  />
                </button>
                <div className="pointer-events-none absolute top-1 bottom-1 left-1 right-0 flex items-center justify-center">
                  <Image
                    src="/images/Group 3.png"
                    alt="Center Icon"
                    width={60}
                    height={60}
                  />
                </div>
              </div>
              <div className="w-20 flex items-center justify-center">
                <p className="text-black text-lg font-medium writing-vertical-rl">
                  最新ダンクビデオ
                </p>
              </div>
            </div>
            {/* Center Card - Image */}
            <div className="flex items-end justify-center h-64 sm:h-80">
              <div className="bg-gray-100 rounded-2xl sm:rounded-3xl h-full w-full p-[4px]">
                <div className="relative h-full w-full rounded-[inherit] overflow-hidden">
                  <Image
                    src="/images/card.png"
                    alt="Card"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
            {/* Right Card */}
            <div className="rounded-2xl sm:rounded-3xl h-64 sm:h-80 overflow-hidden relative">
              <Image
                src="/images/content.png"
                alt="Content"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeVideoModal}
          />

          {/* Video Container */}
          <div className="relative w-full max-w-4xl mx-4">
            <div className="relative rounded-lg overflow-hidden">
              {/* Close Button */}
              <button
                onClick={closeVideoModal}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-colors"
              >
                ✕
              </button>

              {/* YouTube Video */}
              <div
                className="relative w-full"
                style={{ paddingBottom: "56.25%" }}
              >
                <iframe
                  src="https://www.youtube.com/embed/2bGrPZLY5x8?autoplay=1"
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HomeFeaturedCardsSection;
