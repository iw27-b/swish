'use client';

import React, { Suspense } from 'react';
import RecommendedCards from '@/components/cards/recommended_cards';
import ErrorBoundary from '@/components/error_boundary';
import LoadingSkeleton from '@/components/loading_skeleton';

const RecommendedSection: React.FC = () => {
    return (
        <ErrorBoundary
            fallback={
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                        <h2 className="text-3xl font-bold mb-6">おすすめのアイテム</h2>
                        <p className="text-gray-600">只今おすすめのアイテムがありません。</p>
                    </div>
                </div>
            }
        >
            <Suspense fallback={
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                    <h2 className="text-3xl font-bold mb-6">おすすめのアイテム</h2>
                    <LoadingSkeleton type="grid" count={4} />
                </div>
            }>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
                    <RecommendedCards />
                </div>
            </Suspense>
        </ErrorBoundary>
    );
};

export default RecommendedSection;
