'use client';

/**
 * PaymentModal
 * 
 * @param open - Whether the modal is open
 * @param onOpenChange - Callback when modal open state changes
 * @param onSave - Callback after successful save (receives payment method ID)
 * @param user - Current logged-in user
 * @param userData - Pre-fetched user data with saved cards metadata
 * @param targetUserId - User ID to update (for admin editing)
 * @param updateBackend - Whether to save to backend directly
 */

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authFetch } from '@/lib/client_auth';
import { Loader2 } from 'lucide-react';

export interface PaymentMethodData {
    id: string;
    cardBrand: string;
    last4: string;
    expiryMonth: string;
    expiryYear: string;
    nickname?: string;
    isTemporary?: boolean;
    fullCardNumber?: string;
    cardholderName?: string;
    cvv?: string;
}

const FIRST_DIGIT_TO_BRAND: Record<string, { brand: string; image: string }> = {
    '3': { brand: 'amex', image: '/images/paymentmethods/amex.svg' },
    '4': { brand: 'visa', image: '/images/paymentmethods/visa.svg' },
    '5': { brand: 'mastercard', image: '/images/paymentmethods/mastercard.svg' },
    '6': { brand: 'discover', image: '/images/paymentmethods/discover.png' },
};

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (paymentMethodData: PaymentMethodData) => void;
    user?: any;
    userData?: any;
    targetUserId?: string;
    updateBackend?: boolean;
}

