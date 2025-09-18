'use client';

import React from 'react';
import { BannerCarousel } from '@/components/banner_carousel';

export default function BannerCarouselDemo() {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Banner Carousel Demo
                    </h1>
                </div>

                <div className="space-y-8">
                    <BannerCarousel />
                </div>
            </div>
        </div>
    );
}
