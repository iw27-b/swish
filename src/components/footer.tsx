import React from 'react';
import Image from "next/image";

const Footer: React.FC = () => {
    return (
        <footer className="px-5 sm:px-10 py-12 sm:py-16 border-t border-gray-200">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div className="text-gray-400 text-6xl sm:text-8xl font-bold uppercase opacity-20">
                        SWISH
                    </div>
                    <div className="flex flex-col items-start gap-6 ml-[-4rem]">
                        <nav className="flex flex-col items-start gap-2 text-sm uppercase font-medium">
                            {/* TODO: add links to the footer */}
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
    );
};

export default Footer;
