import React from 'react';
import Image from "next/image";
import styles from '../../styles/HomeSection.module.css';

const HomeFeaturedCardsSection: React.FC = () => {
    return (
        <section className={styles.featuredCards}>
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 items-end gap-6 sm:gap-8">
                    {/* Left Card */}
                    <div className="bg-gray-100 rounded-2xl sm:rounded-3xl overflow-hidden flex self-start mt-12 sm:mt-16 lg:mt-24">
                        <div className="relative flex-1 pl-1 pr-0 pt-1 pb-1">
                            <img
                                src="/images/Mask group-1.png"
                                alt="Background"
                                className="block w-full h-auto rounded-2xl sm:rounded-3xl"
                            />
                            <div className="pointer-events-none absolute top-1 bottom-1 left-1 right-0 flex items-center justify-center">
                                <Image
                                    src="/images/Group 3.png"
                                    alt="Center Icon"
                                    width={60}
                                    height={60}
                                />
                            </div>
                        </div>
                        <div className="w-20 flex items-center justify-center">
                            <p className="text-black text-lg font-medium writing-vertical-rl">
                                最新ダンクビデオ
                            </p>
                        </div>
                    </div>
                    {/* Center Card - Image */}
                    <div className="flex items-end justify-center h-64 sm:h-80">
                        <div className="bg-gray-100 rounded-2xl sm:rounded-3xl h-full w-full p-[4px]">
                            <div className="relative h-full w-full rounded-[inherit] overflow-hidden">
                                <Image src="/images/card.png" alt="Card" fill className="object-cover" />
                            </div>
                        </div>
                    </div>
                    {/* Right Card */}
                    <div className="rounded-2xl sm:rounded-3xl h-64 sm:h-80 overflow-hidden relative">
                        <Image
                            src="/images/content.png"
                            alt="Content"
                            fill
                            className="object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HomeFeaturedCardsSection;
