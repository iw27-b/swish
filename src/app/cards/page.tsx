'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import CategoryFilter, { SelectedFilters } from '@/components/cards/category_filter';
import CardGrid from '@/components/cards/card_grid';
import CardsToolbar from '@/components/cards/cards_toolbar';
import { BannerCarousel } from '@/components/banner_carousel';
import Pagination from '@/components/cards/pagination';
import { Loader2 } from 'lucide-react';

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

interface ApiResponse {
    data: {
        items: Card[];
        pagination: {
            page: number;
            totalPages: number;
            total: number;
            pageSize: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    };
    message: string;
}

interface ProductItem {
    id: number;
    image: string;
    category: string;
    title: string;
    price: string;
    href?: string;
}

const CardsPage: React.FC = () => {
    const [cards, setCards] = useState<Card[]>([]);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentFilters, setCurrentFilters] = useState<SelectedFilters>({
        organizations: [],
        signed: null,
        players: [],
        seasons: [],
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [priceRange, setPriceRange] = useState<{ min: number | null, max: number | null }>({ min: null, max: null });

    const fetchCards = async (
        filters: SelectedFilters,
        page: number = 1,
        sortField: string = sortBy,
        sortDirection: 'asc' | 'desc' = sortOrder,
        minPrice: number | null = priceRange.min,
        maxPrice: number | null = priceRange.max,
        searchValue: string = search
    ) => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = new URLSearchParams();

            queryParams.append('page', page.toString());
            queryParams.append('pageSize', '9');

            if (filters.players.length > 0) {
                queryParams.append('player', filters.players[0]);
            }

            if (filters.seasons.length > 0) {
                queryParams.append('year', filters.seasons[0]);
            }

            queryParams.append('sortBy', sortField);
            queryParams.append('sortOrder', sortDirection);

            if (minPrice !== null) {
                queryParams.append('minPrice', minPrice.toString());
            }
            if (maxPrice !== null) {
                queryParams.append('maxPrice', maxPrice.toString());
            }

            queryParams.append('isForSale', 'true');

            if (searchValue && searchValue.trim().length > 0) {
                queryParams.append('search', searchValue.trim());
            }
            const apiUrl = `/api/cards?${queryParams.toString()}`;

            const response = await fetch(apiUrl, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', response.status, errorText);
                throw new Error(`Failed to fetch cards: ${response.status} ${response.statusText}`);
            }

            const result: ApiResponse = await response.json();

            setCards(result.data.items);
            setCurrentPage(result.data.pagination.page || 1);
            setTotalPages(result.data.pagination.totalPages || 1);
            setTotalCount(result.data.pagination.total || 0);

        } catch (err) {
            console.error('Error fetching cards:', err);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilters: SelectedFilters) => {
        setCurrentFilters(newFilters);
        setCurrentPage(1);
        fetchCards(newFilters, 1, sortBy, sortOrder, priceRange.min, priceRange.max, search);
    };

    const handlePageChange = (page: number) => {
        fetchCards(currentFilters, page, sortBy, sortOrder, priceRange.min, priceRange.max, search);
    };

    const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
        setCurrentPage(1);
        fetchCards(currentFilters, 1, newSortBy, newSortOrder, priceRange.min, priceRange.max, search);
    };

    const handlePriceRangeChange = (min: number, max: number) => {
        const newPriceRange = {
            min: min > 0 ? min : null,
            max: max < 1100100 ? max : null
        };
        setPriceRange(newPriceRange);
        setCurrentPage(1);
        fetchCards(currentFilters, 1, sortBy, sortOrder, newPriceRange.min, newPriceRange.max, search);
    };

