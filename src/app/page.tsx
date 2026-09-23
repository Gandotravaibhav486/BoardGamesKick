import { SiteNav, SiteFooter } from "@/components/ui/site-nav";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PlayBeforeYouBack } from "@/components/marketing/play-before-you-back";
import { Trust } from "@/components/marketing/trust";
import { FinalCta } from "@/components/marketing/final-cta";

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <PlayBeforeYouBack />
        <Trust />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
