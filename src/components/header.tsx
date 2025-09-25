'use client';

import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/client_auth';
import { usePathname } from 'next/navigation';

const Header: React.FC = () => {
    const { user } = useAuth();
    const pathname = usePathname();

    const navItems = React.useMemo(() => ([
        { label: 'ホーム', href: '/' },
        { label: 'カタログ', href: '/cards' },
        { label: '最新情報', href: '/news' },
        { label: 'チーム紹介', href: '/#teams' }
    ]), []);

    const itemRefs = React.useRef<Array<HTMLAnchorElement | null>>([]);
    const indicatorRef = React.useRef<HTMLDivElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    const activeIndex = React.useMemo(() => {
        if (!pathname) return 0;
        if (pathname === '/') return navItems.findIndex(i => i.href === '/');

        const candidates = navItems
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.href !== '/' && !item.href.includes('#') && pathname.startsWith(item.href))
            .sort((a, b) => b.item.href.length - a.item.href.length);

        if (candidates.length > 0) return candidates[0].index;
        return navItems.findIndex(i => i.href === '/');
    }, [pathname, navItems]);

    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

    const moveIndicatorTo = React.useCallback((index: number) => {
        const container = containerRef.current;
        const indicator = indicatorRef.current;
        const target = itemRefs.current[index];
        if (!container || !indicator || !target) return;
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const left = targetRect.left - containerRect.left;
        indicator.style.width = `${targetRect.width}px`;
        indicator.style.transform = `translateX(${left}px)`;
    }, []);

    React.useEffect(() => {
        const index = hoverIndex ?? activeIndex;
        moveIndicatorTo(index);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hoverIndex, activeIndex]);
    return (

        // TODO: authenticate with the backend and show the user's avatar.
        <header className="px-2 sm:px-4 py-6">
            <div className="grid grid-cols-3 items-center w-full max-w-screen-lg xl:max-w-screen-xl mx-auto gap-3">
                <div className="flex items-center" style={{ minWidth: 0 }}>
                    <div className="text-black font-bold text-2xl sm:text-4xl uppercase tracking-wide mr-2">
                        <Link href="/">SWISH</Link>
                    </div>
                </div>
                <nav className="hidden sm:flex items-center text-sm uppercase font-medium justify-self-center">
                    <div
                        ref={containerRef}
                        className="relative flex items-center gap-3 px-1 py-1"
                        onMouseLeave={() => setHoverIndex(null)}
                    >
                        <div
                            ref={indicatorRef}
                            className="absolute top-1 left-0 h-8 rounded-full bg-gray-200 transition-[transform,width] duration-300 ease-out z-0"
                            style={{ width: 0, transform: 'translateX(0px)' }}
                            aria-hidden
                        />
                        {navItems.map((item, index) => {
                            const isActive = index === activeIndex;
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    ref={(el) => { itemRefs.current[index] = el; }}
                                    onMouseEnter={() => setHoverIndex(index)}
                                    className={[
                                        'relative z-10 px-4 h-8 inline-flex items-center justify-center rounded-full transition-colors',
                                        isActive ? 'bg-black text-white' : 'text-black hover:text-black'
                                    ].join(' ')}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
                <div className="flex items-center gap-3 justify-self-end" style={{ minWidth: 0 }}>
                    <Link
                        href="/cart"
                        className="px-5 py-2 bg-black text-white rounded-full font-semibold text-base hover:bg-gray-900 transition-all shadow-sm flex items-center"
                        style={{ borderRadius: '9999px', minWidth: '70px', height: '40px' }}
                    >
                        <span className="mr-2 flex items-center">
                            <ShoppingBag className="w-5 h-5" />
                        </span>
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
