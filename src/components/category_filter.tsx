'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface FilterOption {
    value: string;
    count: number;
}

interface CategoryFilterData {
    organizations: FilterOption[]; // 領域 (NBA, FIBA, etc.)
    players: FilterOption[];       // 選手
    seasons: FilterOption[];       // シーズン (years)
    teams: FilterOption[];         // チーム (fallback for organizations)
    brands: FilterOption[];        // ブランド
}

interface CategoryFilterProps {
    onFilterChange?: (filters: SelectedFilters) => void;
    initialFilters?: SelectedFilters;
    className?: string;
}

interface SelectedFilters {
    organizations: string[];
    signed: boolean | null; // null = either, true = はい, false = いいえ
    players: string[];
    seasons: string[];
}

let cachedFilterData: CategoryFilterData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchFilterData(): Promise<CategoryFilterData> {
    if (cachedFilterData && Date.now() - cacheTimestamp < CACHE_DURATION) {
        return cachedFilterData;
    }

    try {
        const response = await fetch('/api/search/filters', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            next: {
                revalidate: 300 // 5 minutes 
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch filter data');
        }

        const data = await response.json();

        const filterData: CategoryFilterData = {
            // TODO: Add organizations endpoint or derive from teams
            organizations: [
                { value: 'NBA', count: 0 },
                { value: 'FIBA', count: 0 },
                { value: 'NCAA', count: 0 },
            ],
            players: data.data?.cardFilters?.players || [],
            seasons: data.data?.cardFilters?.years?.map((year: FilterOption) => ({
                value: year.value.toString(),
                count: year.count
            })) || [],
            teams: data.data?.cardFilters?.teams || [],
            brands: data.data?.cardFilters?.brands || [],
        };

        cachedFilterData = filterData;
        cacheTimestamp = Date.now();

        return filterData;
    } catch (error) {
        console.error('Error fetching filter data:', error);

        return {
            organizations: [],
            players: [],
            seasons: [],
            teams: [],
            brands: [],
        };
    }
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
    onFilterChange,
    initialFilters = {
        organizations: [],
        signed: null,
        players: [],
        seasons: [],
    },
    className = '',
}) => {
    const [filterData, setFilterData] = useState<CategoryFilterData>({
        organizations: [],
        players: [],
        seasons: [],
        teams: [],
        brands: [],
    });
    const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>(initialFilters);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadFilterData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const data = await fetchFilterData();
                setFilterData(data);
            } catch (err) {
                setError('フィルターデータの読み込みに失敗しました');
                console.error('Failed to load filter data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadFilterData();
    }, []);

    const handleFilterChange = (newFilters: SelectedFilters) => {
        setSelectedFilters(newFilters);
        onFilterChange?.(newFilters);
    };

    const toggleOrganization = (org: string) => {
        const newOrgs = selectedFilters.organizations.includes(org)
            ? selectedFilters.organizations.filter(o => o !== org)
            : [...selectedFilters.organizations, org];

        handleFilterChange({
            ...selectedFilters,
            organizations: newOrgs,
        });
    };

    const toggleSigned = (value: boolean | null) => {
        handleFilterChange({
            ...selectedFilters,
            signed: selectedFilters.signed === value ? null : value,
        });
    };

    const togglePlayer = (player: string) => {
        const newPlayers = selectedFilters.players.includes(player)
            ? selectedFilters.players.filter(p => p !== player)
            : [...selectedFilters.players, player];

        handleFilterChange({
            ...selectedFilters,
            players: newPlayers,
        });
    };

    const toggleSeason = (season: string) => {
        const newSeasons = selectedFilters.seasons.includes(season)
            ? selectedFilters.seasons.filter(s => s !== season)
            : [...selectedFilters.seasons, season];

        handleFilterChange({
            ...selectedFilters,
            seasons: newSeasons,
        });
    };

    const renderFilterSection = (
        title: string,
        options: FilterOption[],
        selectedValues: string[],
        onToggle: (value: string) => void,
        maxVisibleWithoutScroll: number = 5
    ) => {
        const needsScrolling = options.length > maxVisibleWithoutScroll;

        return (
            <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">{title}</h3>
                <div className={needsScrolling ? "max-h-40 overflow-y-auto space-y-2 pr-2" : "space-y-2"}>
                    {options.map((option) => (
                        <label
                            key={option.value}
                            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                        >
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(option.value)}
                                    onChange={() => onToggle(option.value)}
                                    className="h-4 w-4 text-black border-gray-300 rounded focus:ring-0 focus:ring-offset-0"
                                />
                                <span className="ml-3 text-sm text-gray-700 truncate max-w-[150px]">
                                    {option.value}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                ({option.count})
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    const renderSignedSection = () => (
        <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">サイン入り</h3>
            <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedFilters.signed === true}
                            onChange={() => toggleSigned(true)}
                            className="h-4 w-4 text-black border-gray-300 rounded focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="ml-3 text-sm text-gray-700">はい</span>
                    </div>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">(247)</span>
                </label>
                <label className="flex items-center justify-between cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            checked={selectedFilters.signed === false}
                            onChange={() => toggleSigned(false)}
                            className="h-4 w-4 text-black border-gray-300 rounded focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="ml-3 text-sm text-gray-700">いいえ</span>
                    </div>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">(1,834)</span>
                </label>
            </div>
        </div>
    );

    const DashedSeparator = () => (
        <hr className="border-0 border-t border-dashed border-gray-300 my-6" />
    );

    if (isLoading) {
        return (
            <div className={`category-filter p-4 ${className}`}>
                <div className="text-lg font-medium mb-4 text-gray-900">カテゴリ</div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    {/* <span className="ml-3 text-sm text-gray-500">読み込み中...</span> */}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`category-filter p-4 ${className}`}>
                <div className="text-lg font-medium mb-4 text-gray-900">カテゴリ</div>
                <div className="text-sm text-red-500 py-4">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className={`category-filter p-4 ${className}`}>
            <div className="text-lg font-bold mb-6 text-gray-900 pb-3">
                カテゴリ
            </div>

            {renderFilterSection(
                '領域',
                filterData.organizations,
                selectedFilters.organizations,
                toggleOrganization
            )}

            <DashedSeparator />

            {renderSignedSection()}

            <DashedSeparator />

            {renderFilterSection(
                '選手',
                filterData.players,
                selectedFilters.players,
                togglePlayer
            )}

            <DashedSeparator />

            {renderFilterSection(
                'シーズン',
                filterData.seasons,
                selectedFilters.seasons,
                toggleSeason
            )}

            {(selectedFilters.organizations.length > 0 ||
                selectedFilters.signed !== null ||
                selectedFilters.players.length > 0 ||
                selectedFilters.seasons.length > 0) && (
                    <>
                        <DashedSeparator />
                        <button
                            onClick={() => handleFilterChange({
                                organizations: [],
                                signed: null,
                                players: [],
                                seasons: [],
                            })}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 text-center border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                        >
                            フィルターをクリア
                        </button>
                    </>
                )}
        </div>
    );
};

export type { CategoryFilterProps, SelectedFilters, FilterOption, CategoryFilterData };

export default CategoryFilter;
