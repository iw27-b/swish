'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';

interface ProductItem {
    id: number;
    image: string;
    category: string;
    title: string;
    price: string;
    href?: string;
}

interface CardGridProps {
    products: ProductItem[];
}

const CardGrid: React.FC<CardGridProps> = ({ products }) => {
    const [likedItems, setLikedItems] = useState<Set<number>>(new Set());

    const toggleLike = (productId: number) => {
        setLikedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-6 justify-items-center">
            {products.map((product) => (
                <section key={product.id} className="w-full max-w-[285px] relative flex flex-col box-border">
                    <div
                        className={`absolute top-[15px] right-[10px] w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-[0_2px_5px_rgba(0,0,0,0.15)] transition-all duration-300 z-10 ${likedItems.has(product.id) ? '[&>svg]:fill-red-500' : '[&>svg]:fill-transparent'
                            }`}
                        onClick={() => toggleLike(product.id)}
                    >
                        <Heart className="w-[18px] h-[18px] transition-all duration-300" />
                    </div>
                    <a href={product.href || '#'} className="no-underline text-inherit block">
                        <section className="w-full aspect-square rounded-2xl flex justify-center items-center bg-[#f7f7f7] p-4">
                            <div className="relative w-[85%] h-[85%]">
                                <Image
                                    src={product.image}
                                    alt={product.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className="object-contain rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(0,0,0,0.4)] cursor-pointer"
                                />
                            </div>
                        </section>
                        <small className="text-sm text-gray-400 block mt-2">{product.category}</small>
                        <h3 className="text-sm text-black leading-[1.4] my-[0.3rem] mx-0">{product.title}</h3>
                        <p className="text-xl text-black font-bold my-[0.3rem] mx-0">{product.price}</p>
                    </a>
                </section>
            ))}
        </div>
    );
};

export default CardGrid;