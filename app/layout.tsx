import type { Metadata } from "next";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkUp",
  description: "Connect with the outside world smarter",
  icons: { icon: "/img/logo.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  localStorage.removeItem("linkup-theme");
                } catch (_) {
                }
                document.documentElement.dataset.theme = "dark";
                document.documentElement.style.colorScheme = "dark";
              })();
            `,
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@200..700&family=Poppins:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <PushPermissionPrompt />
      </body>
    </html>
  );
}
