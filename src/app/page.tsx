import styles from '@/styles/HomeSection.module.css';
import HomeHeroSection from '@/components/homepage/hero_section';
import HomeFeaturedCardsSection from '@/components/homepage/featured_cards_section';
import HomeSpotlightSection from '@/components/homepage/spotlight_section';
import HomeInformationSection from '@/components/homepage/information_section';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function Home() {
  return (
    <div className={styles.container}>
      <Header />
      <HomeHeroSection />
      <HomeFeaturedCardsSection />
      <HomeSpotlightSection />
      <HomeInformationSection />
      <Footer />
    </div>
  );
}