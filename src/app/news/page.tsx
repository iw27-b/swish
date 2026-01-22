import Header from "@/components/header";
import Footer from "@/components/footer";

export default function News() {
  const newsItems = [
    "レブロン ・ ジェームズ限定シルバーカード(#24/100)」が新入荷しました!",
    "カンさんがステフィン・カリーゴールドカードをUS$34.99で購入しました",
    "ヤニス・アデトクンボRookieCardの取引価格が過去 7 日間で+15%上昇",
    "今週の取引額トップカード: コービー・ブライアント限定ブラックマンバカード (US $134.99)",
    "NBAオールスター2025 記念カード」限定 200 枚、明日 10:00 販売開始！",
    "FIBAワールドカップ記念キャンペーン：全カード5%オフ（期間限定）",
    "ルカ・ドンチッチ特集：今週の注目カードと取引履歴",
  ];

  return (
    <div>
      <Header />
      <main className="px-5 sm:px-10 pt-6 pb-12 sm:pt-10 sm:pb-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8">
            最新情報
          </h1>
          <div className="space-y-0">
            {newsItems.map((item, index) => (
              <div
                key={index}
                className="py-6 border-b border-gray-200 last:border-b-0"
              >
                {/* <p className="text-base sm:text-lg">{item}</p> */}
                <p className="text-base">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
