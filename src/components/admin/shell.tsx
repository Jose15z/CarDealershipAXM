"use client";
import Link from "next/link";
import { SignOutButton } from "@/components/customer/shared";
import { usePathname } from "next/navigation";
import {
  CarFront,
  Users,
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Instagram,
  Settings2,
  ArrowUpRight,
} from "lucide-react";

const links = [
  ["/admin", "Resumen", LayoutDashboard],
  ["/admin/inventario", "Inventario", CarFront],
  ["/admin/clientes", "Clientes", Users],
  ["/admin/solicitudes", "Solicitudes", MessageSquare],
  ["/admin/citas", "Visitas", CalendarDays],
  ["/admin/instagram", "Instagram", Instagram],
  ["/admin/configuracion", "Configuración", Settings2],
] as const;
export function AdminShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const pathname = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          LA SUBASTA <strong>AXM</strong>
          <span>GESTIÓN COMERCIAL</span>
        </Link>
        <nav aria-label="Administración">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href ||
                (href != "/admin" && pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <span className="muted">Sesión de administrador</span>
          <strong>{name}</strong>
          <SignOutButton />
          <Link href="/" className="text-link">
            Ver sitio público <ArrowUpRight size={15} />
          </Link>
        </div>
      </aside>
      <div className="admin-content">
        <div className="admin-topbar">
          <span>
            LA SUBASTA AXM <span className="muted">/ Administración</span>
          </span>
          <span className="admin-session-dot">Sesión segura</span>
        </div>
        <main id="admin-main" className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}
