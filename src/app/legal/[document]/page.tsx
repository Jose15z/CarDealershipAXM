import { notFound } from "next/navigation";
import Link from "next/link";
import { getSettings } from "@/lib/data";
export default async function Legal({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  if (!["privacidad", "terminos"].includes(document)) notFound();
  const s = await getSettings();
  const privacy = document === "privacidad";
  const content = privacy ? s.privacyPolicy : s.terms;
  return (
    <div className="container">
      <div className="page-heading">
        <p className="eyebrow">LA SUBASTA AXM</p>
        <h1>{privacy ? "PRIVACIDAD" : "TÉRMINOS Y CONDICIONES"}</h1>
      </div>
      <div className="legal-content">
        {content ? (
          <p>{content}</p>
        ) : (
          <div className="notice">
            <h3>
              {privacy
                ? "Información sobre tus datos"
                : "Información comercial"}
            </h3>
            <p>
              {privacy
                ? "Los formularios guardan los datos que proporcionas para que el equipo pueda responder tu solicitud y gestionar tu cuenta. La política completa del responsable del tratamiento está pendiente de configuración."
                : "La información publicada corresponde a registros verificados por el equipo. Consulta el precio y la disponibilidad antes de tomar una decisión. Las condiciones comerciales completas están pendientes de configuración."}
            </p>
            <p>
              El administrador debe publicar el documento aprobado antes de
              habilitar el servicio comercial al público.
            </p>
            <Link className="text-link" href="/contacto">
              Contactar al equipo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
