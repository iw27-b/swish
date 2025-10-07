'use client';

/**
 * AddressModal - A reusable modal for editing shipping addresses
 * 
 * @param open - Whether the modal is open
 * @param onOpenChange - Callback when modal open state changes
 * @param onSave - Callback after successful save (receives address data)
 * @param initialAddress - Pre-populated address data
 * @param user - Current logged-in user (used as fallback if userData not provided)
 * @param userData - Pre-fetched user data to avoid double-fetching
 * @param targetUserId - User ID to update (for admin editing other users)
 * @param updateBackend - Whether to update backend directly (default: false)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { authFetch } from '@/lib/client_auth';
import { Loader2 } from 'lucide-react';

export interface ShippingAddress {
    name: string;
    phone: string;
    streetAddress: string;
    building?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface AddressModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (address: ShippingAddress) => void;
    initialAddress?: ShippingAddress;
    user?: any;
    userData?: any;
    targetUserId?: string;
    updateBackend?: boolean;
}

export default function AddressModal({
    open,
    onOpenChange,
    onSave,
    initialAddress,
    user,
    userData,
    targetUserId,
    updateBackend = false,
}: AddressModalProps) {
    const [formData, setFormData] = useState<ShippingAddress>({
        name: '',
        phone: '',
        streetAddress: '',
        building: '',
        city: '',
        state: '',
        postalCode: '',
        country: '日本',
    });

    const [isAtBottom, setIsAtBottom] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const getCountryConfig = (country: string) => {
        switch (country) {
            case 'アメリカ':
                return {
                    labels: {
                        postalCode: 'ZIP Code',
                        state: 'State',
                        city: 'City',
                        streetAddress: 'Street Address',
                        building: 'Apt/Suite (Optional)'
                    },
                    placeholders: {
                        postalCode: '12345',
                        state: 'California',
                        city: 'Los Angeles',
                        streetAddress: '123 Main St',
                        building: 'Apt 4B'
                    }
                };
            case '中国':
                return {
                    labels: {
                        postalCode: '邮政编码',
                        state: '省/直辖市',
                        city: '城市',
                        streetAddress: '街道地址',
                        building: '楼号/单元号'
                    },
                    placeholders: {
                        postalCode: '100000',
                        state: '北京市',
                        city: '朝阳区',
                        streetAddress: '建国路1号',
                        building: '3号楼201室'
                    }
                };
            case '韓国':
                return {
                    labels: {
                        postalCode: '우편번호',
                        state: '시/도',
                        city: '시/군/구',
                        streetAddress: '도로명 주소',
                        building: '상세주소'
                    },
                    placeholders: {
                        postalCode: '06000',
                        state: '서울특별시',
                        city: '강남구',
                        streetAddress: '테헤란로 123',
                        building: '101동 201호'
                    }
                };
            case '日本':
            default:
                return {
                    labels: {
                        postalCode: '郵便番号',
                        state: '都道府県',
                        city: '市区町村',
                        streetAddress: '番地',
                        building: '建物名・部屋番号'
                    },
                    placeholders: {
                        postalCode: '1660002',
                        state: '東京都',
                        city: '杉並区',
                        streetAddress: '4-32-9',
                        building: 'ジュネスS 303室'
                    }
                };
        }
    };

    const countryConfig = getCountryConfig(formData.country);

    useEffect(() => {
        if (initialAddress && initialAddress.name) {
            setFormData(initialAddress);
        } else if (open) {
            const sourceUser = userData || user;
            
            if (sourceUser) {
                const shippingAddr = sourceUser.shippingAddress as any;
                setFormData({
                    name: sourceUser.name || '',
                    phone: sourceUser.phoneNumber || '',
                    streetAddress: shippingAddr?.street || '',
                    building: '',
                    city: shippingAddr?.city || '',
                    state: shippingAddr?.state || '',
                    postalCode: shippingAddr?.zipCode || '',
                    country: shippingAddr?.country || '日本',
                });
            }
        }
    }, [initialAddress, user, userData, open]);

    useEffect(() => {
        if (!open) return;

        const checkScroll = () => {
            if (scrollRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
                setIsAtBottom(atBottom);
            }
        };

        const timeoutId = setTimeout(() => {
            const scrollElement = scrollRef.current;
            if (scrollElement) {
                checkScroll();
                scrollElement.addEventListener('scroll', checkScroll, { passive: true });
            } else {
                console.warn('[address_modal.tsx] scrollRef still null after timeout');
            }
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            if (scrollRef.current) {
                scrollRef.current.removeEventListener('scroll', checkScroll);
            }
        };
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.streetAddress || !formData.city || !formData.postalCode) {
            // TODO: add error message in modal
            return;
        }
        
        setIsSaving(true);

        if (updateBackend) {
            try {
                const userIdToUpdate = targetUserId || user?.id;
                
                if (!userIdToUpdate) {
                    console.error('No user ID available for backend update');
                    return;
                }
                const addressData = {
                    shippingAddress: {
                        street: formData.streetAddress,
                        city: formData.city,
                        state: formData.state,
                        zipCode: formData.postalCode,
                        country: formData.country,
                    },
                    name: formData.name,
                    phoneNumber: formData.phone,
                };
                
                const endpoint = targetUserId 
                    ? `/api/users/${targetUserId}/profile`
                    : '/api/users/me';
                
                const response = await authFetch(endpoint, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(addressData),
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update address');
                }
                onSave(formData);
            } catch (error) {
                console.error('Error updating address:', error);
                alert('住所の更新に失敗しました');
            } finally {
                setIsSaving(false);
            }
        } else {
            onSave(formData);
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="sm:max-w-[450px] bg-gray-100 p-8 rounded-4xl max-h-[80vh]"
                closeButtonPosition="outside"
            >
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">住所</DialogTitle>
                    <div className="sr-only">配送先住所を入力してください</div>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="relative">
                        {isAtBottom && (
                            <div 
                                className="absolute top-0 left-0 right-0 h-12 pointer-events-none z-10"
                                style={{
                                    background: 'linear-gradient(to bottom, rgba(243, 244, 246, 0.9) 0%, rgba(243, 244, 246, 0.7) 30%, transparent 100%)'
                                }}
                            />
                        )}
                        
                        {!isAtBottom && (
                            <div 
                                className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none z-10"
                                style={{
                                    background: 'linear-gradient(to top, rgba(243, 244, 246, 0.9) 0%, rgba(243, 244, 246, 0.7) 30%, transparent 100%)'
                                }}
                            />
                        )}
                        
                        <div 
                            ref={scrollRef}
                            className="space-y-4 overflow-y-auto pr-2 max-h-[50vh] scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                        >
                            <div className="space-y-2">
                            <Label htmlFor="name" className="font-bold">名前</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Jason"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="font-bold">電話番号</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="090-1234-5678"
                                className="bg-white"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <hr className="border-t border-dashed border-gray-400 my-6" />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="country" className="font-bold">国家</Label>
                                <Select
                                    value={formData.country}
                                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                                >
                                    <SelectTrigger className="w-full bg-white">
                                        <SelectValue placeholder="国を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="日本">日本</SelectItem>
                                        <SelectItem value="アメリカ">アメリカ</SelectItem>
                                        <SelectItem value="中国">中国</SelectItem>
                                        <SelectItem value="韓国">韓国</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="postalCode" className="font-bold">{countryConfig.labels.postalCode}</Label>
                                <Input
                                    id="postalCode"
                                    type="text"
                                    placeholder={countryConfig.placeholders.postalCode}
                                    value={formData.postalCode}
                                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                    required
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="state" className="font-bold">{countryConfig.labels.state}</Label>
                                <Input
                                    id="state"
                                    type="text"
                                    placeholder={countryConfig.placeholders.state}
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    required
                                    className="bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="city" className="font-bold">{countryConfig.labels.city}</Label>
                                <Input
                                    id="city"
                                    type="text"
                                    placeholder={countryConfig.placeholders.city}
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    required
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="streetAddress" className="font-bold">{countryConfig.labels.streetAddress}</Label>
                            <Input
                                id="streetAddress"
                                type="text"
                                placeholder={countryConfig.placeholders.streetAddress}
                                value={formData.streetAddress}
                                onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                                required
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="building" className="font-bold">{countryConfig.labels.building}</Label>
                            <Input
                                id="building"
                                type="text"
                                placeholder={countryConfig.placeholders.building}
                                value={formData.building || ''}
                                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                                className="bg-white"
                            />
                        </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-6 pt-4">
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
                                '保存'
                            )}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
