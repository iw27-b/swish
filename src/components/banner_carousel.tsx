import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

/**
 * BannerCarousel
 * Displays a horizontal scrollable carousel with all banners loaded and scroll snapping
 */
export const BannerCarousel = ({ autoPlay = true, intervalMs = 5000, height = '400px' }: { autoPlay?: boolean; intervalMs?: number; height?: string }) => {
    const [images, setImages] = useState<string[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const resumeRef = useRef<NodeJS.Timeout | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [current, setCurrent] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

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

    const scrollToSlide = useCallback((index: number) => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const containerWidth = container.clientWidth;
            const slideWidth = containerWidth * (2/3);
            const gap = 16;
            const scrollPosition = index * (slideWidth + gap);
            
            container.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
        }
    }, []);

    const startAutoScroll = useCallback(() => {
        stopAutoScroll();
        intervalRef.current = setInterval(() => {
            setCurrent((prev) => {
                const nextIndex = (prev + 1) % images.length;
                scrollToSlide(nextIndex);
                return nextIndex;
            });
        }, intervalMs);
    }, [images.length, intervalMs, scrollToSlide]);

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
        if (images.length === 0 || !autoPlay) {
            stopAutoScroll();
            return;
        }
        startAutoScroll();
        return () => {
            stopAutoScroll();
            if (resumeRef.current) clearTimeout(resumeRef.current);
        };
    }, [images, autoPlay, startAutoScroll]);

    if (images.length === 0) return null;

    const nextSlide = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        const nextIndex = (current + 1) % images.length;
        setCurrent(nextIndex);
        scrollToSlide(nextIndex);
        handleInteraction();
        setTimeout(() => setIsTransitioning(false), 300);
    };

    const prevSlide = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        const prevIndex = (current - 1 + images.length) % images.length;
        setCurrent(prevIndex);
        scrollToSlide(prevIndex);
        handleInteraction();
        setTimeout(() => setIsTransitioning(false), 300);
    };

    const setSlide = (index: number) => {
        if (isTransitioning || index === current) return;
        setIsTransitioning(true);
        setCurrent(index);
        scrollToSlide(index);
        handleInteraction();
        setTimeout(() => setIsTransitioning(false), 300);
    };

    return (
        <div 
            className="relative w-full rounded-[32px] overflow-hidden mx-auto max-w-7xl" 
            style={{ height }}
        >
            <div 
                ref={scrollContainerRef}
                className="flex overflow-x-auto h-full gap-4 scroll-smooth snap-x snap-mandatory scrollbar-hide"
                style={{ 
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                {images.map((image, index) => (
                    <div 
                        key={index}
                        className="flex-shrink-0 snap-start rounded-[32px] overflow-hidden relative"
                        style={{ 
                            width: '66.667%',
                            minWidth: '66.667%'
                        }}
                    >
                        <Image
                            src={image}
                            alt={`Banner ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="66vw"
                            priority={index < 3}
                        />
                    </div>
                ))}
            </div>

            <button
                onClick={prevSlide}
                disabled={isTransitioning}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/10 backdrop-blur-md border border-white/20 p-2 rounded-full text-white hover:bg-black/30 transition-all z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ChevronLeft size={24} />
            </button>
            <button
                onClick={nextSlide}
                disabled={isTransitioning}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/10 backdrop-blur-md border border-white/20 p-2 rounded-full text-white hover:bg-black/30 transition-all z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setSlide(index)}
                        disabled={isTransitioning}
                        className={`w-3 h-3 rounded-full transition-colors disabled:cursor-not-allowed ${index === current ? 'bg-white' : 'bg-white/50'
                            }`}
                    />
                ))}
            </div>

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};