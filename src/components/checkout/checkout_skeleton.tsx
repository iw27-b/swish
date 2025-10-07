'use client';

import React from 'react';

export default function CheckoutSkeleton() {
    return (
        <div className="py-16 px-8 md:px-16 lg:px-32 animate-pulse">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-3/5 pr-0 md:pr-8">
                    <div className="mb-8 pb-6 border-b border-dashed border-gray-200">
                        <div className="h-6 w-16 bg-gray-200 rounded mb-4"></div>
                        <div className="flex gap-3 mb-4">
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                            <div className="h-8 w-16 bg-gray-200 rounded"></div>
                        </div>
                        <div className="h-12 w-full bg-gray-200 rounded-2xl"></div>
                    </div>

                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <div className="h-6 w-16 bg-gray-200 rounded"></div>
                            <div className="h-8 w-16 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-gray-200 rounded"></div>
                            <div className="h-4 w-40 bg-gray-200 rounded"></div>
                            <div className="h-4 w-64 bg-gray-200 rounded"></div>
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                        </div>
                    </div>

                    <div className="mb-8 pb-6 border-b border-dashed border-gray-200">
                        <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
                        <div className="space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-20 h-20 bg-gray-200 rounded"></div>
                                    <div className="flex-1">
                                        <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-2/5 pl-0 md:pl-8">
                    <div className="sticky top-16 bg-gray-50 p-6 rounded-[48px] shadow-sm">
                        <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
                        
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between">
                                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                            </div>
                            <div className="flex justify-between">
                                <div className="h-4 w-12 bg-gray-200 rounded"></div>
                                <div className="h-4 w-20 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-px w-full bg-gray-300"></div>
                            <div className="flex justify-between">
                                <div className="h-5 w-12 bg-gray-200 rounded"></div>
                                <div className="h-5 w-24 bg-gray-200 rounded"></div>
                            </div>
                        </div>

                        <div className="h-4 w-48 bg-gray-200 rounded mb-4"></div>
                        <div className="h-12 w-full bg-gray-200 rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

