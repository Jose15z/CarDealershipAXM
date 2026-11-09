"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { api, Heading, Feedback, Loading, Modal } from "./shared";
const schema = z.object({
  name: z.string().min(1, "Ingresa el nombre."),
  city: z.string().min(1, "Ingresa la ciudad."),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z
    .string()
    .regex(/^57\d{10}$/, "Usa 57 seguido de diez dígitos.")
    .nullable(),
  email: z.string().email("Revisa el correo.").nullable(),
  instagramUrl: z.literal("https://www.instagram.com/lasubastaaxm/"),
  openingHours: z.string().nullable(),
  privacyPolicy: z.string().nullable(),
  terms: z.string().nullable(),
});
type Settings = {
  name: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagramUrl: "https://www.instagram.com/lasubastaaxm/";
  openingHours: string;
  privacyPolicy: string;
  terms: string;
};
export function DealershipSettings() {
  const router = useRouter();
  const [exit, setExit] = useState("");
  const [benefitsDirty, setBenefitsDirty] = useState(false);
  const allow = useRef(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<Settings>();
  const [benefits, setBenefits] = useState<
    { title: string; description: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<{
      settings: Settings & {
        benefits: { title: string; description: string }[];
      };
    }>("/api/settings")
      .then(({ settings }) => {
        if (active) {
          reset(
            Object.fromEntries(
              Object.entries(settings).map(([k, v]) => [k, v ?? ""]),
            ) as Settings,
          );
          setBenefits(settings.benefits || []);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setMessage(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [reset]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if ((isDirty || benefitsDirty) && !allow.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const anchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        (isDirty || benefitsDirty) &&
        !allow.current &&
        a &&
        a.target !== "_blank" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        setExit(a.href);
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", anchor, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", anchor, true);
    };
  }, [isDirty, benefitsDirty]);
  async function save(values: Settings) {
    const normalized = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === "" && !["name", "city", "instagramUrl"].includes(key)
          ? null
          : value,
      ]),
    );
    const parsed = schema.safeParse(normalized);
    setMessage("");
    setFeedback("");
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        setError(
          issue.path[0] as keyof Settings,
          { message: issue.message },
          { shouldFocus: true },
        );
      return;
    }
    if (benefits.some((b) => !b.title.trim() || !b.description.trim())) {
      setMessage("Completa el título y la descripción de cada beneficio.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/settings", "PATCH", { ...parsed.data, benefits });
      reset(values);
      setBenefitsDirty(false);
      setFeedback(
        "Información del negocio guardada. Los cambios ya están disponibles en el sitio.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const field = (name: keyof Settings, label: string, type = "text") => (
    <label htmlFor={`setting-${name}`}>
      {label}
      <input
        id={`setting-${name}`}
        type={type}
        {...register(name)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `setting-error-${name}` : undefined}
      />
      {errors[name] && (
        <span className="field-error" id={`setting-error-${name}`}>
          {errors[name]?.message}
        </span>
      )}
    </label>
  );
  return (
    <>
      <Heading
        label="IDENTIDAD Y CONTACTO"
        title="Información del dealership"
        description="Publica únicamente datos de contacto verificados."
      />
      <Feedback message={error} error />
      <Feedback message={feedback} />
      {loading ? (
        <Loading />
      ) : (
        <form noValidate className="admin-form" onSubmit={handleSubmit(save)}>
          <section className="admin-panel">
            <h2>Información comercial</h2>
            <div className="form-grid">
              {field("name", "Nombre comercial")}
              {field("city", "Ciudad")}
              {field("address", "Dirección (opcional)")}
              {field("phone", "Teléfono (opcional)", "tel")}
              {field(
                "whatsapp",
                "WhatsApp (opcional) · 57 y diez dígitos",
                "tel",
              )}
              {field("email", "Correo de contacto (opcional)", "email")}
              {field("openingHours", "Horarios de atención (opcional)")}
              <label>
                Instagram oficial
                <input value="@lasubastaaxm" disabled />
                <input type="hidden" {...register("instagramUrl")} />
              </label>
            </div>
          </section>
          <section className="admin-panel">
            <h2>Por qué elegirnos</h2>
            <p className="admin-subtle">
              Los beneficios se mostrarán en la página principal. Evita promesas
              que el negocio no haya autorizado.
            </p>
            {benefits.map((b, i) => (
              <div key={i} className="form-grid" style={{ marginBottom: 22 }}>
                <label htmlFor={`benefit-title-${i}`}>
                  Título del beneficio {i + 1}
                  <input
                    id={`benefit-title-${i}`}
                    value={b.title}
                    onChange={(e) => {
                      setBenefits((v) =>
                        v.map((it, j) =>
                          i === j ? { ...it, title: e.target.value } : it,
                        ),
                      );
                      setBenefitsDirty(true);
                    }}
                  />
                </label>
                <label htmlFor={`benefit-desc-${i}`}>
                  Descripción
                  <input
                    id={`benefit-desc-${i}`}
                    value={b.description}
                    onChange={(e) => {
                      setBenefits((v) =>
                        v.map((it, j) =>
                          i === j ? { ...it, description: e.target.value } : it,
                        ),
                      );
                      setBenefitsDirty(true);
                    }}
                  />
                </label>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => {
                    setBenefits((v) => v.filter((_, j) => j !== i));
                    setBenefitsDirty(true);
                  }}
                >
                  <X size={15} />
                  Quitar beneficio
                </button>
              </div>
            ))}
            <button
              className="btn btn-outline"
              type="button"
              disabled={benefits.length >= 8}
              onClick={() => {
                setBenefits((v) => [...v, { title: "", description: "" }]);
                setBenefitsDirty(true);
              }}
            >
              <Plus size={15} />
              Agregar beneficio
            </button>
          </section>
          <section className="admin-panel">
            <h2>Contenido legal aprobado</h2>
            <p className="admin-subtle">
              Agrega los textos aprobados por el responsable del negocio. Los
              campos vacíos se muestran como pendientes.
            </p>
            <div className="form-grid">
              <label htmlFor="setting-privacy">
                Política de tratamiento de datos
                <textarea
                  id="setting-privacy"
                  rows={8}
                  className="resize-none"
                  {...register("privacyPolicy")}
                />
              </label>
              <label htmlFor="setting-terms">
                Términos y condiciones
                <textarea
                  id="setting-terms"
                  rows={8}
                  className="resize-none"
                  {...register("terms")}
                />
              </label>
            </div>
          </section>
          <Feedback message={error} error />
          <div className="form-actions">
            <button className="btn" disabled={busy}>
              {busy ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </form>
      )}
      <Modal
        open={!!exit}
        onClose={() => setExit("")}
        title="¿Salir sin guardar?"
      >
        <p>Los cambios en la información del dealership se perderán.</p>
        <div className="dialog-actions">
          <button
            autoFocus
            className="btn btn-outline"
            onClick={() => setExit("")}
          >
            Seguir editando
          </button>
          <button
            className="btn"
            onClick={() => {
              allow.current = true;
              router.push(exit);
            }}
          >
            Salir sin guardar
          </button>
        </div>
      </Modal>
    </>
  );
}
