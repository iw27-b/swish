'use client';

import React, { Suspense } from 'react';
import { BannerCarousel } from '@/components/banner_carousel';
import ErrorBoundary from '@/components/error_boundary';
import LoadingSkeleton from '@/components/loading_skeleton';

const BannerSection: React.FC = () => {
    return (
        <ErrorBoundary
            fallback={
                <div className="mb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                        <p className="text-gray-600">バナーカルーセルが利用できません。</p>
                    </div>
                </div>
            }
        >
            <Suspense fallback={
                <div className="mb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <LoadingSkeleton type="banner" />
                </div>
            }>
                <div className="mb-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <BannerCarousel height="300px" autoPlay={true} intervalMs={4000} />
                </div>
            </Suspense>
        </ErrorBoundary>
    );
};

export default BannerSection;
