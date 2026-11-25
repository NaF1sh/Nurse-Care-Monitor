import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { AnimatedLogo } from "./AnimatedLogo";

export const SPLASH_KEY = "nursecare-intro-v1";
// Runs before paint; the independent deadline also releases the page if hydration fails.
export const splashBootstrap = `(function(){try{if(sessionStorage.getItem("${SPLASH_KEY}"))return;sessionStorage.setItem("${SPLASH_KEY}","1")}catch(e){}var d=document.documentElement;var ms=matchMedia('(prefers-reduced-motion: reduce)').matches?120:1780;d.dataset.ncmIntro='true';d.dataset.ncmDeadline=String(Date.now()+ms);setTimeout(function(){delete d.dataset.ncmIntro},ms)})()`;

export function SplashScreen() {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const remaining = Number(root.dataset["ncmDeadline"] || 0) - Date.now();
    if (!root.dataset["ncmIntro"] || remaining <= 0) { setMounted(false); return; }
    const timer = window.setTimeout(() => { delete root.dataset["ncmIntro"]; setMounted(false); }, remaining);
    return () => window.clearTimeout(timer);
  }, []);
  if (!mounted) return null;
  return <div className="brand-splash" data-testid="brand-splash" aria-hidden="true">
    <div className="brand-splash-content">
      <AnimatedLogo />
      <div className="brand-splash-wordmark"><strong>NurseCare</strong> <span>Monitor</span></div>
      <div className="brand-splash-byline">BY WECARE</div>
      <p className="brand-splash-tagline" lang={lang}>{lang === "bn" ? "যাঁরা যত্ন নেন, আমরা তাঁদের যত্ন নিই" : "Care for those who care for us."}</p>
    </div>
  </div>;
}

export function BrandLoading() {
  const { lang } = useLanguage();
  return <div className="brand-loading" role="status"><AnimatedLogo variant="loading" /><span>{lang === "bn" ? "লোড হচ্ছে…" : "Loading NurseCare Monitor…"}</span></div>;
}
