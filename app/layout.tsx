import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caisse Enregistreuse",
  description: "Application caisse enregistreuse",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
