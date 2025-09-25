'use client';

import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { UserRound, Handbag } from 'lucide-react';
import { useAuth } from '@/lib/client_auth';

const Header: React.FC = () => {
    const { user } = useAuth();
    return (

        // TODO: authenticate with the backend and show the user's avatar.
        <header className="px-2 sm:px-4 py-6">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center" style={{ minWidth: 0 }}>
                    <div className="text-black font-bold text-2xl sm:text-4xl uppercase tracking-wide mr-2">
                        <Link href="/">SWISH</Link>
                    </div>
                </div>
                <nav className="hidden sm:flex items-center gap-2 text-sm uppercase font-medium">
                    <span className="text-black">ホーム</span>
                    <div className="text-black">|</div>
                    <span className="text-black">最新情報</span>
                    <div className="text-black">|</div>
                    <span className="text-black">チーム紹介</span>
                </nav>
                <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                    <Link
                        href="/cart"
                        className="px-5 py-2 bg-black text-white rounded-full font-semibold text-base hover:bg-gray-900 transition-all shadow-sm flex items-center"
                        style={{ borderRadius: '9999px', minWidth: '70px', height: '40px' }}
                    >
                        <Handbag className="w-5 h-5 mr-2" />
                        Cart
                    </Link>
                    <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-transparent border-18 border-black flex items-center justify-center" style={{ minWidth: '40px', minHeight: '40px' }}>
                        {user ? (
                            <Image src={user.profileImageUrl || '/images/avatar.png'} alt="You" width={40} height={40} style={{ objectFit: 'cover', borderRadius: '9999px' }} />
                        ) : (
                            <span className="flex items-center justify-center w-8 h-8 bg-black rounded-full">
                                <UserRound className="w-6 h-6 text-white" />
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
