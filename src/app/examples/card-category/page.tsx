'use client';

import React, { useState, useEffect } from 'react';
import CategoryFilter, { SelectedFilters } from '@/components/category_filter';
import CardList, { Card } from '@/components/examples/card_list_demo';

/**
 * Example page demonstrating how CategoryFilter and CardList components
 * can interact through shared state managed by their parent component
 */

export default function CardCategoryPage() {
    const [currentFilters, setCurrentFilters] = useState<SelectedFilters>({
        organizations: [],
        signed: null,
        players: [],
        seasons: [],
    });

    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFilterChange = async (newFilters: SelectedFilters) => {
        console.log('Filter change received from CategoryFilter:', newFilters);
        setCurrentFilters(newFilters);

        await fetchFilteredCards(newFilters);
    };

    const fetchFilteredCards = async (filters: SelectedFilters, isInitialLoad: boolean = false) => {
        if (isInitialLoad) {
            setLoading(true);
        } else {
            setIsFiltering(true);
        }
        setError(null);

        try {
            const queryParams = new URLSearchParams();

            if (filters.organizations.length > 0) {
                queryParams.append('organizations', filters.organizations.join(','));
            }

            if (filters.signed !== null) {
                queryParams.append('signed', filters.signed.toString());
            }

            if (filters.players.length > 0) {
                queryParams.append('player', filters.players[0]); // Using first player for now
            }

            if (filters.seasons.length > 0) {
                queryParams.append('year', filters.seasons[0]); // Using first season for now
            }

            queryParams.append('page', '1');
            queryParams.append('pageSize', '20');

            console.log('Making API call with filters:', queryParams.toString());

            const response = await fetch(`/api/cards?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch filtered cards');
            }

            const data = await response.json();

            setCards(data.data?.items || []);
            console.log(`CardList will re-render with ${data.data?.items?.length || 0} cards`);

        } catch (err) {
            setError('カードの取得に失敗しました');
            console.error('Failed to fetch filtered cards:', err);
        } finally {
            setLoading(false);
            setIsFiltering(false);
        }
    };

    const handleRetry = () => {
        fetchFilteredCards(currentFilters);
    };

    useEffect(() => {
        fetchFilteredCards(currentFilters, true);
    }, []);

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">カード検索例</h1>


            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <CategoryFilter
                        onFilterChange={handleFilterChange}
                        initialFilters={currentFilters}
                        className="sticky top-4"
                    />
                </div>

                <div className="lg:col-span-3">
                    <CardList
                        cards={cards}
                        loading={loading}
                        isFiltering={isFiltering}
                        error={error}
                        currentFilters={currentFilters}
                        onRetry={handleRetry}
                    />
                </div>
            </div>
        </div>
    );
}
