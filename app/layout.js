import "./globals.css";

export const metadata = {
  title: "FITpips Trading Coach",
  description: "6-month trading coaching dashboard for screenshots, CSV imports, and trade review.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
