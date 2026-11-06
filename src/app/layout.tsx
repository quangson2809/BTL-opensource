/**
 * Layout gốc: khai báo metadata, ngôn ngữ tiếng Việt, nạp CSS chung và bọc nội dung trang trong
 * AppFrame.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppFrame } from "@/components/app-frame";

import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "IDAILY",
  description: "Insurance agency management project foundation",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
