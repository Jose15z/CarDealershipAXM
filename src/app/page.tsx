import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CarFront,
  Check,
  CircleCheck,
  Handshake,
  Instagram,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  getFeaturedVehicles,
  getInventory,
  getSettings,
  getInstagramShowcase,
} from "@/lib/data";
import { VehicleCard } from "@/components/public/vehicle-card";
import { Reveal } from "@/components/public/reveal";
import { money } from "@/components/public/format";
export default async function Home() {
  const [featured, inventory, settings, posts] = await Promise.all([
    getFeaturedVehicles(),
    getInventory(),
    getSettings(),
    getInstagramShowcase(),
  ]);
  const defaultBenefits = [
    {
      title: "Tu próximo carro, a tu medida",
      description:
        "Explora los detalles de cada vehículo y encuentra el que conecta con tu estilo de vida.",
    },
    {
      title: "Hablemos con claridad",
      description:
        "Consulta la información de los vehículos y conversa directamente con nuestro equipo.",
    },
    {
      title: "Recibimos tu carro",
      description:
        "Cuéntanos qué vehículo tienes y consulta las opciones para entregarlo como parte de pago.",
    },
  ];
  const benefits =
    Array.isArray(settings.benefits) && settings.benefits.length
      ? (settings.benefits as { title: string; description: string }[])
      : defaultBenefits;
  const icons = [ShieldCheck, Handshake, CarFront];
  const selected = featured.length ? featured : inventory.vehicles;
  return (
    <>
      <section className="hero">
        <div className="hero-image">
          <Image
            src="/images/hero-audi-tt.jpg"
            alt="Ilustración de un Audi TT plateado con franjas negras al atardecer"
            fill
            preload
            sizes="(max-width: 960px) 100vw, (max-width: 1150px) 88vw, 76vw"
          />
        </div>
        <div className="container hero-content">
          <p className="eyebrow">LA SUBASTA AXM · ARMENIA, QUINDÍO</p>
          <h1>
            TU PRÓXIMO CARRO
            <br />
            TE ESTÁ
            <br />
            <em>ESPERANDO.</em>
          </h1>
          <p className="hero-subtitle">
            Descubre vehículos seleccionados con estilo, confianza y las mejores
            oportunidades en Armenia, Quindío.
          </p>
          <div className="actions">
            <Link className="btn" href="/inventario">
              EXPLORAR INVENTARIO <ArrowUpRight size={16} />
            </Link>
            <Link className="btn btn-outline" href="/vende-tu-carro">
              VENDER MI VEHÍCULO <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-index">PASIÓN QUE SE CONDUCE</div>
        <div className="hero-bottom">
          <span>
            <MapPin size={13} /> ARMENIA, QUINDÍO
          </span>
          <span>
            <CircleCheck size={13} /> VEHÍCULOS CON HISTORIA. TU PRÓXIMA
            HISTORIA.
          </span>
        </div>
        <span className="hero-caption">
          Imagen generada · Inspirada en el Audi TT
        </span>
      </section>
      <div className="container">
        <form action="/inventario" className="quick-search" noValidate>
          <div className="field">
            <label htmlFor="quick-brand">¿QUÉ MARCA BUSCAS?</label>
            <select id="quick-brand" name="brand" defaultValue="">
              <option value="">Todas las marcas</option>
              {inventory.brands.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="quick-budget">TU PRESUPUESTO</label>
            <select id="quick-budget" name="priceMax" defaultValue="">
              <option value="">Cualquier presupuesto</option>
              <option value="80000000">Hasta $80.000.000</option>
              <option value="120000000">Hasta $120.000.000</option>
              <option value="200000000">Hasta $200.000.000</option>
              <option value="300000000">Hasta $300.000.000</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="quick-type">TIPO DE VEHÍCULO</label>
            <select id="quick-type" name="bodyType" defaultValue="">
              <option value="">Todos los vehículos</option>
              {[
                "SUV",
                "Sedán",
                "Hatchback",
                "Pickup",
                "Coupé",
                "Convertible",
                "Motocicleta",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit">
            <Search size={16} /> BUSCAR VEHÍCULO
          </button>
        </form>
        <nav className="brand-strip" aria-label="Explorar por marca">
          {[
            {
              label: "Mercedes-Benz",
              brand: "Mercedes Benz",
              style: "mercedes",
            },
            { label: "BMW", brand: "BMW", style: "bmw" },
            { label: "PORSCHE", brand: "Porsche", style: "porsche" },
            { label: "Audi", brand: "Audi", style: "audi" },
            { label: "mazda", brand: "Mazda", style: "mazda" },
            { label: "TOYOTA", brand: "Toyota" },
          ].map(({ label, brand, style }) => (
            <Link
              key={brand}
              className={style}
              href={{ pathname: "/inventario", query: { brand } }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <section className="container inventory-section">
        <Reveal>
          <div className="section-title">
            <div>
              <p className="eyebrow">ENCUENTRA EL TUYO</p>
              <h2>
                HECHOS PARA <span className="text-red">DESTACAR.</span>
              </h2>
            </div>
            <Link className="text-link" href="/inventario">
              Ver todo el inventario <ArrowRight size={16} />
            </Link>
          </div>
          {selected.length ? (
            <div className="vehicles-grid">
              {selected.slice(0, 3).map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  whatsapp={settings.whatsapp}
                />
              ))}
            </div>
          ) : (
            <div className="inventory-empty">
              <div>
                <p className="eyebrow">VEHÍCULOS DESTACADOS</p>
                <h3>Tu próxima historia comienza con una conversación.</h3>
                <p>
                  {inventory.configured
                    ? "Estamos verificando la disponibilidad de nuestra selección. Conoce nuestras publicaciones o cuéntanos qué carro estás buscando."
                    : "El inventario no está disponible en este momento. Nuestro equipo puede ayudarte a encontrar tu próximo carro."}
                </p>
                <Link className="text-link" href="/contacto">
                  Cuéntanos qué buscas <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="inventory-empty-visual">
                <CarFront />
                <span>
                  <strong>LA SUBASTA AXM</strong>Pasión por lo que conduces.
                  <span>Armenia · Quindío</span>
                </span>
              </div>
            </div>
          )}
        </Reveal>
      </section>
      <section className="section section-dark">
        <div className="container">
          <Reveal>
            <div className="section-title">
              <div>
                <p className="eyebrow">MÁS QUE COMPRAR UN CARRO</p>
                <h2>
                  ELIGE CON <span className="text-red">CONFIANZA.</span>
                </h2>
              </div>
            </div>
            <div className="benefits-grid">
              {benefits.slice(0, 6).map((b, i) => {
                const Icon = icons[i % 3];
                return (
                  <article className="benefit" key={b.title}>
                    <Icon size={34} />
                    <h3>{b.title}</h3>
                    <p>{b.description}</p>
                  </article>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>
      <section className="container section instagram-section">
        <Reveal>
          <div className="section-title">
            <div>
              <p className="eyebrow">EL MUNDO DE LA SUBASTA</p>
              <h2>
                NUESTRA PASIÓN.
                <br />
                EN CADA <span className="text-red">PUBLICACIÓN.</span>
              </h2>
            </div>
            <a
              className="text-link"
              href={settings.instagramUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={17} />
              @lasubastaaxm <ArrowUpRight size={15} />
            </a>
          </div>
          {posts.some((post) => post.vehicle?.images.length) ? (
            <>
              <div className="vehicles-grid">
                {posts
                  .filter((post) => post.vehicle?.images.length)
                  .slice(0, 3)
                  .map(
                    (p) =>
                      p.vehicle?.images[0] && (
                        <a
                          key={p.id}
                          className="social-post"
                          href={p.permalink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Image
                            src={p.vehicle.images[0].url}
                            alt={`Publicación original: ${p.vehicle.brand} ${p.vehicle.model}`}
                            fill
                            sizes="(max-width:700px) 45vw, 30vw"
                          />
                          <Instagram className="post-icon" />
                          <div className="post-caption">
                            <div>
                              <strong>
                                {p.vehicle.brand} {p.vehicle.model}
                              </strong>
                              <span>
                                {p.vehicle.year} · {money(p.vehicle.price)}
                              </span>
                            </div>
                            <ArrowUpRight size={21} />
                          </div>
                        </a>
                      ),
                  )}
              </div>
              <p className="instagram-disclaimer">
                Publicaciones originales de LA SUBASTA AXM. Precios anunciados
                en las publicaciones; disponibilidad y precio actual sujetos a
                confirmación con el equipo.
              </p>
            </>
          ) : (
            <div className="empty-state">
              <Instagram size={32} />
              <h3>Conoce nuestra vitrina en Instagram</h3>
              <p>Descubre los vehículos y las historias de @lasubastaaxm.</p>
              <a
                className="btn btn-outline"
                href={settings.instagramUrl}
                target="_blank"
                rel="noreferrer"
              >
                Visitar Instagram <ArrowUpRight size={16} />
              </a>
            </div>
          )}
        </Reveal>
      </section>
      <section className="sell-banner">
        <div>
          <p className="eyebrow" style={{ color: "white" }}>
            DALE PASO A LO QUE VIENE
          </p>
          <h2>¿LISTO PARA CAMBIAR DE CARRO?</h2>
          <p>
            Tu carro puede ser el comienzo de tu próxima aventura. Hablemos.
          </p>
        </div>
        <Link className="btn" href="/vende-tu-carro">
          QUIERO VENDER MI CARRO <ArrowUpRight size={17} />
        </Link>
      </section>
    </>
  );
}
