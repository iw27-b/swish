'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import LoadingSpinner from '@/components/loading_spinner';
import { useAuth } from '@/lib/client_auth';

export default function CheckoutCompletePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const orderId = searchParams.get('orderId') || 'N/A';
    const itemCount = parseInt(searchParams.get('items') || '0');
    const subtotal = parseFloat(searchParams.get('subtotal') || '0');
    const shipping = parseFloat(searchParams.get('shipping') || '0');
    const total = subtotal + shipping;
    const totalJPY = Math.round(total * 150);

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            router.push('/auth/login');
        }
    }, [user, authLoading, router]);

    const handleBackToCategories = () => {
        router.push('/cards');
    };

    const handleViewProfile = () => {
        router.push('/me');
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-white">
                <LoadingSpinner fullScreen={false} size={48} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col animate-fade-in">
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-md flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-20 h-20 text-white" strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="w-full bg-gray-50 rounded-[48px] p-8 shadow-sm">
                        <h1 className="text-3xl font-bold text-center mb-2">注文しました</h1>
                        <p className="text-sm text-gray-500 text-center mb-6"># {orderId}</p>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">アイテム</span>
                                <span className="font-semibold">{itemCount}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">配送</span>
                                <span className="font-semibold">US ${shipping.toFixed(2)}</span>
                            </div>

                            <hr className="border-t border-dashed border-gray-300" />

                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">小計</span>
                                <span className="font-semibold">US ${subtotal.toFixed(2)}</span>
                            </div>

                            <hr className="border-t border-dashed border-gray-300" />

                            <div className="flex justify-between items-center pt-2">
                                <span className="font-bold text-lg">合計</span>
                                <div className="text-right">
                                    <div className="font-bold text-xl">US ${total.toFixed(2)}</div>
                                    <div className="text-sm text-gray-600">JPY ¥{totalJPY.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-8">
                            <button
                                onClick={handleBackToCategories}
                                className="w-full bg-black text-white font-semibold py-3 rounded-full hover:opacity-90 transition-opacity"
                            >
                                カテゴリー戻す
                            </button>
                            <button
                                onClick={handleViewProfile}
                                className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                個人情報を見る
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

