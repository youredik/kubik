import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Заказ багетов",
  description: "Магазин багетов с доставкой",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
      </body>
    </html>
  );
}
