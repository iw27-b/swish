'use client';

import React, { Suspense } from 'react';
import CategoryFilter, { SelectedFilters } from '@/components/cards/category_filter';
import ErrorBoundary from '@/components/error_boundary';
import LoadingSkeleton from '@/components/loading_skeleton';

interface FilterSectionProps {
    onFilterChange: (filters: SelectedFilters) => void;
    initialFilters: SelectedFilters;
}

const FilterSection: React.FC<FilterSectionProps> = ({ onFilterChange, initialFilters }) => {
    return (
        <ErrorBoundary
            fallback={
                <div className="w-64 flex-shrink-0">
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                        <p className="text-gray-600 text-sm">只今フィルターが利用できません。</p>
                    </div>
                </div>
            }
        >
            <Suspense fallback={
                <div className="w-64 flex-shrink-0">
                    <LoadingSkeleton type="filter" />
                </div>
            }>
                <div className="w-64 flex-shrink-0">
                    <div className="">
                        <CategoryFilter
                            onFilterChange={onFilterChange}
                            initialFilters={initialFilters}
                        />
                    </div>
                </div>
            </Suspense>
        </ErrorBoundary>
    );
};

export default FilterSection;
