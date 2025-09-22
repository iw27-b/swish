'use client';

import React, { useState } from 'react';
import Image from 'next/image';

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
                        className={`absolute top-[15px] right-[10px] w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-[0_2px_5px_rgba(0,0,0,0.15)] transition-all duration-300 z-10 ${likedItems.has(product.id) ? '[&>svg]:fill-red-500' : '[&>svg]:fill-gray-400'
                            }`}
                        onClick={() => toggleLike(product.id)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-[18px] h-[18px] transition-all duration-300">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>
                    <a href={product.href || '#'} className="no-underline text-inherit block group">
                        <section className="w-full aspect-square rounded-2xl flex justify-center items-center bg-[#f7f7f7] p-4">
                            <div className="w-full h-full relative">
                                <Image
                                    src={product.image}
                                    alt={product.title}
                                    fill
                                    className="object-contain rounded-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
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