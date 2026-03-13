import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cérebros – Entraînement Cérébral",
  description:
    "Améliorez votre mémoire, renforcez votre attention et accélérez votre réflexion grâce à des jeux scientifiques.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
