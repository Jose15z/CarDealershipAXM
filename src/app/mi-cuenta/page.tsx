import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Account } from "@/components/customer/account";
export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/iniciar-sesion?next=/mi-cuenta");
  return (
    <Suspense
      fallback={
        <div className="container page-heading" role="status">
          Cargando tu cuenta…
        </div>
      }
    >
      <Account user={user} />
    </Suspense>
  );
}
