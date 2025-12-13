import type { Metadata } from "next";
import "@/styles/globals.scss";
import "@/styles/components.scss";

export const metadata: Metadata = {
  title: "ReviewMate - 添削支援ツール",
  description: "メンター向け課題添削支援ツール",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
