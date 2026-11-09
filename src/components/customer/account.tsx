"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarDays,
  Heart,
  LoaderCircle,
  MessageCircle,
  Save,
} from "lucide-react";
import {
  BusyLabel,
  CustomerApiError,
  CustomerInput,
  FormNotice,
  SignOutButton,
  UnsavedGuard,
  customerRequest,
  errorMessage,
  applyServerErrors,
} from "./shared";
import "./customer.css";

type AccountUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};
type VehicleSummary = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  version?: string | null;
  year?: number | null;
  price?: string | number | null;
  status: string;
  images: { url: string; alt: string }[];
};
type Favorite = { vehicleId: string; vehicle: VehicleSummary };
type Inquiry = {
  id: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
  vehicle?: VehicleSummary | null;
};
type Appointment = {
  id: string;
  scheduledAt: string;
  note: string;
  status: string;
  vehicle: VehicleSummary;
};
type PageData<T> = { total: number; page: number; pages?: number } & T;
const statusLabel: Record<string, string> = {
  NUEVA: "Recibida",
  EN_CONTACTO: "En contacto",
  CERRADA: "Cerrada",
  PENDIENTE: "Pendiente de confirmar",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
  DISPONIBLE: "Disponible",
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
  ARCHIVADO: "Archivado",
  DRAFT: "No publicado",
};
const inquiryType: Record<string, string> = {
  INFORMACION: "Información de vehículo",
  VENTA: "Venta de mi vehículo",
  CONTACTO: "Contacto",
};
const profileSchema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre.").max(100),
  phone: z.string().trim().max(30, "Usa máximo 30 caracteres."),
});
const dateTime = (date: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(date));
const money = (price: string | number) =>
  `$${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(price))} COP`;
