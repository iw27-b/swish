'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { SelectedFilters } from './category_filter';

interface CardsToolbarProps {
    onViewModeChange?: (mode: 'all' | 'auction') => void;
    onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    onPriceRangeChange?: (min: number, max: number) => void;
    onFilterRemove?: (filterType: string, value: string) => void;
    totalCards?: number;
    currentFilters?: SelectedFilters;
}

const CardsToolbar: React.FC<CardsToolbarProps> = ({
    onViewModeChange,
    onSortChange,
    onPriceRangeChange,
    onFilterRemove,
    totalCards = 0,
    currentFilters
}) => {
    const [viewMode, setViewMode] = useState<'all' | 'auction'>('all');
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [priceDropdownOpen, setPriceDropdownOpen] = useState(false);
    const [minPrice, setMinPrice] = useState('0.00');
    const [maxPrice, setMaxPrice] = useState('1,100,100.00');
    const [selectedSort, setSelectedSort] = useState<{value: string, order: 'asc' | 'desc'} | null>(null);
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const priceDropdownRef = useRef<HTMLDivElement>(null);

    const handleViewModeChange = (mode: 'all' | 'auction') => {
        setViewMode(mode);
        onViewModeChange?.(mode);

        const button = document.querySelector(`button[data-mode="${mode}"]`);
        if (button) {
            button.classList.add('font-bold');
        }
        const otherButton = document.querySelector(`button[data-mode="${mode === 'all' ? 'auction' : 'all'}"]`);
        if (otherButton) {
            otherButton.classList.remove('font-bold');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setSortDropdownOpen(false);
            }
            if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target as Node)) {
                setPriceDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSortSelect = (sortBy: string, sortOrder: 'asc' | 'desc') => {
        const newSort = { value: sortBy, order: sortOrder };

        if (selectedSort && selectedSort.value === sortBy && selectedSort.order === sortOrder) {
            setSelectedSort(null);
            onSortChange?.('createdAt', 'desc');
        } else {
            setSelectedSort(newSort);
            onSortChange?.(sortBy, sortOrder);
        }
        setSortDropdownOpen(false);
    };

    const handlePriceApply = () => {
        const min = parseFloat(minPrice.replace(/,/g, '')) || 0;
        const max = parseFloat(maxPrice.replace(/,/g, '')) || 1100100;
        onPriceRangeChange?.(min, max);
        setPriceDropdownOpen(false);
    };

    const getPriceButtonText = () => {
        const min = parseFloat(minPrice.replace(/,/g, '')) || 0;
        const max = parseFloat(maxPrice.replace(/,/g, '')) || 1100100;
        if (min === 0 && max >= 1100100) {
            return '金額';
        }
        return `$${min.toFixed(2)} ~ $${max.toFixed(2)}`;
    };

    const sortOptions = [
        { label: '価格: 安い順', value: 'price', order: 'asc' as const },
        { label: '価格: 高い順', value: 'price', order: 'desc' as const },
        { label: '新着順', value: 'createdAt', order: 'desc' as const },
        { label: '古い順', value: 'year', order: 'asc' as const },
        { label: '新しい順', value: 'year', order: 'desc' as const },
        { label: '人気順', value: 'favorites', order: 'desc' as const },
    ];

    const renderFilterChips = (label: string, filterType: string, values: string[], signed?: boolean | null) => {
        if (filterType === 'signed' && signed !== null) {
            const signedValue = signed ? 'はい' : 'いいえ';
            return (
                <div key={filterType} className="relative">
                    <span className="text-sm font-bold text-black">{label}</span>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-full text-sm font-medium text-gray-700 transition-colors border border-gray-300">
                        {signedValue}
                        <button
                            onClick={() => onFilterRemove?.(filterType, signedValue)}
                            className="ml-1 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            );
        }

        if (values && values.length > 0) {
            return (
                <div key={filterType} className="relative">
                    <span className="text-sm font-bold text-black">{label}</span>
                    <div className="flex items-center gap-1 flex-wrap">
                        {values.map((value) => (
                            <div key={value} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-full text-sm font-medium text-gray-700 transition-colors border border-gray-300">
                                {value}
                                <button
                                    onClick={() => onFilterRemove?.(filterType, value)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="bg-white  p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex bg-gray-100 rounded-full p-1">
                    <button
                        onClick={() => handleViewModeChange('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === 'all'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        全て
                    </button>
                    <button
                        onClick={() => handleViewModeChange('auction')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${viewMode === 'auction'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        競売
                    </button>
                </div>

                <div className="relative" ref={sortDropdownRef}>
                    <button
                        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 transition-colors"
                    >
                        {selectedSort ? sortOptions.find(opt => opt.value === selectedSort.value && opt.order === selectedSort.order)?.label || '並べ替える' : '並べ替える'}
                        <ChevronDown className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {sortDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            {sortOptions.map((option, index) => {
                                const isSelected = selectedSort && selectedSort.value === option.value && selectedSort.order === option.order;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleSortSelect(option.value, option.order)}
                                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                                            isSelected ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-700'
                                        }`}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && <Check className="w-4 h-4 text-gray-600" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4">
                <div className="flex items-start gap-6">
                    <div className="relative" ref={priceDropdownRef}>
                        <span className="text-sm font-bold text-black">金額</span>
                        <button
                            onClick={() => setPriceDropdownOpen(!priceDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-full text-sm font-medium text-gray-700 transition-colors border border-gray-300"
                        >
                            {getPriceButtonText()}
                            <ChevronDown className={`w-4 h-4 transition-transform ${priceDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {priceDropdownOpen && (
                            <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                                <div className="mb-3">
                                    {/* <span className="text-sm font-medium text-gray-700 block mb-2">価格範囲</span> */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">$</span>
                                        <input
                                            type="text"
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-black"
                                            placeholder="0.00"
                                        />
                                        <span className="text-sm text-gray-600">~</span>
                                        <span className="text-sm text-gray-600">$</span>
                                        <input
                                            type="text"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-black"
                                            placeholder="1,100,100.00"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setMinPrice('0.00');
                                            setMaxPrice('1,100,100.00');
                                            onPriceRangeChange?.(0, 1100100);
                                            setPriceDropdownOpen(false);
                                        }}
                                        className="flex-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                                    >
                                        リセット
                                    </button>
                                    <button
                                        onClick={handlePriceApply}
                                        className="flex-1 px-3 py-1 text-sm bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                                    >
                                        適用
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {currentFilters && (
                        <>
                            {renderFilterChips('領域', 'organizations', currentFilters.organizations)}
                            {renderFilterChips('サイン入り', 'signed', [], currentFilters.signed)}
                            {renderFilterChips('選手', 'players', currentFilters.players)}
                            {renderFilterChips('シーズン', 'seasons', currentFilters.seasons)}
                        </>
                    )}

                    {/* Results Count */}
                    {/* <div className="ml-auto flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-700">結果</span>
                        <div className="text-sm text-gray-600">
                            {totalCards.toLocaleString()}件
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default CardsToolbar;
