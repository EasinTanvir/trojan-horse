import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { TranslateBar } from "@/components/layout/TranslateBar";
import { ToasterMount } from "@/components/ui/ToasterMount";
import "./globals.css";

/* next/font self-hosts these at build time — no runtime CDN request, so the
   demo still renders correctly offline. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Nirapod Path",
  description:
    "Report crime hotspots and infrastructure hazards in Dhaka, and track them through to resolution.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-alt text-ink">
        <TranslateBar />
        {children}
        <ChatWidget />
        <ToasterMount />
      </body>
    </html>
  );
}