    const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSearch(searchInput);
        setCurrentPage(1);
        fetchCards(currentFilters, 1, sortBy, sortOrder, priceRange.min, priceRange.max, searchInput);
    };

    const transformedProducts: ProductItem[] = cards.map((card, index) => ({
        id: index + 1 + (currentPage - 1) * 9,
        image: card.imageUrl || '/images/card.png',
        category: `${card.brand} ${card.year}`,
        title: `${card.player} - ${card.name}`,
        price: card.price ? `$${card.price.toFixed(2)}` : 'Price on request',
        href: `/cards/${card.id}`,
    }));


    useEffect(() => {
        fetchCards(currentFilters, 1, sortBy, sortOrder, priceRange.min, priceRange.max, search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <form onSubmit={handleSearchSubmit} className="mb-8 w-full">
                    <div className="flex w-full">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2">
                                <Image src="/images/icons8-search 1.svg" alt="search" width={20} height={20} />
                            </span>
                            <input
                                type="text"
                                placeholder="検索内容を入力してください"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                className="pl-12 pr-4 py-3 w-full bg-gray-200 rounded-full border-none focus:ring-2 focus:ring-black text-base placeholder-gray-500"
                                style={{ borderRadius: '9999px' }}
                            />
                        </div>
                        <button
                            type="submit"
                            className="ml-3 px-8 py-3 bg-black text-white rounded-full font-semibold text-base hover:bg-gray-900 transition-all shadow-sm"
                            style={{ borderRadius: '9999px', minWidth: '110px' }}
                        >
                            検索
                        </button>
                    </div>
                </form>
            </div>
                <div className="mb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <BannerCarousel height="300px" autoPlay={true} intervalMs={4000} />
                </div>

                {/* おすすめのアイテムセクション */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                        <h2 className="text-3xl font-bold mb-6">おすすめのアイテム</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                {
                                    img: '/images/cards/osusume-1.png',
                                    title: 'NBA Star-Cards',
                                    desc: '1991 フリーア #29 マイケル・ジョーダン・ ブルズ HOF PSA 10',
                                    price: 'US $240.44',
                                },
                                {
                                    img: '/images/cards/osusume-2.png',
                                    title: 'NBA Star-Cards',
                                    desc: 'Stephen Curry 2024 Topps Now Olympic Games #27 Graded Gem Mint 10',
                                    price: 'US $34.99',
                                },
                                {
                                    img: '/images/cards/osusume-3.png',
                                    title: 'NBA Star-Cards',
                                    desc: '2019-20 Panini Prizm Kevin Durant #210 PSA 8',
                                    price: 'US $240.44',
                                },
                                {
                                    img: '/images/cards/osusume-4.png',
                                    title: 'NBA Star-Cards',
                                    desc: '2023-24 Panini Prizm Prizms White #199\nYao Ming/175 - FB',
                                    price: 'US $30.00',
                                },
                            ].map((card, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div className="relative w-full bg-gray-100 rounded-[32px] py-6 px-6 flex flex-col items-center">
                                        <button
                                            className="absolute top-5 right-5 w-10 h-10 bg-white rounded-full flex items-center justify-center"
                                            aria-label="like"
                                        >
                                            <Image src="/images/Vector.svg" alt="like" width={20} height={20} className="w-5 h-5" />
                                        </button>
                                        <Image
                                            src={card.img}
                                            alt={card.desc}
                                            width={300}
                                            height={192}
                                            className="w-full h-48 object-contain"
                                            style={{ borderRadius: 16 }}
                                        />
                                    </div>
                                    <div className="w-full text-left mt-3">
                                        <div className="text-gray-400 text-xs mb-1">{card.title}</div>
                                        <div className="text-black text-sm font-normal mb-2 whitespace-pre-line">{card.desc}</div>
                                        <div className="text-black text-xl font-bold">{card.price}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
                <div className="flex gap-8">
                    <div className="w-64 flex-shrink-0">
                        <div className="">
                            <CategoryFilter
                                onFilterChange={handleFilterChange}
                                initialFilters={currentFilters}
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-6 w-full">
                            <div className="w-full">
                                <CardsToolbar
                                    totalCards={totalCount}
                                    currentFilters={currentFilters}
                                    onViewModeChange={(mode) => {
                                        console.log('View mode changed:', mode);
                                    }}
                                    onSortChange={handleSortChange}
                                    onPriceRangeChange={handlePriceRangeChange}
                                    onFilterRemove={(filterType, value) => {
                                        console.log('Filter remove requested:', filterType, value);
                                        const newFilters = { ...currentFilters };
                                        if (filterType === 'organizations') {
                                            newFilters.organizations = newFilters.organizations.filter(org => org !== value);
                                        } else if (filterType === 'signed') {
                                            newFilters.signed = null;
                                        } else if (filterType === 'players') {
                                            newFilters.players = newFilters.players.filter(player => player !== value);
                                        } else if (filterType === 'seasons') {
                                            newFilters.seasons = newFilters.seasons.filter(season => season !== value);
                                        }
                                        handleFilterChange(newFilters);
                                    }}
                                />
                            </div>
                            <div className="w-full">
                                {loading && (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                                        <span className="ml-3 text-gray-600">Loading cards...</span>
                                    </div>
                                )}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800">Error loading cards</h3>
                                                <div className="mt-2 text-sm text-red-700">
                                                    <p>{error}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {!loading && !error && (
                                    <>
                                        {transformedProducts.length > 0 ? (
                                            <CardGrid products={transformedProducts} />
                                        ) : (
                                            <div className="text-center py-12">
                                                <div className="max-w-md mx-auto">
                                                    <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No cards found</h3>
                                                    <p className="text-gray-600">Try adjusting your filters to see more results.</p>
                                                </div>
                                            </div>
                                        )}
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={handlePageChange}
                                            className="mt-8 mb-12"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CardsPage;
