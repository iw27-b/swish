import React from 'react';
import Image from "next/image";
import Link from 'next/link';
import { Search, Newspaper } from 'lucide-react';

const HomeInformationSection: React.FC = () => {
    return (
        <section className="px-5 sm:px-10 py-12 sm:py-16">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Latest Information */}
                <div className="bg-[url('/images/img3-1.png')] bg-cover bg-center rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 min-h-[400px] sm:min-h-[500px] relative overflow-hidden">
                    <div className="text-center text-white relative z-10">
                        <h3 className="text-2xl sm:text-3xl font-medium mb-6">最新情報</h3>
                        <p className="text-lg sm:text-xl leading-relaxed mb-8">
                            毎日更新は、日常の収集や取引に最適な選択です。最新のカードや人気のデザインで、収集にも取引にもぴったりです。
                        </p>
                        <Link href="/news">
                            <button className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto mt-35">
                                <Newspaper className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="text-sm font-bold uppercase">読む</span>
                            </button>
                        </Link>
                    </div>
                </div>
                {/* Community Culture */}
                <div className="bg-[url('/images/img4.png')] bg-cover bg-center rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 min-h-[400px] sm:min-h-[500px] relative overflow-hidden">
                    <div className="text-center text-white relative z-10">
                        <h3 className="text-2xl sm:text-3xl font-medium mb-6">コミュニティ文化とトレンド</h3>
                        <p className="text-lg sm:text-xl leading-relaxed mb-8">
                            私たちのコミュニティシリーズで、取引の安定性と自由な活動を維持しましょう。最新の取引のプロセス、常に安定感とプロフェッショナルさを実感できます。
                        </p>
                        <button className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto mt-28">
                            <Search className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span className="text-sm font-bold uppercase">探す</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HomeInformationSection;
