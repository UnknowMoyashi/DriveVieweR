import type { Metadata } from "next";
import { Inter } from "next/font/google"
import "./globals.css";
import { NextAuthProvider } from "@/components/NextAuthProvider"; // 先ほど作ったファイル

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Drive Album",
  description: "Google Driveをアルバム化",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {/* NextAuthProviderでchildrenを包む */}
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}