import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/customer/auth-forms";
import { getCurrentUser } from "@/lib/auth";
export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/mi-cuenta");
  const { next } = await searchParams;
  return (
    <div className="container customer-auth">
      <div className="customer-auth-intro">
        <span className="eyebrow">TU ESPACIO · LA SUBASTA AXM</span>
        <h1>
          EL PRÓXIMO PASO
          <br />
          EMPIEZA CONTIGO.
        </h1>
        <p className="muted">
          Guarda los carros que te gustan, agenda tu visita y sigue tus
          solicitudes desde tu cuenta.
        </p>
        <div className="customer-auth-note">
          <ShieldCheck size={28} />
          <p className="muted">
            Tu información y tus preferencias, siempre bajo tu control.
          </p>
        </div>
      </div>
      <LoginForm next={next} configured={Boolean(process.env.DATABASE_URL)} />
    </div>
  );
}
