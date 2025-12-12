import React from "react";
import Link from "next/link";
import { Newspaper } from "lucide-react";

const HomeInformationSection: React.FC = () => {
  return (
    <section className="px-5 sm:px-10 pt-[120px] pb-[200px]">
      <div className="max-w-7xl mx-auto">
        {/* Latest Information */}
        <div className="bg-[url('/images/img3-1.png')] bg-cover bg-center rounded-3xl sm:rounded-[3rem] p-8 sm:p-12 min-h-[500px] sm:min-h-[600px] relative overflow-hidden flex items-center justify-center w-full">
          <div className="text-center text-white relative z-10">
            <h3 className="text-2xl sm:text-3xl font-medium mb-6">最新情報</h3>
            <p className="text-lg sm:text-xl leading-relaxed mb-8">
              毎日更新は、日常の収集や取引に最適な選択です。
              <br />
              最新のカードや人気のデザインで、収集にも
              <br />
              取引にもぴったりです。
            </p>
            <Link href="/news">
              <button className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 mx-auto">
                <Newspaper className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="text-sm font-bold uppercase">読む</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeInformationSection;
