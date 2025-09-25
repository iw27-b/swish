import Image from "next/image";

export default function TeamPage() {
    return (
        <main className="mx-auto max-w-[1100px] px-4 py-6">
            <section className="mx-auto flex max-w-[1100px] flex-col items-center">
                <h1 className="leading-none text-black font-extrabold tracking-tight text-[6vw] sm:text-[7vw] md:text-[5rem] lg:text-[6rem] -mb-2">SWISH</h1>
                <Image
                    src="/images/team/1.png"
                    alt="トップ大画像"
                    className="block h-auto w-[clamp(360px,100%,1080px)] rounded-md"
                    width={1080}
                    height={360}
                />
            </section>

            <section className="relative mx-auto mb-7 w-[clamp(260px,46vw,520px)]">
                <Image src="/images/team/3.png" alt="中心竖图" className="block h-auto w-full" width={520} height={260} />

                <span className="absolute left-[-60px] top-[12%] flex h-20 w-20 items-center justify-center rounded-full bg-[#efefef] shadow-[0_4px_14px_rgba(0,0,0,0.12)] will-change-transform float-soft v1">
                    <Image src="/images/team/2.png" alt="" className="h-[70%] w-[70%]" width={70} height={70} />
                </span>
                <span className="absolute right-[-60px] top-[18%] flex h-20 w-20 items-center justify-center rounded-full bg-[#efefef] shadow-[0_4px_14px_rgba(0,0,0,0.12)] will-change-transform float-soft v2">
                    <Image src="/images/team/4.png" alt="" className="block h-[70%] w-[70%]" width={70} height={70} />
                </span>
                <span className="absolute left-[-60px] top-[65%] flex h-20 w-20 items-center justify-center rounded-full bg-[#efefef] shadow-[0_4px_14px_rgba(0,0,0,0.12)] will-change-transform float-soft v3">
                    <Image src="/images/team/5.png" alt="" className="block h-[70%] w-[70%]" width={70} height={70} />
                </span>
                <span className="absolute right-[-60px] top-[72%] flex h-20 w-20 items-center justify-center rounded-full bg-[#efefef] shadow-[0_4px_14px_rgba(0,0,0,0.12)] will-change-transform float-soft v4">
                    <Image src="/images/team/6.png" alt="" className="block h-[70%] w-[70%]" width={70} height={70} />
                </span>
            </section>

            <div className="flex justify-center">
                <section className="mx-auto my-10 max-w-[800px] leading-relaxed text-left">
                    <h2 className="my-5 text-[22px] font-bold">タイトル</h2>
                    <p className="mb-5 text-[16px] text-[#333]">NBAや国際的な（FIBA）バスケットボール選手の限定</p>
                    <p className="mb-5 text-[16px] text-[#333]">トレーディングカードを販売するサイト</p>
                    <h2 className="my-5 text-[22px] font-bold">チームメンバー</h2>
                    <p className="mb-2 text-[16px] text-[#333]">李森（Designer）</p>
                    <p className="mb-2 text-[16px] text-[#333]">李簡行（Engineer）</p>
                    <p className="mb-2 text-[16px] text-[#333]">オルロフイゴール（Engineer）</p>
                    <p className="mb-2 text-[16px] text-[#333]">蘭方（Engineer）</p>
                    <p className="mb-2 text-[16px] text-[#333]">ナカガワハンター（Engineer）</p>
                </section>
            </div>
        </main>
    );
}


