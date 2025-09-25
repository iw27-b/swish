'use client';

import React from 'react';

interface LoadingSkeletonProps {
    type?: 'card' | 'banner' | 'filter' | 'grid';
    count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'card', count = 1 }) => {
    const renderSkeleton = () => {
        switch (type) {
            case 'banner':
                return (
                    <div className="w-full h-64 bg-gray-200 rounded-lg animate-pulse">
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 bg-gray-300 rounded-full animate-spin"></div>
                        </div>
                    </div>
                );
            
            case 'filter':
                return (
                    <div className="w-64 bg-gray-100 rounded-lg p-4 animate-pulse">
                        <div className="h-6 bg-gray-200 rounded mb-4"></div>
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-4 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                );
            
            case 'grid':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {[...Array(count)].map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                );
            
            case 'card':
            default:
                return (
                    <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
                        <div className="h-48 bg-gray-200 rounded mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                );
        }
    };

    if (type === 'grid') {
        return <>{renderSkeleton()}</>;
    }

    return (
        <div className="space-y-4">
            {[...Array(count)].map((_, i) => (
                <div key={i}>{renderSkeleton()}</div>
            ))}
        </div>
    );
};

export default LoadingSkeleton;
