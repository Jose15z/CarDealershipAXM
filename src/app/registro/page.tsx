import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/customer/auth-forms";
import { getCurrentUser } from "@/lib/auth";
export const metadata: Metadata = {
  title: "Crear cuenta",
  robots: { index: false, follow: false },
};
export default async function RegisterPage({
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
        <span className="eyebrow">TU PRÓXIMO CARRO, MÁS CERCA</span>
        <h1>
          TU PASIÓN.
          <br />
          TU CUENTA.
        </h1>
        <p className="muted">
          Un espacio para guardar tus favoritos y conversar con nuestro equipo
          sobre el vehículo que estás buscando.
        </p>
        <div className="customer-auth-note">
          <Heart size={28} />
          <p className="muted">
            Explora el inventario a tu ritmo y retoma donde lo dejaste.
          </p>
        </div>
      </div>
      <RegisterForm
        next={next}
        configured={Boolean(process.env.DATABASE_URL)}
      />
    </div>
  );
}
