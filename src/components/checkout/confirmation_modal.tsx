'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';

interface ConfirmationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderSummary: {
        subtotal: number;
        shipping: number;
        total: number;
        totalJPY: number;
    };
}

export default function ConfirmationModal({
    open,
    onOpenChange,
    orderSummary,
}: ConfirmationModalProps) {
    const router = useRouter();

    const handleContinueShopping = () => {
        onOpenChange(false);
        router.push('/cards');
    };

    const handleGoToProfile = () => {
        onOpenChange(false);
        router.push('/me');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-white p-10 rounded-2xl" closeButtonPosition="inside">
                <div className="flex flex-col items-center justify-center gap-6">
                    <CheckCircle2 className="w-20 h-20 text-green-500" />
                    
                    <h2 className="text-3xl font-bold text-center">注文しました</h2>
                    
                    <div className="w-full bg-gray-50 p-6 rounded-xl space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">小計</span>
                            <span className="font-medium">US ${orderSummary.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">配送</span>
                            <span className="font-medium">US ${orderSummary.shipping.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-3 flex justify-between">
                            <span className="font-semibold">合計</span>
                            <div className="text-right">
                                <div className="font-bold text-lg">US ${orderSummary.total.toFixed(2)}</div>
                                <div className="text-sm text-gray-600">JPY ¥{orderSummary.totalJPY.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full space-y-3 pt-2">
                        <button
                            onClick={handleContinueShopping}
                            className="bg-black text-white rounded-full py-3 w-full hover:opacity-90 transition-opacity font-semibold"
                        >
                            カテゴリーを探す
                        </button>
                        <button
                            onClick={handleGoToProfile}
                            className="border-2 border-gray-300 text-gray-700 rounded-full py-3 w-full hover:bg-gray-50 transition-colors font-semibold"
                        >
                            個人情報を変更する
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
