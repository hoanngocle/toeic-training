import { Suspense } from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { LoadingScreen } from "../components/ui/loading";
import "./globals.css";
import "./theme.css";

const beVietnamPro = localFont({
  src: [
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/be-vietnam-pro/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-vietnamese",
  display: "swap",
});

export const metadata: Metadata = {
  title: "English Space | Không gian học tiếng Anh",
  description: "Khám phá bốn kỹ năng nghe, nói, đọc, viết. Học tiếng Anh từng chút mỗi ngày, theo nhịp của bạn.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi" className={beVietnamPro.variable} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `(function(){var t;try{t=localStorage.getItem('english-space-theme')}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()` }}/></head><body><Suspense fallback={<LoadingScreen fullScreen />}>{children}</Suspense></body></html>;
}
