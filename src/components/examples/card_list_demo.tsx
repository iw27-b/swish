'use client';

/**
 * 
 *  THIS IS A DEMO COMPONENT TO DEMONSTRATE THE CATEGORY FILTER. DO NOT USE THIS COMPONENT. MAKE YOUR OWN COMPONENT.
 * 
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import type { SelectedFilters } from '../category_filter';

interface Card {
    id?: string;
    name?: string;
    player?: string;
    team?: string;
    year?: string;
    price?: number;
}

interface CardListProps {
    cards: Card[];
    loading: boolean;
    isFiltering: boolean;
    error: string | null;
    currentFilters: SelectedFilters;
    onRetry: () => void;
    className?: string;
}

const CardList: React.FC<CardListProps> = ({
    cards,
    loading,
    isFiltering,
    error,
    currentFilters,
    onRetry,
    className = '',
}) => {
    const hasActiveFilters =
        currentFilters.organizations.length > 0 ||
        currentFilters.signed !== null ||
        currentFilters.players.length > 0 ||
        currentFilters.seasons.length > 0;

    return (
        <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
            <h2 className="text-lg font-medium mb-4">検索結果</h2>

            {hasActiveFilters && (
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">適用中のフィルター:</h3>
                    <div className="flex flex-wrap gap-2">
                        {currentFilters.organizations.map(org => (
                            <span key={org} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                領域: {org}
                            </span>
                        ))}
                        {currentFilters.signed !== null && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                サイン入り: {currentFilters.signed ? 'はい' : 'いいえ'}
                            </span>
                        )}
                        {currentFilters.players.map(player => (
                            <span key={player} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                選手: {player}
                            </span>
                        ))}
                        {currentFilters.seasons.map(season => (
                            <span key={season} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                シーズン: {season}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {loading && cards.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    {/* <span className="ml-3 text-gray-500">カードを読み込み中...</span> */}
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <div className="text-red-500 mb-2">{error}</div>
                    <button
                        onClick={onRetry}
                        className="text-black hover:text-gray-700 text-sm underline"
                    >
                        再試行
                    </button>
                </div>
            ) : !Array.isArray(cards) || (cards.length === 0 && !loading && !isFiltering) ? (
                <div className="text-center py-12 text-gray-500">
                    フィルター条件に一致するカードが見つかりません
                </div>
            ) : (
                <div className="relative">
                    {isFiltering && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                            <div className="flex items-center bg-white shadow-md rounded-lg px-4 py-2">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                <span className="ml-2 text-sm text-gray-600">フィルタリング中...</span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {cards.map((card, index) => (
                            <div key={card.id || index} className="bg-gray-100 rounded-lg p-4 h-48 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900 truncate">
                                        {card.name || `カード ${index + 1}`}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {card.player && `選手: ${card.player}`}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {card.team && `チーム: ${card.team}`}
                                    </p>
                                    {/* <p className="text-sm text-gray-600">
                                        {card.year && `年: ${card.year}`}
                                    </p> */}
                                </div>
                                {card.price && (
                                    <div className="text-lg font-semibold text-green-600">
                                        ¥{card.price.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CardList;
export type { Card, CardListProps };