export default function PaymentModal({
    open,
    onOpenChange,
    onSave,
    user,
    userData,
    targetUserId,
    updateBackend = false,
}: PaymentModalProps) {
    const [cardNumber, setCardNumber] = useState('');
    const [expiryMonth, setExpiryMonth] = useState('');
    const [expiryYear, setExpiryYear] = useState('');
    const [securityCode, setSecurityCode] = useState('');
    const [cardholderName, setCardholderName] = useState('');
    const [saveCard, setSaveCard] = useState(false);
    const [cardNickname, setCardNickname] = useState('');
    const [detectedBrand, setDetectedBrand] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const yearInputRef = useRef<HTMLInputElement>(null);

    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\s/g, '');
        const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
        return formatted.substring(0, 19);
    };

    const handleMonthChange = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 2) {
            setExpiryMonth(cleaned);
            if (cleaned.length === 2 && yearInputRef.current) {
                yearInputRef.current.focus();
            }
        }
    };

    const handleYearChange = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 2) {
            setExpiryYear(cleaned);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!cardNumber || !expiryMonth || !expiryYear || !securityCode || !cardholderName) {
            alert('すべてのフィールドを入力してください');
            return;
        }

        const month = parseInt(expiryMonth);
        if (month < 1 || month > 12) {
            alert('有効な月を入力してください（01-12）');
            return;
        }

        const parsedYear = parseInt(expiryYear, 10);
        const year = expiryYear.length === 2 ? 2000 + parsedYear : parsedYear;
        const now = new Date();
        const currentYear = now.getUTCFullYear();
        const currentMonth = now.getUTCMonth() + 1; // 1-12
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            alert('カードの有効期限が切れています');
            return;
        }

        if (saveCard && !cardNickname) {
            alert('カードのニックネームを入力してください');
            return;
        }

        setIsSaving(true);

        const tempId = globalThis.crypto?.randomUUID ? `temp_${globalThis.crypto.randomUUID()}` : `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const cardBrand = detectedBrand || detectCardBrand(cardNumber);
        const last4 = cardNumber.replace(/\s/g, '').slice(-4);
        const cleanedCardNumber = cardNumber.replace(/\s/g, '');
        
        const paymentMethodData: PaymentMethodData = {
            id: saveCard ? '' : tempId,
            cardBrand,
            last4,
            expiryMonth,
            expiryYear,
            nickname: saveCard ? cardNickname : undefined,
            isTemporary: !saveCard,
            fullCardNumber: !saveCard ? cleanedCardNumber : undefined,
            cardholderName: !saveCard ? cardholderName : undefined,
            cvv: !saveCard ? securityCode : undefined
        };

        if (updateBackend && saveCard) {
            try {
                const backendPaymentData = {
                    paymentMethods: [{
                        cardNumber: cardNumber.replace(/\s/g, ''),
                        expiryMonth,
                        expiryYear,
                        cvv: securityCode,
                        cardholderName,
                        cardBrand,
                        last4,
                        nickname: cardNickname,
                    }]
                };

                const response = await authFetch('/api/users/me/payment-methods', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(backendPaymentData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save payment method');
                }

                const result = await response.json();
                const data = result?.data;
                if (!data || typeof data.id !== 'string' || !data.id.startsWith('card_')) {
                    throw new Error('Invalid server response when saving payment method');
                }

                onSave({
                    id: data.id,
                    cardBrand: data.cardBrand || cardBrand,
                    last4: data.last4 || last4,
                    expiryMonth: data.expiryMonth || expiryMonth,
                    expiryYear: data.expiryYear || expiryYear,
                    nickname: data.nickname || cardNickname,
                });
            } catch (error) {
                console.error('Error saving payment method');
                alert(error instanceof Error ? error.message : 'カード情報の保存に失敗しました');
                setIsSaving(false);
                return;
            }
        } else {
            onSave(paymentMethodData);
        }

        setCardNumber('');
        setExpiryMonth('');
        setExpiryYear('');
        setSecurityCode('');
        setCardholderName('');
        setSaveCard(false);
        setCardNickname('');
        setDetectedBrand('');
        setIsSaving(false);
    };

    const detectCardBrand = (number: string): string => {
        const cleaned = number.replace(/\s/g, '');
        const firstDigit = cleaned[0];
        return FIRST_DIGIT_TO_BRAND[firstDigit]?.brand || '';
    };

    const handleCardNumberChange = (value: string) => {
        const formatted = formatCardNumber(value);
        setCardNumber(formatted);
        setDetectedBrand(detectCardBrand(value));
    };

    const handleCancel = () => {
        onOpenChange(false);
        setCardNumber('');
        setExpiryMonth('');
        setExpiryYear('');
        setSecurityCode('');
        setCardholderName('');
        setSaveCard(false);
        setCardNickname('');
        setDetectedBrand('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="sm:max-w-[450px] bg-gray-100 p-8 rounded-4xl"
                closeButtonPosition="outside"
            >
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        クレジットカードまたはデビットカード
                    </DialogTitle>
                    <div className="sr-only">クレジットカード情報を入力してください</div>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="cardNumber" className="font-bold">カード番号</Label>
                        <div className="relative">
                            <Input
                                id="cardNumber"
                                type="text"
                                placeholder="1234 5678 9012 3456"
                                value={cardNumber}
                                onChange={(e) => handleCardNumberChange(e.target.value)}
                                required
                                className="bg-white pr-16"
                            />
                            {detectedBrand && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-10">
                                    <Image
                                        src={FIRST_DIGIT_TO_BRAND[cardNumber.replace(/\s/g, '')[0]]?.image || ''}
                                        alt={detectedBrand}
                                        width={40}
                                        height={20}
                                        className="object-contain max-h-full"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="expiryMonth" className="font-bold">有効期限</Label>
                            <Input
                                id="expiryMonth"
                                type="text"
                                inputMode="numeric"
                                placeholder="MM"
                                value={expiryMonth}
                                onChange={(e) => handleMonthChange(e.target.value)}
                                maxLength={2}
                                required
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expiryYear" className="font-bold text-transparent">Year</Label>
                            <Input
                                ref={yearInputRef}
                                id="expiryYear"
                                type="text"
                                inputMode="numeric"
                                placeholder="YY"
                                value={expiryYear}
                                onChange={(e) => handleYearChange(e.target.value)}
                                maxLength={2}
                                required
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="securityCode" className="font-bold">CVV</Label>
                            <Input
                                id="securityCode"
                                type="text"
                                inputMode="numeric"
                                placeholder="123"
                                value={securityCode}
                                onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                required
                                className="bg-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cardholderName" className="font-bold">カード名義人</Label>
                        <Input
                            id="cardholderName"
                            type="text"
                            placeholder="山田 太郎"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            required
                            className="bg-white"
                        />
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-start gap-2">
                            <Checkbox
                                id="saveCard"
                                checked={saveCard}
                                onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                            />
                            <label
                                htmlFor="saveCard"
                                className="text-sm text-gray-700 cursor-pointer"
                            >
                                このカードを保存する
                            </label>
                        </div>

                        {saveCard && (
                            <div className="space-y-2 ml-6">
                                <Label htmlFor="cardNickname" className="font-bold text-sm">カードのニックネーム</Label>
                                <Input
                                    id="cardNickname"
                                    type="text"
                                    placeholder="例: メインカード"
                                    value={cardNickname}
                                    onChange={(e) => setCardNickname(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-gray-600 hover:text-gray-800 transition-colors font-medium"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-black text-white rounded-full px-8 py-3 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 min-h-[48px]"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>保存中</span>
                                </>
                            ) : (
                                '完了'
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
