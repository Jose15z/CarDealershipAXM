import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import "./admin.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/iniciar-sesion?next=/admin");
  if (user.role !== "ADMIN")
    return (
      <main className="container section">
        <h1>Acceso restringido</h1>
        <p className="muted">
          Esta sección requiere una cuenta de administrador.
        </p>
        <a className="btn" href="/">
          Volver al inicio
        </a>
      </main>
    );
  return <AdminShell name={user.name}>{children}</AdminShell>;
}
