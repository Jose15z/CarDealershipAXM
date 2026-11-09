import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { getSettings } from "@/lib/data";
export const metadata = {
  title: "Nosotros",
  description:
    "Conoce LA SUBASTA AXM, vehículos seleccionados en Armenia, Quindío.",
};
export default async function About() {
  const settings = await getSettings();
  return (
    <div className="container">
      <div className="page-heading">
        <p className="eyebrow">LA SUBASTA AXM</p>
        <h1>
          PASIÓN QUE <span className="text-red">NOS MUEVE.</span>
        </h1>
      </div>
      <div className="about-grid">
        <div className="about-photo">
          <Image
            src="/images/instagram/DdEiy5VkYdA-cover.jpg"
            alt="Vehículo publicado por LA SUBASTA AXM frente a su vitrina en Armenia"
            fill
            sizes="(max-width:700px) 90vw, 45vw"
          />
        </div>
        <div className="about-copy">
          <p className="eyebrow">ARMENIA, QUINDÍO</p>
          <h2>
            LOS CARROS CONECTAN.
            <br />
            LAS HISTORIAS TAMBIÉN.
          </h2>
          <p>
            Somos LA SUBASTA AXM, una vitrina de vehículos en Armenia. Nos mueve
            la pasión por los automóviles y por acompañarte a encontrar tu
            próximo carro.
          </p>
          <p>
            Explora nuestra selección, conoce los detalles de cada vehículo y
            conversa directamente con el equipo. También recibimos tu carro como
            parte de pago; consulta las opciones con nosotros.
          </p>
          <p className="icon-line">
            <MapPin size={18} />
            {settings.address || settings.city}
          </p>
          <div className="actions">
            <Link className="btn" href="/contacto">
              Conversemos <ArrowUpRight size={16} />
            </Link>
            <a
              className="btn btn-outline"
              href={settings.instagramUrl}
              target="_blank"
              rel="noreferrer"
            >
              Nuestro Instagram <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
