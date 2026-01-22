import React from "react";
import Image from "next/image";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="px-5 sm:px-10 py-12 sm:py-16 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          
          <div className="flex flex-row items-center">
            <div className="text-gray-400 text-[24px] sm:text-4xl font-bold uppercase opacity-20 mr-10">
              SWISH
            </div>

            <div className="flex flex-col items-start gap-6">
              <nav className="flex flex-col items-start gap-2 text-sm uppercase font-medium">
                <Link href="/news" className="text-black hover:underline">
                  <span className="text-black">最新情報</span>
                </Link>
                <span className="text-black cursor-pointer">チーム紹介</span>
                <span className="text-black cursor-pointer">カート</span>
              </nav>
            </div>
          </div>

          <Image
            src="/images/Group 18.png"
            alt="Icon"
            width={80}
            height={80}
            className="object-contain"
          />

        </div>
      </div>
    </footer>
  );
};

export default Footer;
