import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "야채·육류 시세와 매입 타이밍",
  description: "gogiparty 도매 시세 AI 매입 예측 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
