import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import Image from 'next/image';

/**
 * BannerCarousel
 * Displays a carousel of banner images fetched dynamically.
 * @param {boolean} [autoPlay=true] - Whether to auto-scroll the carousel
 * @param {number} [intervalMs=5000] - Interval for auto-scroll in milliseconds
 * @param {string} [height='400px'] - Height of the carousel
 */
export const BannerCarousel = ({ autoPlay = true, intervalMs = 5000, height = '400px' }: { autoPlay?: boolean; intervalMs?: number; height?: string }) => {
    const [images, setImages] = useState<string[]>([]);
    type ImageItem = { src: string; isPortrait: boolean };
    const [slides, setSlides] = useState<ImageItem[][]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const resumeRef = useRef<NodeJS.Timeout | null>(null);
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const res = await fetch('/api/images/banner');
                const data = await res.json();
                if (data.success) {
                    setImages(data.data.images);
                }
            } catch (error) {
                console.error('Failed to fetch banner images:', error);
            }
        };
        fetchImages();
    }, []);

    useEffect(() => {
        const loadDimensions = async () => {
            const loadImage = (src: string) => {
                return new Promise<{ src: string; isPortrait: boolean }>((resolve) => {
                    // @ts-ignore
                    const img = new window.Image();
                    img.onload = () => resolve({ src, isPortrait: img.naturalHeight > img.naturalWidth });
                    img.src = src;
                });
            };

            const loaded = await Promise.all(images.map(loadImage));

            const landscapes: { src: string; isPortrait: boolean }[] = [];
            const portraits: { src: string; isPortrait: boolean }[] = [];
            loaded.forEach((item) => {
                if (item.isPortrait) portraits.push(item);
                else landscapes.push(item);
            });

            const newSlides: ImageItem[][] = [];
            const minPairs = Math.min(landscapes.length, portraits.length);
            for (let i = 0; i < minPairs; i++) {
                newSlides.push([landscapes.shift()!, portraits.shift()!]);
            }
            while (portraits.length >= 2) {
                newSlides.push([portraits.shift()!, portraits.shift()!]);
            }
            landscapes.forEach((item) => newSlides.push([item]));
            portraits.forEach((item) => newSlides.push([item]));

            setSlides(newSlides);
        };

        if (images.length > 0) loadDimensions();
    }, [images]);

    const startAutoScroll = () => {
        stopAutoScroll();
        intervalRef.current = setInterval(() => {
            setDirection(1);
            setCurrent((prev) => (prev + 1) % slides.length);
        }, intervalMs);
    };

    const stopAutoScroll = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const handleInteraction = () => {
        stopAutoScroll();
        if (resumeRef.current) clearTimeout(resumeRef.current);
        resumeRef.current = setTimeout(startAutoScroll, 30000);
    };

    useEffect(() => {
        if (slides.length === 0 || !autoPlay) {
            stopAutoScroll();
            return;
        }
        startAutoScroll();
        return () => {
            stopAutoScroll();
            if (resumeRef.current) clearTimeout(resumeRef.current);
        };
    }, [slides, autoPlay, intervalMs]);

    if (slides.length === 0) return null;

    const nextSlide = () => {
        setDirection(1);
        setCurrent((prev) => (prev + 1) % slides.length);
        handleInteraction();
    };

    const prevSlide = () => {
        setDirection(-1);
        setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
        handleInteraction();
    };

    const setSlide = (index: number) => {
        setDirection(index > current ? 1 : -1);
        setCurrent(index);
        handleInteraction();
    };

    const variants = {
        enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
        center: { x: '0%', opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
    };

    return (
        <div className={`relative w-full h-[${height}] rounded-2xl overflow-hidden mx-auto max-w-7xl`}>
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                    key={current}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className={`absolute top-0 left-0 w-full h-full flex ${slides[current].length > 1 ? 'gap-4' : ''}`}
                >
                    {slides[current].length === 1 ? (
                        <div className={`${slides[current][0].isPortrait ? 'w-1/4 mx-auto' : 'w-full'} rounded-xl overflow-hidden relative`}>
                            <Image
                                src={slides[current][0].src}
                                alt="Banner"
                                fill
                                className="object-cover"
                                sizes="100vw"
                            />
                        </div>
                    ) : (
                        <>
                            {slides[current].length === 2 && slides[current][0].isPortrait && slides[current][1].isPortrait ? (
                                <>
                                    <div className="w-1/2 rounded-xl overflow-hidden relative">
                                        <Image
                                            src={slides[current][0].src}
                                            alt="Portrait banner 1"
                                            fill
                                            className="object-cover"
                                            sizes="50vw"
                                        />
                                    </div>
                                    <div className="w-1/2 rounded-xl overflow-hidden relative">
                                        <Image
                                            src={slides[current][1].src}
                                            alt="Portrait banner 2"
                                            fill
                                            className="object-cover"
                                            sizes="50vw"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-3/4 rounded-xl overflow-hidden relative">
                                        <Image
                                            src={slides[current][0].src} // landscape
                                            alt="Landscape banner"
                                            fill
                                            className="object-cover"
                                            sizes="75vw"
                                        />
                                    </div>
                                    <div className="w-1/4 rounded-xl overflow-hidden relative">
                                        <Image
                                            src={slides[current][1].src} // portrait
                                            alt="Portrait banner"
                                            fill
                                            className="object-cover"
                                            sizes="25vw"
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/10 backdrop-blur-md border border-white/20 p-2 rounded-full text-white hover:bg-black/30 transition-all"
            >
                <ChevronLeft size={24} />
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/10 backdrop-blur-md border border-white/20 p-2 rounded-full text-white hover:bg-black/30 transition-all"
            >
                <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setSlide(index)}
                        className={`w-3 h-3 rounded-full transition-colors ${index === current ? 'bg-white' : 'bg-white/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};
