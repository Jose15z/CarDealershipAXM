import { VehiclePrice } from "@/components/public/vehicle-price";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronRight,
  MapPin,
  MessageCircle,
  ArrowDownRight,
  Instagram,
} from "lucide-react";
import { getVehicle, getSettings } from "@/lib/data";
import { Gallery } from "@/components/public/gallery";
import { VehicleActions } from "@/components/public/vehicle-actions";
import {
  money,
  kilometers,
  statusLabel,
  whatsappUrl,
} from "@/components/public/format";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const v = await getVehicle((await params).slug);
  if (!v) return { title: "Vehículo no encontrado", robots: { index: false } };
  return {
    title: `${v.brand} ${v.model} ${v.year ?? ""}`,
    description: `${v.brand} ${v.model} ${v.version || ""} ${v.year ?? ""} en ${v.city}. ${money(v.price)}. ${kilometers(v.mileage)}. Consulta información y agenda una visita.`,
    alternates: { canonical: `/vehiculos/${v.slug}` },
    openGraph: {
      title: `${v.brand} ${v.model} | LA SUBASTA AXM`,
      images: v.images[0] ? [v.images[0].url] : [],
    },
  };
}
export default async function Vehicle({ params }: Props) {
  const [v, settings] = await Promise.all([
    getVehicle((await params).slug),
    getSettings(),
  ]);
  if (!v) notFound();
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const wa = whatsappUrl(
    settings.whatsapp,
    `Hola, me interesa el ${v.brand} ${v.model} ${v.version || ""} ${v.year ?? ""}. Quisiera confirmar información y disponibilidad. ${base}/vehiculos/${v.slug}`,
  );
  const specs = [
    ["Año", v.year],
    ["Kilometraje", kilometers(v.mileage)],
    ["Transmisión", v.transmission],
    ["Combustible", v.fuel],
    ["Cilindraje", v.displacement],
    ["Color", v.color],
    ["Carrocería", v.bodyType],
    ["Placa parcial", v.partialPlate],
    ["Ciudad", v.city],
    ["Estado", statusLabel[v.status]],
  ].filter(([, val]) => val !== null && val !== undefined && val !== "");
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: `${v.brand} ${v.model} ${v.version || ""}`,
    brand: { "@type": "Brand", name: v.brand },
    model: v.model,
    vehicleModelDate: v.year,
    image: v.images.map((i) => i.url),
    mileageFromOdometer:
      v.mileage !== null
        ? { "@type": "QuantitativeValue", value: v.mileage, unitCode: "KMT" }
        : undefined,
    offers:
      v.price !== null
        ? {
            "@type": "Offer",
            price: Number(v.price),
            priceCurrency: "COP",
            availability:
              v.status === "VENDIDO"
                ? "https://schema.org/SoldOut"
                : v.status === "RESERVADO"
                  ? "https://schema.org/LimitedAvailability"
                  : "https://schema.org/InStock",
            url: `${base}/vehiculos/${v.slug}`,
          }
        : undefined,
  };
  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonld).replace(/</g, "\\u003c"),
        }}
      />
      <nav className="breadcrumbs" aria-label="Ruta de navegación">
        <Link href="/">Inicio</Link>
        <ChevronRight size={12} />
        <Link href="/inventario">Inventario</Link>
        <ChevronRight size={12} />
        <span>
          {v.brand} {v.model}
        </span>
      </nav>
      <div className="detail-grid">
        <Gallery images={v.images} />
        <div className="vehicle-detail-info">
          <span
            className={`badge ${v.status === "DISPONIBLE" ? "badge-red" : ""}`}
          >
            {statusLabel[v.status]}
          </span>
          <h1>
            {v.brand} <span className="text-red">{v.model}</span>
          </h1>
          <p className="muted">
            {v.version} {v.version && "·"} {v.year}
          </p>
          <p className="icon-line muted" style={{ fontSize: 12 }}>
            <MapPin size={15} />
            {v.city}
          </p>
          <VehiclePrice vehicle={v} detail />
          {v.status === "VENDIDO" && (
            <p className="notice">
              Este vehículo ya fue vendido. Explora el inventario para encontrar
              otras opciones.
            </p>
          )}
          <dl className="detail-specs">
            {specs.map(([label, value]) => (
              <div key={String(label)}>
                <dt>{label}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
          {wa && (
            <a className="btn" href={wa} target="_blank" rel="noreferrer">
              <MessageCircle size={17} />
              {v.status === "VENDIDO"
                ? "Consultar vehículos similares"
                : "Consultar por WhatsApp"}
            </a>
          )}
          <a className="btn btn-outline" href="#solicitar-informacion">
            Solicitar información <ArrowDownRight size={17} />
          </a>
          <p className="muted" style={{ fontSize: 10 }}>
            Una consulta no constituye una reserva ni una venta.
          </p>
          {v.instagramPost && (
            <a
              className="text-link"
              href={v.instagramPost.permalink}
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={15} />
              Publicación original
            </a>
          )}
        </div>
      </div>
      <div className="detail-sections">
        {v.description && (
          <section>
            <p className="eyebrow">CONOCE LOS DETALLES</p>
            <h2>SOBRE ESTE VEHÍCULO</h2>
            <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
              {v.description}
            </p>
          </section>
        )}
        {v.features.length > 0 && (
          <section>
            <h2>EQUIPAMIENTO Y CARACTERÍSTICAS</h2>
            <div className="features-grid">
              {["Confort", "Tecnología", "Seguridad", "Exterior"].map(
                (category) => {
                  const features = v.features.filter(
                    (f) => f.category === category,
                  );
                  return (
                    features.length > 0 && (
                      <div key={category}>
                        <h3>{category}</h3>
                        <ul>
                          {features.map((f) => (
                            <li key={f.id}>
                              <Check size={14} />
                              {f.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  );
                },
              )}
            </div>
          </section>
        )}
        <VehicleActions vehicleId={v.id} sold={v.status === "VENDIDO"} />
      </div>
    </div>
  );
}
