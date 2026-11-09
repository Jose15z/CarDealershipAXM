import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Instagram, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { InquiryForm } from "@/components/customer/inquiry-form";
export const metadata: Metadata = {
  title: "Contacto | Armenia, Quindío",
  description:
    "Conversa con LA SUBASTA AXM sobre tu próximo vehículo en Armenia, Quindío.",
};
export const dynamic = "force-dynamic";
export default async function ContactPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <div className="container">
      <div className="page-heading">
        <span className="eyebrow">HABLEMOS DE CARROS</span>
        <h1>ESTAMOS CERCA.</h1>
        <p className="muted">
          Resolvamos tus preguntas y encontremos tu próximo camino.
        </p>
      </div>
      <div className="customer-contact">
        <div className="customer-contact-information">
          <div className="customer-contact-block">
            <MapPin size={22} />
            <div>
              <h2>Visítanos en Armenia</h2>
              <p className="muted">{settings.address ?? settings.city}</p>
              {settings.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.address}, ${settings.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  Ver ubicación en el mapa ↗
                </a>
              )}
            </div>
          </div>
          {settings.phone && (
            <div className="customer-contact-block">
              <Phone size={22} />
              <div>
                <h2>Conversa con nosotros</h2>
                <a
                  className="text-link"
                  href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}
                >
                  {settings.phone}
                </a>
                {settings.whatsapp && (
                  <p>
                    <a
                      className="text-link"
                      href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("Hola, quisiera información sobre los vehículos de LA SUBASTA AXM.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Escríbenos por WhatsApp ↗
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}
          {settings.openingHours && (
            <div className="customer-contact-block">
              <Clock3 size={22} />
              <div>
                <h2>Horario de atención</h2>
                <p className="muted">{settings.openingHours}</p>
              </div>
            </div>
          )}
          <div className="customer-contact-block">
            <Instagram size={22} />
            <div>
              <h2>@lasubastaaxm</h2>
              <p className="muted">
                Conoce nuestras publicaciones y novedades.
              </p>
              <a
                className="text-link"
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visitar Instagram ↗
              </a>
            </div>
          </div>
          <p className="muted">
            ¿Quieres vender tu carro?{" "}
            <Link className="text-link" href="/vende-tu-carro">
              Cuéntanos de tu vehículo.
            </Link>
          </p>
        </div>
        <div className="panel">
          <InquiryForm
            type="CONTACTO"
            initialValues={user ?? undefined}
            heading="Cuéntanos qué buscas"
            configured={Boolean(process.env.DATABASE_URL)}
          />
        </div>
      </div>
    </div>
  );
}
