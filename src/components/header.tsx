import React from 'react';
import Image from "next/image";

const Header: React.FC = () => {
    return (

        // TODO: authenticate with the backend and show the user's avatar.
        <header className="px-5 sm:px-10 py-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="text-black font-bold text-2xl sm:text-4xl uppercase tracking-wide">
                    SWISH
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
    );
};

export default Header;
