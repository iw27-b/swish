import React from 'react';
import Image from "next/image";
import styles from '../styles/HomeSection.module.css';

const HomeSection: React.FC = () => {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-black font-bold text-2xl sm:text-4xl uppercase tracking-wide">
            SWICH
          </div>
          <nav className="hidden sm:flex items-center gap-2 text-sm uppercase font-medium">
            <span className="text-black">最新情報</span>
            <div className="text-black">|</div>
            <span className="text-black">チーム紹介</span>
          </nav>
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-transparent border-18 border-black flex items-center justify-center">
            <Image src="/images/avatar.png" alt="Login" width={36} height={36} />
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <Image src="/images/hand.svg" alt="Wave" width={40} height={40} />
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-16 sm:pt-20">
          <h1 className="text-4xl sm:text-6xl lg:text-8xl font-semibold text-black leading-tight mb-6">
            伝説のダンクが、<br />
            永遠にあなたのもの
          </h1>
          <p className="text-lg sm:text-2xl lg:text-3xl text-black max-w-3xl mx-auto font-medium">
            NBA殿堂入り選手から今季MVPまで、世界限定カードが今だけ特価
          </p>
        </div>
      </section>
      {/* Featured Cards Section */}
      <section className={styles.featuredCards}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 items-end gap-6 sm:gap-8">
            {/* Left Card */}
            <div className="bg-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden flex self-start mt-12 sm:mt-16 lg:mt-24">
              <div className="relative flex-1 pl-1 pr-0 pt-1 pb-1">
                <img
                  src="/images/Mask group-1.png"
                  alt="Background"
                  className="block w-full h-auto rounded-2xl sm:rounded-3xl"
                />
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
                  <Image src="/images/card.png" alt="Card" fill className="object-cover" />
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
      {/* Latest Spotlight Section */}
      <section className={styles.spotlight}>
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-400 flex items-center justify-center">
            <span className="text-2xl">🏀</span>
          </div>
        </div>
        <div className="max-w-6xl mx-auto text-center pt-16 sm:pt-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-black mb-6">
            最新注目
          </h2>
          <p className="text-lg sm:text-xl text-black max-w-2xl mx-auto mb-12 sm:mb-16">
            限定版カード、クラシック復刻カード、そして最新シーズンの機能性カードが、あなたに充実したユニークなコレクション体験を提供します
          </p>
          {/* Stephen Curry Section */}
          <div className="relative">
            <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-screen flex flex-col items-center justify-center space-y-2 sm:space-y-3">
              <div className="text-[20vw] sm:text-[16vw] lg:text-[12vw] font-bold text-gray-100 whitespace-nowrap">
                STEPH CURRY
              </div>
              <div className="text-[8vw] sm:text-[7vw] lg:text-[6vw] font-bold text-gray-200 whitespace-nowrap">
                GOLDEN STATE WARRIORS
              </div>
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-0 py-12 sm:py-20">
              {/* Left Card */}
              <div className="w-48 h-72 sm:w-56 sm:h-80 rounded-lg transform -rotate-12 relative overflow-hidden -mr-8 sm:-mr-14 md:-mr-20 lg:-mr-28 xl:-mr-36 top-[15px]">
                <div className="absolute inset-0 origin-center transform rotate-12 p-0">
                  <Image src="/images/sl.png" alt="Spotlight 1" fill className="object-contain pointer-events-none" />
                </div>
              </div>
              {/* Center Player Image */}
              <div className="w-64 h-80 sm:w-[30rem] sm:h-[36rem] rounded-lg relative overflow-hidden z-20">
                <Image src="/images/sl2.png" alt="Spotlight 2" fill className="object-cover" />
              </div>
              {/* Right Card */}
              <div className="w-48 h-72 sm:w-56 sm:h-80 rounded-lg transform rotate-12 relative overflow-hidden -ml-8 sm:-ml-14 md:-ml-20 lg:-ml-28 xl:-ml-36 -top-[10px]">
                <div className="absolute inset-0 origin-center transform -rotate-12 p-0">
                  <Image src="/images/sl3.png" alt="Spotlight 3" fill className="object-contain pointer-events-none" />
                </div>
              </div>
            </div>
            <button className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto">
              <Image src="/images/box.png" alt="Box" width={24} height={24} className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-sm font-medium uppercase">最も内容をチェック</span>
            </button>
          </div>
        </div>
      </section>
      {/* Information Sections */}
      <section className="px-5 sm:px-10 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latest Information */}
          <div className="bg-[url('/images/img3-1.png')] bg-cover bg-center rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 min-h-[400px] sm:min-h-[500px] relative overflow-hidden">
            <div className="text-center text-white relative z-10">
              <h3 className="text-2xl sm:text-3xl font-medium mb-6">最新情報</h3>
              <p className="text-lg sm:text-xl leading-relaxed mb-8">
                毎日更新は、日常の収集や取引に最適な選択です。最新のカードや人気のデザインで、収集にも取引にもぴったりです。
              </p>
              <button className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto mt-35">
                <Image src="/images/enter.png" alt="Enter" width={20} height={20} className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="text-sm font-bold uppercase">探す</span>
              </button>
            </div>
          </div>
          {/* Community Culture */}
          <div className="bg-[url('/images/img4.png')] bg-cover bg-center rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 min-h-[400px] sm:min-h-[500px] relative overflow-hidden">
            <div className="text-center text-white relative z-10">
              <h3 className="text-2xl sm:text-3xl font-medium mb-6">コミュニティ文化とトレンド</h3>
              <p className="text-lg sm:text-xl leading-relaxed mb-8">
                私たちのコミュニティシリーズで、取引の安定性と自由な活動を維持しましょう。最新の取引のプロセス、常に安定感とプロフェッショナルさを実感できます。
              </p>
              <button className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto mt-28">
                <Image src="/images/enter.png" alt="Enter" width={20} height={20} className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="text-sm font-bold uppercase">探す</span>
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="px-5 sm:px-10 py-12 sm:py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="text-gray-400 text-6xl sm:text-8xl font-bold uppercase opacity-20">
              SWICH
            </div>
            <div className="flex flex-col items-start gap-6 ml-[-4rem]">
              <nav className="flex flex-col items-start gap-2 text-sm uppercase font-medium">
                <span className="text-black">最新情報</span>
                <span className="text-black">チーム紹介</span>
                <span className="text-black">カート</span>
              </nav>
            </div>
            <Image src="/images/Group 18.png" alt="Icon" width={80} height={80} className="text-black font-bold text-2xl sm:text-4xl uppercase" />
          </div>
          <div className="absolute bottom-4 right-8">
          </div>
        </div>
      </footer>
    </div>
  );
}
export default HomeSection;