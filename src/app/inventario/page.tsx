import type { Metadata } from "next";
import Link from "next/link";
import { CarFront, ArrowUpRight, SearchX } from "lucide-react";
import { getInventory, getSettings } from "@/lib/data";
import { VehicleCard } from "@/components/public/vehicle-card";
import {
  CatalogFilters,
  SortControl,
} from "@/components/public/catalog-filters";
export const metadata: Metadata = {
  title: "Inventario de vehículos",
  description:
    "Explora carros en venta en Armenia, Quindío. Filtra vehículos por marca, año, precio, kilometraje y transmisión.",
};
export default async function Inventory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const [result, settings] = await Promise.all([
    getInventory(params),
    getSettings(),
  ]);
  const pageHref = (page: number) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== "page") p.set(k, v);
    });
    p.set("page", String(page));
    return `/inventario?${p}`;
  };
  return (
    <div className="container">
      <div className="page-heading catalog-heading">
        <p className="eyebrow">LA SUBASTA AXM · VEHÍCULOS SELECCIONADOS</p>
        <h1>
          ENCUENTRA TU <span className="text-red">PRÓXIMO CARRO.</span>
        </h1>
        <p>
          Cada camino comienza con una elección. Encuentra el vehículo que va
          contigo.
        </p>
      </div>
      <div className="catalog-layout">
        <CatalogFilters
          key={JSON.stringify(params)}
          params={params}
          brands={result.brands}
        />
        <div className="catalog-main">
          {result.vehicles.some((v) => v.instagramPost) && (
            <p className="notice">
              Vehículos anunciados en el Instagram oficial. Confirma
              disponibilidad y precio actual con el equipo. Los valores marcados
              como “Referencia de mercado” provienen de anuncios comparables o
              guías colombianas y no son una cotización del concesionario.
              Consulta su fuente en cada ficha.
            </p>
          )}
          <div className="catalog-toolbar">
            <span role="status">
              {result.total}{" "}
              {result.total === 1
                ? "vehículo encontrado"
                : "vehículos encontrados"}
            </span>
            <SortControl value={params.sort || "recent"} params={params} />
          </div>
          {!result.configured ? (
            <div className="empty-state">
              <CarFront size={40} />
              <h3>El inventario está temporalmente fuera de línea</h3>
              <p>
                Escríbenos para conocer las opciones disponibles o vuelve a
                intentarlo más tarde.
              </p>
              <Link className="btn" href="/contacto">
                Contactar al equipo <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : result.vehicles.length ? (
            <div className="vehicles-grid">
              {result.vehicles.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  whatsapp={settings.whatsapp}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <SearchX size={38} />
              <h3>
                {Object.values(params).some(Boolean)
                  ? "No encontramos vehículos con estos filtros"
                  : "Estamos preparando nuestra selección"}
              </h3>
              <p>
                {Object.values(params).some(Boolean)
                  ? "Prueba con otra marca o amplía tu presupuesto. También podemos ayudarte a buscar."
                  : "Estamos confirmando los datos y la disponibilidad de nuestros vehículos antes de publicarlos. Cuéntanos cuál estás buscando."}
              </p>
              <div className="actions">
                {Object.values(params).some(Boolean) && (
                  <Link className="btn btn-outline" href="/inventario">
                    Limpiar filtros
                  </Link>
                )}
                <Link className="btn" href="/contacto">
                  Solicitar información <ArrowUpRight size={15} />
                </Link>
              </div>
            </div>
          )}
          {result.pages > 1 && (
            <nav className="pagination" aria-label="Paginación del inventario">
              {result.page > 1 && (
                <Link href={pageHref(result.page - 1)}>Anterior</Link>
              )}
              {Array.from({ length: result.pages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - result.page) <= 2)
                .map((p) => (
                  <Link
                    key={p}
                    href={pageHref(p)}
                    aria-current={p === result.page ? "page" : undefined}
                  >
                    {p}
                  </Link>
                ))}
              {result.page < result.pages && (
                <Link href={pageHref(result.page + 1)}>Siguiente</Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
