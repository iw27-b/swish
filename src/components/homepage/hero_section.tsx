import React from 'react';
import Image from "next/image";
import styles from '../../styles/HomeSection.module.css';

const HomeHeroSection: React.FC = () => {
    return (
        <section className={styles.hero}>
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 flex items-center justify-center">
                    <Image src="/images/hand.svg" alt="Wave" width={40} height={40} />
                </div>
            </div>
            <div className="max-w-6xl mx-auto pt-16 sm:pt-20">
                <h1 className="text-4xl sm:text-6xl lg:text-8xl font-semibold text-black leading-tight mb-6">
                    伝説のダンクが、<br />
                    永遠にあなたのもの
                </h1>
                <p className="text-lg sm:text-2xl lg:text-3xl text-black max-w-3xl mx-auto font-medium">
                    NBA殿堂入り選手から今季MVPまで、世界限定カードが今だけ特価
                </p>
            </div>
        </section>
    );
};

export default HomeHeroSection;