function ListEmpty({ children }: { children: React.ReactNode }) {
  return <div className="customer-account-empty muted">{children}</div>;
}
function PageControls({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <nav className="customer-actions" aria-label="Páginas de solicitudes">
      <button
        className="btn btn-outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span className="muted">
        Página {page} de {pages}
      </span>
      <button
        className="btn btn-outline"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}
export function Account({ user }: { user: AccountUser }) {
  const router = useRouter();
  const search = useSearchParams();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pageInfo, setPageInfo] = useState({
    inquiries: 1,
    inquiryPages: 1,
    appointments: 1,
    appointmentPages: 1,
    favorites: 1,
    favoritePages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState("");
  const [cancelId, setCancelId] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? "" },
  });
  const inquiryPage = Math.max(1, Number(search.get("solicitudes")) || 1);
  const appointmentPage = Math.max(1, Number(search.get("citas")) || 1);
  const favoritePage = Math.max(1, Number(search.get("favoritos")) || 1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      customerRequest<PageData<{ favorites: Favorite[] }>>(
        `favorites?page=${favoritePage}`,
        { signal: controller.signal },
      ),
      customerRequest<PageData<{ inquiries: Inquiry[] }>>(
        `inquiries?page=${inquiryPage}`,
        { signal: controller.signal },
      ),
      customerRequest<PageData<{ appointments: Appointment[] }>>(
        `appointments?page=${appointmentPage}`,
        { signal: controller.signal },
      ),
    ])
      .then(([fav, inq, apt]) => {
        if (controller.signal.aborted) return;
        if (fav.pages && favoritePage > fav.pages) {
          const params = new URLSearchParams(window.location.search);
          params.set("favoritos", String(fav.pages));
          router.replace(`/mi-cuenta?${params.toString()}`, { scroll: false });
          return;
        }
        setFavorites(fav.favorites);
        setInquiries(inq.inquiries);
        setAppointments(apt.appointments);
        setPageInfo({
          inquiries: inq.page ?? inquiryPage,
          inquiryPages: inq.pages ?? Math.ceil(inq.total / 20),
          appointments: apt.page ?? appointmentPage,
          appointmentPages: apt.pages ?? Math.ceil(apt.total / 20),
          favorites: fav.page ?? favoritePage,
          favoritePages: fav.pages ?? 1,
        });
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof CustomerApiError && e.status === 401)
          router.push("/iniciar-sesion?next=/mi-cuenta");
        else setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [inquiryPage, appointmentPage, favoritePage, refresh, router]);
  function changePage(key: string, page: number) {
    const params = new URLSearchParams(search);
    params.set(key, String(page));
    router.push(`/mi-cuenta?${params.toString()}`, { scroll: false });
  }
  async function removeFavorite(id: string) {
    setPending(id);
    setError("");
    setSuccess("");
    try {
      await customerRequest("favorites", {
        method: "DELETE",
        body: { vehicleId: id },
      });
      setSuccess("Vehículo retirado de tus favoritos.");
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending("");
    }
  }
  async function cancelAppointment() {
    setPending(cancelId);
    setError("");
    setSuccess("");
    try {
      await customerRequest(`appointments/${cancelId}`, {
        method: "PATCH",
        body: { status: "CANCELADA" },
      });
      dialog.current?.close();
      setSuccess("Visita cancelada.");
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending("");
    }
  }
  return (
    <div className="container customer-account">
      <div className="page-heading customer-account-heading">
        <div>
          <span className="eyebrow">MI CUENTA</span>
          <h1>HOLA, {user.name.split(" ")[0].toLocaleUpperCase("es-CO")}.</h1>
          <p className="muted">Tus carros favoritos y tus próximos pasos.</p>
        </div>
        <SignOutButton />
      </div>
      <div className="customer-account-layout">
        <aside className="panel">
          <h2>Mi perfil</h2>
          <p className="muted">{user.email}</p>
          <form
            className="customer-form"
            noValidate
            onSubmit={handleSubmit(async (values) => {
              setProfileError("");
              setProfileSuccess("");
              try {
                await customerRequest("profile", {
                  method: "PATCH",
                  body: values,
                });
                reset(values);
                setProfileSuccess("Cambios guardados.");
                router.refresh();
              } catch (e) {
                applyServerErrors(e, setFieldError);
                setProfileError(errorMessage(e));
              }
            })}
          >
            <CustomerInput
              label="Nombre completo"
              autoComplete="name"
              {...register("name")}
              error={errors.name?.message}
            />
            <CustomerInput
              label="Celular"
              type="tel"
              autoComplete="tel"
              {...register("phone")}
              error={errors.phone?.message}
            />
            <FormNotice error={profileError} success={profileSuccess} />
            <button
              className="btn btn-outline"
              type="submit"
              disabled={isSubmitting || !isDirty}
              aria-busy={isSubmitting}
            >
              <Save size={16} />
              <BusyLabel busy={isSubmitting}>Guardar cambios</BusyLabel>
            </button>
            <UnsavedGuard dirty={isDirty && !isSubmitting} />
          </form>
          {user.role === "ADMIN" && (
            <p>
              <Link className="text-link" href="/admin">
                Ir al panel administrativo ↗
              </Link>
            </p>
          )}
        </aside>
        <div className="customer-account-content">
          <FormNotice error={error} success={success} />
          {error && (
            <button
              className="btn btn-outline"
              onClick={() => setRefresh((v) => v + 1)}
            >
              Volver a cargar
            </button>
          )}
          {loading && (
            <p className="muted" role="status">
              <LoaderCircle size={16} className="customer-spinner" /> Cargando
              tu cuenta…
            </p>
          )}
          <section className="panel" aria-busy={loading}>
            <h2>
              <Heart size={20} /> Mis favoritos
            </h2>
            {!loading && !error && favorites.length === 0 ? (
              <ListEmpty>
                <p>Aún no has guardado ningún vehículo.</p>
                <Link className="text-link" href="/inventario">
                  Explorar inventario →
                </Link>
              </ListEmpty>
            ) : (
              <ul className="customer-account-list">
                {favorites.map(({ vehicle, vehicleId }) => (
                  <li key={vehicleId} className="customer-account-item">
                    <div className="customer-vehicle-inline">
                      {vehicle.images[0] && (
                        <img
                          src={vehicle.images[0].url}
                          alt={vehicle.images[0].alt}
                          width={100}
                          height={76}
                          loading="lazy"
                        />
                      )}
                      <div>
                        <h3>
                          {vehicle.brand} {vehicle.model} {vehicle.year}
                        </h3>
                        <p className="muted">
                          {vehicle.price
                            ? money(vehicle.price)
                            : "Precio por confirmar"}{" "}
                          · {statusLabel[vehicle.status]}
                        </p>
                        {["DISPONIBLE", "RESERVADO", "VENDIDO"].includes(
                          vehicle.status,
                        ) && (
                          <Link
                            className="text-link"
                            href={`/vehiculos/${vehicle.slug}`}
                          >
                            Ver vehículo →
                          </Link>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-outline"
                      disabled={Boolean(pending)}
                      aria-busy={pending === vehicleId}
                      onClick={() => removeFavorite(vehicleId)}
                    >
                      <BusyLabel busy={pending === vehicleId}>
                        Quitar favorito
                      </BusyLabel>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <PageControls
              page={pageInfo.favorites}
              pages={pageInfo.favoritePages}
              onChange={(p) => changePage("favoritos", p)}
            />
          </section>
          <section className="panel" aria-busy={loading}>
            <h2>
              <MessageCircle size={20} /> Mis solicitudes
            </h2>
            {!loading && !error && inquiries.length === 0 ? (
              <ListEmpty>
                <p>No tienes solicitudes registradas.</p>
                <Link className="text-link" href="/contacto">
                  Hablar con el equipo →
                </Link>
              </ListEmpty>
            ) : (
              <ul className="customer-account-list">
                {inquiries.map((item) => (
                  <li key={item.id} className="customer-account-item">
                    <div>
                      <h3>
                        {item.vehicle
                          ? `${item.vehicle.brand} ${item.vehicle.model}`
                          : (inquiryType[item.type] ?? "Solicitud")}
                      </h3>
                      <p className="muted">{item.message}</p>
                      <p className="muted">
                        {dateTime(item.createdAt)} · Hora de Colombia
                      </p>
                    </div>
                    <span className="badge">
                      {statusLabel[item.status] ?? item.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <PageControls
              page={pageInfo.inquiries}
              pages={pageInfo.inquiryPages}
              onChange={(p) => changePage("solicitudes", p)}
            />
          </section>
          <section className="panel" aria-busy={loading}>
            <h2>
              <CalendarDays size={20} /> Mis visitas
            </h2>
            {!loading && !error && appointments.length === 0 ? (
              <ListEmpty>
                <p>Aún no has agendado una visita.</p>
                <Link className="text-link" href="/inventario">
                  Encontrar mi próximo carro →
                </Link>
              </ListEmpty>
            ) : (
              <ul className="customer-account-list">
                {appointments.map((item) => (
                  <li key={item.id} className="customer-account-item">
                    <div>
                      <h3>
                        {item.vehicle.brand} {item.vehicle.model}{" "}
                        {item.vehicle.year}
                      </h3>
                      <p className="muted">
                        {dateTime(item.scheduledAt)} · Hora de Colombia
                      </p>
                      {item.note && <p className="muted">{item.note}</p>}
                    </div>
                    <div className="customer-item-actions">
                      <span className="badge">
                        {statusLabel[item.status] ?? item.status}
                      </span>
                      {["PENDIENTE", "CONFIRMADA"].includes(item.status) && (
                        <button
                          className="btn btn-outline"
                          disabled={Boolean(pending)}
                          onClick={() => {
                            setCancelId(item.id);
                            dialog.current?.showModal();
                          }}
                        >
                          Cancelar visita
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <PageControls
              page={pageInfo.appointments}
              pages={pageInfo.appointmentPages}
              onChange={(p) => changePage("citas", p)}
            />
          </section>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="customer-dialog"
        aria-labelledby="cancel-visit-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <h2 id="cancel-visit-title">¿Cancelar esta visita?</h2>
        <p className="muted">
          La cita dejará de estar programada. Podrás solicitar una nueva fecha
          desde el vehículo.
        </p>
        {pending === cancelId && <p role="status">Cancelando visita…</p>}
        {error && (
          <p className="notice customer-error" role="alert">
            {error}
          </p>
        )}
        <div className="customer-actions">
          <button
            type="button"
            className="btn btn-outline"
            autoFocus
            disabled={Boolean(pending)}
            onClick={() => dialog.current?.close()}
          >
            Conservar visita
          </button>
          <button
            type="button"
            className="btn"
            disabled={Boolean(pending)}
            aria-busy={Boolean(pending)}
            onClick={cancelAppointment}
          >
            <BusyLabel busy={Boolean(pending)}>Cancelar visita</BusyLabel>
          </button>
        </div>
      </dialog>
    </div>
  );
}
