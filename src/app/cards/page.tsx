'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { SelectedFilters } from '@/components/cards/category_filter';
import BannerSection from '@/components/cards/banner_section';
import RecommendedSection from '@/components/cards/recommended_section';
import FilterSection from '@/components/cards/filter_section';
import CardsContentSection from '@/components/cards/cards_content_section';
import ErrorBoundary from '@/components/error_boundary';
import LoadingSkeleton from '@/components/loading_skeleton';
import { Search } from 'lucide-react';

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
        <ErrorBoundary
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
                        <p className="text-gray-600 mb-4">The cards page encountered an error and couldn't load properly.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            }
        >
            <div className="min-h-screen">
                {/* Search Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    <form onSubmit={handleSearchSubmit} className="mb-8 w-full">
                        <div className="flex w-full">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2">
                                    <Search className="text-gray-500"/>
                                </span>
                                <input
                                    type="text"
                                    placeholder="1998 Michael Jordan..."
                                    value={searchInput}
                                    onChange={e => setSearchInput(e.target.value)}
                                    className="pl-12 pr-4 py-3 w-full bg-gray-200 rounded-full border-none focus:ring-2 focus:ring-black text-base placeholder-gray-400"
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

                <BannerSection />

                <RecommendedSection />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
                    <div className="flex gap-8">

                        <FilterSection
                            onFilterChange={handleFilterChange}
                            initialFilters={currentFilters}
                        />
                        
                        <CardsContentSection
                            cards={transformedProducts}
                            loading={loading}
                            error={error}
                            totalCount={totalCount}
                            currentFilters={currentFilters}
                            currentPage={currentPage}
                            totalPages={totalPages}
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
                            onPageChange={handlePageChange}
                        />
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default CardsPage;
