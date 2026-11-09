import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ArrowUpRight, Plus } from "lucide-react";
import { getDashboard } from "@/lib/data";
import { Heading } from "@/components/admin/shared";
const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value) + " COP";
export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/iniciar-sesion?next=/admin");
  if (user.role !== "ADMIN") redirect("/mi-cuenta");
  const data = await getDashboard();
  return (
    <>
      <Heading
        label="TU NEGOCIO, EN PERSPECTIVA"
        title="Resumen comercial"
        description="Inventario, oportunidades y visitas en un solo lugar."
      >
        <Link className="btn" href="/admin/inventario/nuevo">
          <Plus size={16} />
          Agregar vehículo
        </Link>
      </Heading>
      {!data.configured && (
        <div className="notice">
          La conexión con la base de datos está pendiente. Configura
          DATABASE_URL y ejecuta las migraciones para comenzar.
        </div>
      )}
      <section className="admin-kpis" aria-label="Indicadores comerciales">
        {[
          ["Vehículos disponibles", data.available],
          ["Vehículos vendidos", data.sold],
          ["Valor con precio registrado", money(data.inventoryValue)],
          ["Solicitudes recibidas", data.inquiries],
          ["Visitas programadas", data.appointments],
          ["Ingresos recientes", data.recentVehicles.length],
        ].map(([label, value]) => (
          <article className="admin-kpi" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <div className="admin-grid">
        <section className="admin-panel">
          <h2>Últimos vehículos ingresados</h2>
          {data.recentVehicles.length ? (
            data.recentVehicles.map((v) => (
              <Link
                className="admin-link-card"
                key={v.id}
                href={`/admin/inventario/${v.id}`}
              >
                <div>
                  {v.brand} {v.model} · {v.year}
                  <small>
                    {v.status} ·{" "}
                    {v.price === null
                      ? "Precio pendiente"
                      : money(Number(v.price))}
                  </small>
                </div>
                <ArrowUpRight size={17} />
              </Link>
            ))
          ) : (
            <p className="admin-subtle">
              Todavía no hay vehículos registrados. Agrega un vehículo con sus
              datos y fotografías verificadas.
            </p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Tu centro de gestión</h2>
          <Link className="admin-link-card" href="/admin/instagram">
            <div>
              Revisar Instagram
              <small>
                Importaciones, borradores y publicaciones pendientes.
              </small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link className="admin-link-card" href="/admin/solicitudes">
            <div>
              Atender solicitudes
              <small>Conversa con quienes buscan su próximo vehículo.</small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link className="admin-link-card" href="/admin/configuracion">
            <div>
              Completar información del negocio
              <small>Contacto, horarios y contenido comercial.</small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
    </>
  );
}
