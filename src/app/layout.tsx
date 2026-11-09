import type { Metadata } from "next";
import { PublicShell } from "@/components/public/shell";
import { getSettings } from "@/lib/data";
import "./globals.css";
export const dynamic = "force-dynamic";
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LA SUBASTA AXM | Vehículos en Armenia, Quindío",
    template: "%s | LA SUBASTA AXM",
  },
  description:
    "Descubre vehículos seleccionados en LA SUBASTA AXM. Explora nuestro inventario de carros en Armenia, Quindío, y encuentra tu próximo vehículo.",
  openGraph: {
    locale: "es_CO",
    type: "website",
    siteName: "LA SUBASTA AXM",
    images: [
      {
        url: "/images/hero-audi-tt.jpg",
        width: 1672,
        height: 941,
        alt: "Ilustración de un Audi TT plateado con franjas negras",
      },
    ],
  },
  robots: { index: true, follow: true },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <html lang="es-CO" data-scroll-behavior="smooth">
      <body>
        <PublicShell settings={settings}>{children}</PublicShell>
      </body>
    </html>
  );
}
