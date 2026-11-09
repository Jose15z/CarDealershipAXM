import type { Metadata } from "next";
import { Camera, ClipboardList, MessagesSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { InquiryForm } from "@/components/customer/inquiry-form";
export const metadata: Metadata = {
  title: "Vende tu carro en Armenia",
  description:
    "Presenta tu vehículo a LA SUBASTA AXM. Cuéntanos sus características y conversa con nuestro equipo en Armenia.",
};
export const dynamic = "force-dynamic";
export default async function SellPage() {
  const user = await getCurrentUser();
  return (
    <div className="container">
      <div className="page-heading">
        <span className="eyebrow">UN NUEVO CAMINO PARA TU CARRO</span>
        <h1>DA EL SIGUIENTE PASO.</h1>
        <p className="muted">
          ¿Estás pensando en vender tu vehículo? Queremos conocerlo.
        </p>
      </div>
      <div className="customer-contact">
        <div className="customer-contact-information">
          <div className="customer-contact-block">
            <ClipboardList size={24} />
            <div>
              <h2>Cuéntanos los detalles</h2>
              <p className="muted">
                Marca, modelo, año, kilometraje, versión y precio esperado.
              </p>
            </div>
          </div>
          <div className="customer-contact-block">
            <Camera size={24} />
            <div>
              <h2>Comparte sus mejores ángulos</h2>
              <p className="muted">
                Puedes incluir enlaces públicos a tus fotografías en el mensaje.
                Luego te contactaremos para conocer más.
              </p>
            </div>
          </div>
          <div className="customer-contact-block">
            <MessagesSquare size={24} />
            <div>
              <h2>Conversemos</h2>
              <p className="muted">
                Nuestro equipo revisará la información y te contactará para
                evaluar las opciones.
              </p>
            </div>
          </div>
          <p className="muted">
            Enviar los datos no implica una oferta de compra ni fija el valor
            comercial de tu vehículo.
          </p>
        </div>
        <div className="panel">
          <InquiryForm
            type="VENTA"
            initialValues={user ?? undefined}
            heading="Presenta tu vehículo"
            configured={Boolean(process.env.DATABASE_URL)}
          />
        </div>
      </div>
    </div>
  );
}
