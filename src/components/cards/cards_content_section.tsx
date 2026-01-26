'use client';

import React, { Suspense } from 'react';
import CardGrid from '@/components/cards/card_grid';
import CardsToolbar from '@/components/cards/cards_toolbar';
import Pagination from '@/components/cards/pagination';
import ErrorBoundary from '@/components/error_boundary';
import LoadingSkeleton from '@/components/loading_skeleton';
import { Box, Loader2, XCircle } from 'lucide-react';
import { SelectedFilters } from '@/components/cards/category_filter';

interface ProductItem {
    id: number;
    image: string;
    category: string;
    title: string;
    price: string;
    href?: string;
}

interface CardsContentSectionProps {
    cards: ProductItem[];
    loading: boolean;
    error: string | null;
    totalCount: number;
    currentFilters: SelectedFilters;
    currentPage: number;
    totalPages: number;
    onViewModeChange: (mode: string) => void;
    onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    onPriceRangeChange: (min: number, max: number) => void;
    onFilterRemove: (filterType: string, value: string) => void;
    onPageChange: (page: number) => void;
}

const CardsContentSection: React.FC<CardsContentSectionProps> = ({
    cards,
    loading,
    error,
    totalCount,
    currentFilters,
    currentPage,
    totalPages,
    onViewModeChange,
    onSortChange,
    onPriceRangeChange,
    onFilterRemove,
    onPageChange,
}) => {
    return (
        <ErrorBoundary
            fallback={
                <div className="flex-1 min-w-0">
                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                        <p className="text-gray-600">カードの内容が利用できません。</p>
                    </div>
                </div>
            }
        >
            <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-6 w-full">
                    <div className="w-full">
                        <Suspense fallback={<div className="h-16 bg-gray-100 rounded animate-pulse"></div>}>
                            <CardsToolbar
                                totalCards={totalCount}
                                currentFilters={currentFilters}
                                onViewModeChange={onViewModeChange}
                                onSortChange={onSortChange}
                                onPriceRangeChange={onPriceRangeChange}
                                onFilterRemove={onFilterRemove}
                            />
                        </Suspense>
                    </div>
                    <div className="w-full">
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                                <span className="ml-3 text-gray-600">カードを読み込んでいます...</span>
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <XCircle className="h-5 w-5 text-red-400" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">カードの読み込みに失敗しました。</h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>{error}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!loading && !error && (
                            <Suspense fallback={<LoadingSkeleton type="grid" count={9} />}>
                                {cards.length > 0 ? (
                                    <>
                                        <CardGrid products={cards} />
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={onPageChange}
                                            className="mt-8 mb-12"
                                        />
                                    </>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="max-w-md mx-auto">
                                            <Box className="h-12 w-12 text-gray-400 mx-auto" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">カードが見つかりません。</h3>
                                            <p className="text-gray-600">フィルターを調整して、もっと多くの結果を見つけてください。</p>
                                        </div>
                                    </div>
                                )}
                            </Suspense>
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default CardsContentSection;
