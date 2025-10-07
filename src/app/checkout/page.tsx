'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AddressModal from '@/components/checkout/address_modal';
import PaymentModal, { PaymentMethodData as SavedPaymentMethod } from '@/components/checkout/payment_modal';
import CheckoutSkeleton from '@/components/checkout/checkout_skeleton';
import LoadingSpinner from '@/components/loading_spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth, authFetch } from '@/lib/client_auth';
import {
    Pencil,
    Loader2,
    Ghost
} from 'lucide-react';

interface ShippingAddress {
    name: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface CartItem {
    id: string;
    cardId: string;
    card: {
        id: string;
        name: string;
        player: string;
        price: number;
        imageUrl: string | null;
    };
}

interface CartData {
    items: CartItem[];
    totalPrice: number;
}

export default function CheckoutPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartData | null>(null);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [processingOrder, setProcessingOrder] = useState(false);
    const [errors, setErrors] = useState<{
        terms?: string;
        address?: string;
        payment?: string;
        cvv?: string;
        general?: string;
    }>({});
    
    const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
        name: '',
        phone: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        country: '日本', // default to japan
    });
    
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
    const [temporaryPaymentMethod, setTemporaryPaymentMethod] = useState<SavedPaymentMethod | null>(null);
    const [cvv, setCvv] = useState<string>('');
    const [showReplaceCardDialog, setShowReplaceCardDialog] = useState(false);
    const [pendingPaymentMethod, setPendingPaymentMethod] = useState<SavedPaymentMethod | null>(null);
    const [orderSummary, setOrderSummary] = useState({
        subtotal: 0,
        shipping: 24.00,
        total: 0,
        totalJPY: 0,
    });

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            router.push('/auth/login');
            return;
        }
        fetchCart();
        fetchUserProfile();
        loadTemporaryPaymentFromSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, router]);

    useEffect(() => {
        if (cart) {
            const subtotal = cart.totalPrice;
            const total = subtotal + orderSummary.shipping;
            const totalJPY = Math.round(total * 150);
            
            setOrderSummary({
                subtotal,
                shipping: orderSummary.shipping,
                total,
                totalJPY,
            });
        }
    }, [cart]);

    const fetchCart = async () => {
        try {
            const response = await fetch('/api/cart', {
                credentials: 'include',
            });
            
            if (response.ok) {
                const data = await response.json();
                setCart(data.data);
            } else {
                console.error('Failed to fetch cart');
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProfile = async () => {
        try {
            const response = await fetch('/api/users/me', {
                credentials: 'include',
            });
            
            if (response.ok) {
                const data = await response.json();
                const userData = data.data;

                if (userData.shippingAddress) {
                    const addr = userData.shippingAddress;
                    setShippingAddress({
                        name: userData.name || '',
                        phone: userData.phoneNumber || '',
                        streetAddress: addr.street || '',
                        city: addr.city || '',
                        state: addr.state || '',
                        postalCode: addr.zipCode || '',
                        country: addr.country || '日本',
                    });
                }

                if (userData.paymentMethods && Array.isArray(userData.paymentMethods)) {
                    setSavedPaymentMethods(userData.paymentMethods);
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    const loadTemporaryPaymentFromSession = () => {
        try {
            const stored = sessionStorage.getItem('tempPaymentMethod');
            if (stored) {
                const parsed = JSON.parse(stored);
                setTemporaryPaymentMethod(parsed);
                setPaymentMethod(parsed.id);
            }
        } catch (error) {
            console.error('Error loading temporary payment method:', error);
        }
    };

    const saveTemporaryPaymentToSession = (method: SavedPaymentMethod | null) => {
        try {
            if (method) {
                sessionStorage.setItem('tempPaymentMethod', JSON.stringify(method));
            } else {
                sessionStorage.removeItem('tempPaymentMethod');
            }
        } catch (error) {
            console.error('Error saving temporary payment method:', error);
        }
    };

    const clearCheckoutState = () => {
        setTemporaryPaymentMethod(null);
        setPaymentMethod('');
        setCvv('');
        saveTemporaryPaymentToSession(null);
    };

    const handleAddressSave = (address: ShippingAddress) => {
        setShippingAddress(address);
        setAddressModalOpen(false);
        if (errors.address) {
            setErrors(prev => ({ ...prev, address: undefined }));
        }
    };

    const handlePaymentSave = (paymentMethodData: SavedPaymentMethod) => {
        if (paymentMethodData.isTemporary) {
            if (temporaryPaymentMethod) {
                setPendingPaymentMethod(paymentMethodData);
                setShowReplaceCardDialog(true);
                return;
            }
            setTemporaryPaymentMethod(paymentMethodData);
            setPaymentMethod(paymentMethodData.id);
            saveTemporaryPaymentToSession(paymentMethodData);
        } else {
            if (paymentMethodData.id && savedPaymentMethods.every(pm => pm.id !== paymentMethodData.id)) {
                setSavedPaymentMethods(prev => [...prev, paymentMethodData]);
            }
            setPaymentMethod(paymentMethodData.id);
        }
        
        setCvv('');
        
        if (errors.payment) {
            setErrors(prev => ({ ...prev, payment: undefined }));
        }
        
        setPaymentModalOpen(false);
        
    };

    const handleConfirmReplaceCard = () => {
        if (pendingPaymentMethod) {
            setTemporaryPaymentMethod(pendingPaymentMethod);
            setPaymentMethod(pendingPaymentMethod.id);
            saveTemporaryPaymentToSession(pendingPaymentMethod);
            setPendingPaymentMethod(null);
        }
        setShowReplaceCardDialog(false);
        setPaymentModalOpen(false);
    };

    const handleCancelReplaceCard = () => {
        setPendingPaymentMethod(null);
        setShowReplaceCardDialog(false);
    };

    const handlePaymentMethodSelect = (methodId: string) => {
        setPaymentMethod(methodId);
        setCvv('');
        if (temporaryPaymentMethod && temporaryPaymentMethod.id !== methodId) {
            setTemporaryPaymentMethod(null);
            saveTemporaryPaymentToSession(null);
        }
        if (errors.payment) {
            setErrors(prev => ({ ...prev, payment: undefined }));
        }
    };

    const handlePurchase = async () => {
        setErrors({});

        const newErrors: typeof errors = {};

        if (!agreeToTerms) {
            newErrors.terms = 'プライバシー通知に同意してください';
        }

        if (!shippingAddress.name || !shippingAddress.streetAddress) {
            newErrors.address = '配送先住所を入力してください';
        }

        if (!paymentMethod) {
            newErrors.payment = '支払い方法を選択してください';
        }

        const isTemporaryMethod = temporaryPaymentMethod?.id === paymentMethod;
        const isSavedMethod = savedPaymentMethods.some(pm => pm.id === paymentMethod);
        
        if (isSavedMethod && (!cvv || cvv.length < 3)) {
            newErrors.cvv = 'セキュリティコード (CVV) を入力してください';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            if (newErrors.address) setAddressModalOpen(true);
            if (newErrors.payment) setPaymentModalOpen(true);
            return;
        }

        setProcessingOrder(true);

        try {
            const checkoutPayload: any = {
                shippingAddress: {
                    name: shippingAddress.name,
                    phone: shippingAddress.phone,
                    streetAddress: shippingAddress.streetAddress,
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    postalCode: shippingAddress.postalCode,
                    country: shippingAddress.country,
                }
            };

            if (temporaryPaymentMethod?.id === paymentMethod && temporaryPaymentMethod.isTemporary) {
                checkoutPayload.oneTimePayment = {
                    cardNumber: temporaryPaymentMethod.fullCardNumber,
                    expiryMonth: temporaryPaymentMethod.expiryMonth,
                    expiryYear: temporaryPaymentMethod.expiryYear,
                    cvv: temporaryPaymentMethod.cvv,
                    cardholderName: temporaryPaymentMethod.cardholderName,
                    cardBrand: temporaryPaymentMethod.cardBrand
                };
            } else {
                checkoutPayload.paymentMethodId = paymentMethod;
                checkoutPayload.cvv = cvv;
            }

            const response = await authFetch('/api/cart/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(checkoutPayload),
            });

            const result = await response.json();

            if (response.ok) {
                const params = new URLSearchParams({
                    orderId: result.data.transactionId || 'N/A',
                    items: cart?.items.length.toString() || '0',
                    subtotal: orderSummary.subtotal.toString(),
                    shipping: orderSummary.shipping.toString(),
                });
                
                clearCheckoutState();
                router.push(`/checkout/complete?${params.toString()}`);
            } else {
                const errorMsg = result.message || result.error || '購入に失敗しました';
                if (errorMsg.toLowerCase().includes('cvv')) {
                    setErrors({ cvv: errorMsg });
                } else if (errorMsg.toLowerCase().includes('payment') || errorMsg.toLowerCase().includes('card')) {
                    setErrors({ payment: errorMsg });
                } else {
                    setErrors({ general: errorMsg });
                }
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setErrors({ general: '購入処理中にエラーが発生しました' });
        } finally {
            setProcessingOrder(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-white animate-fade-in">
                <CheckoutSkeleton />
            </div>
        );
    }

    if (!cart || cart.items.length === 0) {
        return (
            <div className="min-h-screen bg-white">
                <div className="flex flex-col items-center justify-center py-32">
                    <Ghost className="w-20 h-20 text-gray-400" />
                    <div className="text-2xl font-bold mb-4">カートは空です</div>
                    <button
                        onClick={() => router.push('/cards')}
                        className="bg-black text-white px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
                    >
                        カードを探す
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white animate-fade-in">
            
            <main className="max-w-7xl mx-auto px-16 md:px-32 py-16">
                <div className="flex flex-col md:flex-row">
                    <div className="flex-1 md:w-3/5 pr-0 md:pr-8">
                        {/* <div className="mb-8 flex justify-between items-center">
                            <div className="text-4xl font-bold">SWISH</div>
                            <div className="flex gap-1">
                                <span className="text-2xl font-bold text-[#ff5a00]">C</span>
                                <span className="text-2xl font-bold text-[#4169e1]">H</span>
                                <span className="text-2xl font-bold text-[#32cd32]">E</span>
                                <span className="text-2xl font-bold text-[#ff5a00]">C</span>
                                <span className="text-2xl font-bold text-[#ffd700]">K</span>
                                <span className="text-2xl font-bold text-[#9370db]">O</span>
                                <span className="text-2xl font-bold text-[#ff1493]">U</span>
                                <span className="text-2xl font-bold text-[#00ced1]">T</span>
                            </div>
                        </div> */}

                        <section className="border-b border-dashed border-gray-200 pb-6 mb-6">
                            <h2 className="text-3xl font-bold mb-4">支払い</h2>
                            
                            {errors.payment && (
                                <div className="mb-3 text-sm text-red-600 font-medium">
                                    {errors.payment}
                                </div>
                            )}
                            
                            <div className="flex gap-4 mb-4 items-center flex-wrap">
                                <div className="relative h-6 w-12">
                                    <Image 
                                        src="/images/paymentmethods/visa.svg" 
                                        alt="VISA" 
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <div className="relative h-6 w-12">
                                    <Image 
                                        src="/images/paymentmethods/mastercard.svg" 
                                        alt="MasterCard" 
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <div className="relative h-6 w-12">
                                    <Image 
                                        src="/images/paymentmethods/amex.svg" 
                                        alt="AMEX" 
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <div className="relative h-6 w-12">
                                    <Image 
                                        src="/images/paymentmethods/discover.png" 
                                        alt="Discover" 
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            </div>

                            {(savedPaymentMethods.length > 0 || temporaryPaymentMethod) && (
                                <div className="space-y-3 mb-4">
                                    {temporaryPaymentMethod && (
                                        <div 
                                            key={temporaryPaymentMethod.id}
                                            className={`rounded-2xl border-2 border-dashed transition-all ${
                                                paymentMethod === temporaryPaymentMethod.id
                                                    ? 'border-black bg-gray-50'
                                                    : 'border-gray-400 hover:border-gray-500'
                                            }`}
                                        >
                                            <button
                                                onClick={() => handlePaymentMethodSelect(temporaryPaymentMethod.id)}
                                                className="w-full p-4 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="relative h-8 w-12 flex-shrink-0">
                                                        <Image 
                                                            src={`/images/paymentmethods/${temporaryPaymentMethod.cardBrand || 'visa'}.svg`}
                                                            alt={temporaryPaymentMethod.cardBrand || 'Card'}
                                                            fill
                                                            className="object-contain"
                                                            onError={(e) => {
                                                                const target = e.currentTarget;
                                                                if (!target.dataset.fallbackAttempted) {
                                                                    target.dataset.fallbackAttempted = 'true';
                                                                    target.src = `/images/paymentmethods/${temporaryPaymentMethod.cardBrand || 'visa'}.png`;
                                                                } else if (!target.dataset.finalFallback) {
                                                                    target.dataset.finalFallback = 'true';
                                                                    target.src = '/images/paymentmethods/visa.svg';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    
                                                    <div className="text-left">
                                                        <div className="font-semibold flex items-center gap-2">
                                                            {temporaryPaymentMethod.cardBrand?.toUpperCase()} •••• {temporaryPaymentMethod.last4}
                                                            <span className="text-xs font-normal text-gray-500">(未保存)</span>
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            有効期限 {temporaryPaymentMethod.expiryMonth}/{temporaryPaymentMethod.expiryYear}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                    paymentMethod === temporaryPaymentMethod.id
                                                        ? 'border-black bg-black'
                                                        : 'border-gray-300'
                                                }`}>
                                                    {paymentMethod === temporaryPaymentMethod.id && (
                                                        <div className="w-2 h-2 bg-white rounded-full" />
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                    
                                    {savedPaymentMethods.map((method) => (
                                        <div 
                                            key={method.id}
                                            className={`rounded-2xl border-2 transition-all ${
                                                paymentMethod === method.id
                                                    ? 'border-black bg-gray-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <button
                                                onClick={() => handlePaymentMethodSelect(method.id)}
                                                className="w-full p-4 flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="relative h-8 w-12 flex-shrink-0">
                                                        <Image 
                                                            src={`/images/paymentmethods/${method.cardBrand || 'visa'}.svg`}
                                                            alt={method.cardBrand || 'Card'}
                                                            fill
                                                            className="object-contain"
                                                            onError={(e) => {
                                                                const target = e.currentTarget;
                                                                if (!target.dataset.fallbackAttempted) {
                                                                    target.dataset.fallbackAttempted = 'true';
                                                                    target.src = `/images/paymentmethods/${method.cardBrand || 'visa'}.png`;
                                                                } else if (!target.dataset.finalFallback) {
                                                                    target.dataset.finalFallback = 'true';
                                                                    target.src = '/images/paymentmethods/visa.svg';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    
                                                    <div className="text-left">
                                                        <div className="font-semibold">
                                                            {method.nickname || `${method.cardBrand?.toUpperCase()} •••• ${method.last4}`}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            •••• {method.last4} · 有効期限 {method.expiryMonth}/{method.expiryYear}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                    paymentMethod === method.id
                                                        ? 'border-black bg-black'
                                                        : 'border-gray-300'
                                                }`}>
                                                    {paymentMethod === method.id && (
                                                        <div className="w-2 h-2 bg-white rounded-full" />
                                                    )}
                                                </div>
                                            </button>
                                            
                                            {paymentMethod === method.id && (
                                                <div className="px-4 pb-4 pt-2 border-t border-gray-200">
                                                    {errors.cvv && (
                                                        <div className="mb-2 text-xs text-red-600 font-medium">
                                                            {errors.cvv}
                                                        </div>
                                                    )}
                                                    <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
                                                        セキュリティコード (CVV)
                                                    </label>
                                                    <input
                                                        id="cvv"
                                                        type="text"
                                                        inputMode="numeric"
                                                        placeholder={method.cardBrand === 'amex' ? '1234' : '123'}
                                                        value={cvv}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '');
                                                            const maxLength = method.cardBrand === 'amex' ? 4 : 3;
                                                            setCvv(value.substring(0, maxLength));
                                                            if (errors.cvv) {
                                                                setErrors(prev => ({ ...prev, cvv: undefined }));
                                                            }
                                                        }}
                                                        maxLength={method.cardBrand === 'amex' ? 4 : 3}
                                                        className={`w-28 px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-white ${
                                                            errors.cvv 
                                                                ? 'border-red-500 focus:ring-red-500' 
                                                                : 'border-gray-300 focus:ring-black'
                                                        }`}
                                                        autoFocus
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setPaymentModalOpen(true)}
                                className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-all flex items-center gap-4"
                            >
                                <div className="flex items-center justify-center h-8 w-12 flex-shrink-0">
                                    <svg 
                                        width="32" 
                                        height="32" 
                                        viewBox="0 0 32 32" 
                                        fill="none" 
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="text-gray-400"
                                    >
                                        <path 
                                            d="M16 8V24M8 16H24" 
                                            stroke="currentColor" 
                                            strokeWidth="2.5" 
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                                
                                <div className="text-left">
                                    <div className="font-semibold text-gray-700">
                                        新しいカードを追加する
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        クレジットカードまたはデビットカード
                                    </div>
                                </div>
                            </button>
                        </section>

                        <section className="border-b border-dashed border-gray-200 pb-6 mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-3xl font-semibold">発送先</h2>
                                <button
                                    onClick={() => setAddressModalOpen(true)}
                                    className="text-black font-medium hover:underline flex items-center gap-1"
                                >
                                    <Pencil className="w-4 h-4" />
                                    編集
                                </button>
                            </div>
                            {errors.address && (
                                <div className="mb-3 text-sm text-red-600 font-medium">
                                    {errors.address}
                                </div>
                            )}
                            {shippingAddress.name ? (
                                <div className="flex flex-col gap-1 text-sm text-gray-700">
                                    <div>{shippingAddress.name}</div>
                                    <div>{shippingAddress.phone}</div>
                                    <div>{shippingAddress.streetAddress}</div>
                                    <div>{shippingAddress.city}, {shippingAddress.state}</div>
                                    <div>{shippingAddress.postalCode}</div>
                                    <div>{shippingAddress.country}</div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500">住所を入力してください</div>
                            )}
                        </section>

                        <section>
                            <h2 className="text-3xl font-semibold mb-4">注文の確認</h2>
                            <div className="space-y-4">
                                {cart.items.map((item) => (
                                    <div key={item.id} className="flex gap-4 pb-4 border-b border-dashed border-gray-100">
                                        <div className="relative w-24 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                            {item.card.imageUrl && (
                                                <Image
                                                    src={item.card.imageUrl}
                                                    alt={item.card.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-sm font-medium mb-1">{item.card.name}</h3>
                                            <p className="text-sm text-gray-600 mb-2">{item.card.player}</p>
                                            <p className="text-sm font-semibold">US ${item.card.price.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-4">
                                ※当商品は随時に関税、手数料、税金を調整する場合があります
                            </p>
                        </section>
                    </div>

                    <aside className="md:w-2/5 pl-0 md:pl-8">
                        <div className="bg-gray-100 p-6 rounded-3xl shadow-sm md:sticky md:top-24">
                            <h2 className="text-3xl font-semibold mb-6">注文の概要</h2>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">小計</span>
                                    <span className="font-medium">US ${orderSummary.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">配送</span>
                                    <span className="font-medium">US ${orderSummary.shipping.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between">
                                    <span className="font-semibold">合計</span>
                                    <div className="text-right">
                                        <div className="font-bold">US ${orderSummary.total.toFixed(2)}</div>
                                        <div className="text-sm text-gray-600">JPY ¥{orderSummary.totalJPY.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            {errors.terms && (
                                <div className="mb-2 text-sm text-red-600 font-medium">
                                    {errors.terms}
                                </div>
                            )}
                            <div className={`flex items-start gap-2 mb-4 ${errors.terms ? 'p-2 border-2 border-red-500 rounded-lg' : ''}`}>
                                <Checkbox
                                    id="terms"
                                    checked={agreeToTerms}
                                    onCheckedChange={(checked) => {
                                        setAgreeToTerms(checked as boolean);
                                        if (checked && errors.terms) {
                                            setErrors(prev => ({ ...prev, terms: undefined }));
                                        }
                                    }}
                                />
                                <label
                                    htmlFor="terms"
                                    className="text-sm text-gray-700 cursor-pointer"
                                >
                                    プライバシー通知に同意します
                                </label>
                            </div>

                            {errors.general && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    {errors.general}
                                </div>
                            )}

                            <button
                                onClick={handlePurchase}
                                disabled={processingOrder}
                                className="bg-black text-white rounded-full py-3 w-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 h-[52px]"
                            >
                                {processingOrder ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    </>
                                ) : (
                                    '購入'
                                )}
                            </button>
                        </div>
                    </aside>
                </div>
            </main>

            <AddressModal
                open={addressModalOpen}
                onOpenChange={setAddressModalOpen}
                onSave={handleAddressSave}
                initialAddress={shippingAddress}
                user={user}
                updateBackend={true}
            />

            <PaymentModal
                open={paymentModalOpen}
                onOpenChange={setPaymentModalOpen}
                onSave={handlePaymentSave}
                user={user}
                updateBackend={true}
            />

            <Dialog open={showReplaceCardDialog} onOpenChange={setShowReplaceCardDialog}>
                <DialogContent closeButtonPosition="inside">
                    <DialogHeader>
                        <DialogTitle>カードを置き換えますか？</DialogTitle>
                        <DialogDescription>
                            未保存のカード情報が既に入力されています。新しいカード情報に置き換えますか？
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 justify-end mt-6">
                        <button
                            onClick={handleCancelReplaceCard}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleConfirmReplaceCard}
                            className="px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                            置き換える
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
