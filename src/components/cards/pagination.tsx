'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    className = '',
}) => {
    const handlePageChange = (page: number) => {
        const validPage = Math.max(1, Math.min(page || 1, totalPages || 1));
        if (validPage !== currentPage) {
            onPageChange(validPage);
        }
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <nav className="flex items-center space-x-3">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${currentPage === 1
                            ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>

                {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }, (_, i) => {
                    const startPage = Math.max(1, Math.min(totalPages - 4, currentPage - 2));
                    const pageNum = startPage + i;
                    if (pageNum <= totalPages && pageNum >= 1) {
                        const isActive = pageNum === currentPage;
                        return (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${isActive
                                        ? 'bg-black text-white shadow-md'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    }
                    return null;
                }).filter(Boolean)}

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${currentPage === totalPages
                            ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                            : 'bg-white border-gray-300 hover:bg-gray-50'
                        }`}
                    aria-label="Next page"
                >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
            </nav>
        </div>
    );
};

export default Pagination;