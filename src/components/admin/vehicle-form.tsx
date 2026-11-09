"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, Plus, Upload, X } from "lucide-react";
import { AdminVehicle, api, Feedback, Heading, Loading, Modal } from "./shared";
const nullableNumber = (rule: z.ZodNumber) =>
  z.preprocess(
    (v) => (v === "" || v === null ? null : Number(v)),
    rule.nullable(),
  );
const nullableText = z.string().transform((v) => v.trim() || null);
const schema = z.object({
  brand: z.string().min(1, "Ingresa la marca."),
  model: z.string().min(1, "Ingresa el modelo."),
  version: z.string(),
  year: nullableNumber(
    z
      .number()
      .int()
      .min(1900, "Revisa el año.")
      .max(new Date().getFullYear() + 1, "Revisa el año."),
  ),
  price: nullableNumber(
    z.number().int().positive("Ingresa un precio válido en pesos."),
  ),
  mileage: nullableNumber(z.number().int().min(0, "Revisa el kilometraje.")),
  transmission: nullableText,
  fuel: nullableText,
  bodyType: nullableText,
  displacement: z.string(),
  color: z.string(),
  partialPlate: z.string(),
  city: z.string().min(1, "Ingresa la ciudad."),
  description: z.string(),
  status: z.enum(["DRAFT", "DISPONIBLE", "RESERVADO", "ARCHIVADO"]),
  featured: z.boolean(),
  verified: z.boolean(),
});
type Values = {
  brand: string;
  model: string;
  version: string;
  year: number | string;
  price: number | string;
  mileage: number | string;
  transmission: string;
  fuel: string;
  bodyType: string;
  displacement: string;
  color: string;
  partialPlate: string;
  city: string;
  description: string;
  status: "DRAFT" | "DISPONIBLE" | "RESERVADO" | "ARCHIVADO";
  featured: boolean;
  verified: boolean;
};
const defaults: Values = {
  brand: "",
  model: "",
  version: "",
  year: "",
  price: "",
  mileage: "",
  transmission: "",
  fuel: "",
  bodyType: "",
  displacement: "",
  color: "",
  partialPlate: "",
  city: "Armenia, Quindío",
  description: "",
  status: "DRAFT",
  featured: false,
  verified: false,
};
export function VehicleForm({ id }: { id?: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
    watch,
  } = useForm<Values>({ defaultValues: defaults });
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState("");
  const [error, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [sold, setSold] = useState(false);
  const [images, setImages] = useState<AdminVehicle["images"]>([]);
  const [features, setFeatures] = useState<AdminVehicle["features"]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Confort");
  const [featureName, setFeatureName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [extraDirty, setExtraDirty] = useState(false);
  const [postId, setPostId] = useState("");
  const saved = useRef(false);
  const persisted = useRef<{ id: string; revision: number } | null>(null);
  const exitHref = useRef("/admin/inventario");
  useEffect(() => {
    if (!id) {
      const source = new URLSearchParams(window.location.search).get("post");
      if (source) {
        setPostId(source);
        let active = true;
        api<{
          posts: { id: string; caption: string; media: { url: string }[] }[];
        }>("/api/instagram")
          .then(({ posts }) => {
            const p = posts.find((v) => v.id === source);
            if (active && p) {
              reset({ ...defaults, description: p.caption });
              setImages(
                (p.media || []).map((im, i) => ({
                  url: im.url,
                  alt: `Fotografía autorizada ${i + 1}`,
                  position: i,
                })),
              );
              setExtraDirty(true);
            }
          })
          .catch((e) => {
            if (active) setMessage(e.message);
          });
        return () => {
          active = false;
        };
      }
      return;
    }
    let active = true;
    api<{ vehicle: AdminVehicle }>(`/api/vehicles/${id}?admin=true`)
      .then(({ vehicle: v }) => {
        if (!active) return;
        reset({
          ...defaults,
          ...v,
          version: v.version || "",
          year: v.year ?? "",
          price: v.price === null ? "" : Number(v.price),
          mileage: v.mileage ?? "",
          transmission: v.transmission || "",
          fuel: v.fuel || "",
          bodyType: v.bodyType || "",
          displacement: String(v.displacement || ""),
          color: v.color || "",
          partialPlate: v.partialPlate || "",
          status:
            v.status === "VENDIDO"
              ? "ARCHIVADO"
              : (v.status as Values["status"]),
        });
        setRevision(v.revision);
        setSold(v.status === "VENDIDO");
        setImages(v.images);
        setFeatures(v.features);
        setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setLoadError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, reset]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if ((isDirty || extraDirty) && !saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const anchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        (isDirty || extraDirty) &&
        !saved.current &&
        a &&
        a.target !== "_blank" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        exitHref.current = a.href;
        setCancel(true);
      }
    };
    window.addEventListener("beforeunload", fn);
    document.addEventListener("click", anchor, true);
    return () => {
      window.removeEventListener("beforeunload", fn);
      document.removeEventListener("click", anchor, true);
    };
  }, [isDirty, extraDirty]);
  async function save(values: Values) {
    setMessage("");
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue, i) =>
        setError(
          issue.path[0] as keyof Values,
          { message: issue.message },
          { shouldFocus: i === 0 },
        ),
      );
      return;
    }
    if (
      ["DISPONIBLE", "RESERVADO"].includes(values.status) &&
      (!values.verified ||
        !images.length ||
        parsed.data.year === null ||
        parsed.data.mileage === null ||
        !parsed.data.transmission ||
        !parsed.data.fuel ||
        !parsed.data.bodyType)
    ) {
      setMessage(
        "Para publicar, completa año, kilometraje, transmisión, combustible y carrocería. Agrega una fotografía y confirma la verificación de los datos.",
      );
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...parsed.data,
        images: images.map((v, i) => ({ url: v.url, alt: v.alt, position: i })),
        features: features.map(({ category, name }) => ({ category, name })),
        revision: persisted.current?.revision ?? revision,
      };
      const target = id || persisted.current?.id;
      const result = await api<{ vehicle: { id: string; revision: number } }>(
        target ? `/api/vehicles/${target}` : "/api/vehicles",
        target ? "PATCH" : "POST",
        payload,
      );
      persisted.current = result.vehicle;
      if (postId)
        await api(`/api/instagram/${postId}`, "PATCH", {
          vehicleId: result.vehicle.id,
        });
      saved.current = true;
      router.push("/admin/inventario?guardado=1");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function addImage() {
    const parsed = z.string().url().safeParse(imageUrl);
    if (!parsed.success || !imageUrl.startsWith("https://")) {
      setMessage("Ingresa una URL HTTPS válida de una fotografía autorizada.");
      return;
    }
    if (images.some((i) => i.url === imageUrl)) {
      setMessage("Esta fotografía ya está en la galería.");
      return;
    }
    setImages((v) => [
      ...v,
      {
        url: imageUrl,
        alt: `${watch("brand")} ${watch("model")} - fotografía ${v.length + 1}`,
        position: v.length,
      },
    ]);
    setImageUrl("");
    setMessage("");
    setExtraDirty(true);
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setMessage("Selecciona una imagen JPEG, PNG o WebP de máximo 10 MB.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const signed = await api<{ uploadUrl: string; url: string }>(
        "/api/uploads",
        "POST",
        { name: file.name, type: file.type, size: file.size },
      );
      const r = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!r.ok)
        throw new Error(
          "No pudimos subir la fotografía. Revisa la configuración de almacenamiento.",
        );
      const completed = await api<{ url: string }>(
        "/api/uploads/complete",
        "POST",
        { key: (signed as typeof signed & { key: string }).key },
      );
      setImages((v) => [
        ...v,
        {
          url: completed.url,
          alt: `${watch("brand")} ${watch("model")} - fotografía ${v.length + 1}`,
          position: v.length,
        },
      ]);
      setExtraDirty(true);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function addFeature() {
    const value = featureName.trim();
    if (!value) return;
    if (
      features.some(
        (f) =>
          f.category === category &&
          f.name.toLowerCase() === value.toLowerCase(),
      )
    )
      return;
    setFeatures((v) => [...v, { category, name: value }]);
    setFeatureName("");
    setExtraDirty(true);
  }
  const text = (
    name: keyof Values,
    label: string,
    options: { type?: string; hint?: string; wide?: boolean } = {},
  ) => (
    <label
      className={options.wide ? "form-wide" : ""}
      htmlFor={`vehicle-${name}`}
    >
      {label}
      <input
        id={`vehicle-${name}`}
        type={options.type || "text"}
        {...register(name)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `error-${name}` : undefined}
      />
      {options.hint && <small className="muted">{options.hint}</small>}
      {errors[name] && (
        <span className="field-error" id={`error-${name}`}>
          {errors[name]?.message}
        </span>
      )}
    </label>
  );
  const select = (name: keyof Values, label: string, options: string[]) => (
    <label htmlFor={`vehicle-${name}`}>
      {label}
      <select
        id={`vehicle-${name}`}
        aria-label={label}
        {...register(name)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `error-${name}` : undefined}
      >
        <option value="">Selecciona una opción</option>
        {[
          ...(watch(name) && !options.includes(String(watch(name)))
            ? [String(watch(name))]
            : []),
          ...options,
        ].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      {errors[name] && (
        <span className="field-error" id={`error-${name}`}>
          {errors[name]?.message}
        </span>
      )}
    </label>
  );
  if (loading) return <Loading />;
  if (loadError)
    return (
      <>
        <Feedback message={loadError} error />
        <Link className="btn btn-outline" href="/admin/inventario">
          Volver al inventario
        </Link>
      </>
    );
  return (
    <>
      <Heading
        label="INVENTARIO / FICHA DEL VEHÍCULO"
        title={id ? "Editar vehículo" : "Agregar vehículo"}
        description="Publica únicamente información y fotografías verificadas."
      />
      <Feedback message={error} error />
      {sold && (
        <div className="notice">
          Este vehículo está vendido. Su historial se conserva y no puede volver
          a publicarse desde esta ficha.
        </div>
      )}
      <form noValidate className="admin-form" onSubmit={handleSubmit(save)}>
        <section className="admin-panel">
          <h2>Identidad y precio</h2>
          <div className="form-grid">
            {text("brand", "Marca")}
            {text("model", "Modelo")}
            {text("version", "Versión (opcional)")}
            {text("year", "Año", { type: "number" })}
            {text("price", "Precio de venta (COP)", {
              type: "number",
              hint: "Valor completo en pesos, sin separadores. Déjalo vacío si no está anunciado; se mostrará Consultar precio.",
            })}
            {text("mileage", "Kilometraje (km)", { type: "number" })}
            {select("transmission", "Transmisión", [
              "Automática",
              "Mecánica",
              "Semiautomática",
            ])}
            {select("fuel", "Combustible", [
              "Gasolina",
              "Diésel",
              "Híbrido",
              "Eléctrico",
              "Gas",
            ])}
            {select("bodyType", "Carrocería", [
              "SUV",
              "Sedán",
              "Hatchback",
              "Camioneta",
              "Pickup",
              "Motocicleta",
              "Coupé",
              "Convertible",
              "Van",
              "Otro",
            ])}
            {text("displacement", "Cilindraje (opcional)", {
              hint: "Ejemplo: 2000 cc.",
            })}
            {text("color", "Color (opcional)")}
            {text("partialPlate", "Placa parcial (opcional)", {
              hint: "No publiques la placa completa.",
            })}
            {text("city", "Ciudad")}
            <label className="form-wide" htmlFor="vehicle-description">
              Descripción
              <textarea
                id="vehicle-description"
                className="resize-none"
                rows={5}
                {...register("description")}
                aria-invalid={!!errors.description}
                aria-describedby={
                  errors.description ? "error-description" : undefined
                }
              />
              {errors.description && (
                <span id="error-description" className="field-error">
                  {errors.description.message}
                </span>
              )}
            </label>
          </div>
        </section>
        <section className="admin-panel">
          <h2>Galería de fotografías</h2>
          <p className="admin-subtle">
            La primera fotografía será la portada. Usa imágenes autorizadas, sin
            datos personales visibles.
          </p>
          <div className="image-editor">
            {images.map((im, i) => (
              <div key={`${im.url}-${i}`} className="admin-image-row">
                <img src={im.url} alt={im.alt} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label htmlFor={`alt-${i}`}>
                    Texto alternativo {i === 0 ? "· Portada" : ""}
                    <input
                      id={`alt-${i}`}
                      value={im.alt}
                      onChange={(e) => {
                        setImages((v) =>
                          v.map((it, j) =>
                            j === i ? { ...it, alt: e.target.value } : it,
                          ),
                        );
                        setExtraDirty(true);
                      }}
                    />
                  </label>
                </div>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setImages((v) => {
                        const next = [...v];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        return next;
                      });
                      setExtraDirty(true);
                    }}
                    aria-label={`Mover fotografía ${i + 1} a la posición anterior`}
                  >
                    Subir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setImages((v) => v.filter((_, j) => j !== i));
                    setExtraDirty(true);
                  }}
                  aria-label={`Eliminar fotografía ${i + 1}`}
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>
          <div className="admin-upload">
            <label htmlFor="image-url">
              Agregar fotografía desde URL HTTPS
              <input
                id="image-url"
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-outline"
              onClick={addImage}
            >
              <Plus size={15} />
              Agregar fotografía
            </button>
            <label htmlFor="image-file">
              <span>
                <Upload size={14} /> O subir una fotografía
              </span>
              <input
                id="image-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <small>
              {uploading
                ? "Subiendo fotografía…"
                : "JPEG, PNG o WebP · Máximo 10 MB. Requiere almacenamiento externo configurado."}
            </small>
          </div>
        </section>
        <section className="admin-panel">
          <h2>Equipamiento verificado</h2>
          <p className="admin-subtle">
            Agrega solo características confirmadas para este vehículo.
          </p>
          <div className="feature-input">
            <label htmlFor="feature-category">
              <span className="sr-only">Grupo de equipamiento</span>
              <select
                id="feature-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {["Confort", "Tecnología", "Seguridad", "Exterior"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label htmlFor="feature-name" style={{ flex: 1 }}>
              <span className="sr-only">Nombre de la característica</span>
              <input
                id="feature-name"
                placeholder="Ejemplo: cámara de reversa"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-outline"
              onClick={addFeature}
              aria-label="Agregar característica"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="feature-tags">
            {features.map((f, i) => (
              <button
                type="button"
                key={`${f.category}-${f.name}`}
                onClick={() => {
                  setFeatures((v) => v.filter((_, j) => j !== i));
                  setExtraDirty(true);
                }}
                aria-label={`Quitar ${f.name}`}
              >
                {f.category} · {f.name} ×
              </button>
            ))}
          </div>
        </section>
        <section className="admin-panel">
          <h2>Publicación</h2>
          <div className="form-grid">
            <label htmlFor="vehicle-status">
              Estado
              <select
                id="vehicle-status"
                aria-label="Estado"
                disabled={sold}
                {...register("status")}
              >
                <option value="DRAFT">
                  Borrador · Solo visible para tu equipo
                </option>
                <option value="DISPONIBLE">
                  Disponible · Publicar en el catálogo
                </option>
                <option value="RESERVADO">Reservado</option>
                <option value="ARCHIVADO">Archivado</option>
              </select>
            </label>
            <label htmlFor="post-reference">
              ID interno de publicación de Instagram (opcional)
              <input
                id="post-reference"
                value={postId}
                onChange={(e) => {
                  setPostId(e.target.value);
                  setExtraDirty(true);
                }}
              />
              <small className="muted">
                Copia la referencia del módulo Instagram para vincular la
                importación.
              </small>
            </label>
            <label className="field-check" htmlFor="vehicle-featured">
              <input
                id="vehicle-featured"
                type="checkbox"
                {...register("featured")}
              />
              Mostrar en vehículos destacados
            </label>
            <label className="field-check" htmlFor="vehicle-verified">
              <input
                id="vehicle-verified"
                type="checkbox"
                {...register("verified")}
              />
              Confirmo que los datos y las imágenes fueron verificados.
            </label>
          </div>
        </section>
        <Feedback message={error} error />
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              if (isDirty || extraDirty) {
                exitHref.current = "/admin/inventario";
                setCancel(true);
              } else router.push("/admin/inventario");
            }}
          >
            <ArrowLeft size={16} />
            Cancelar
          </button>
          <button
            className="btn"
            type="submit"
            disabled={busy || uploading || sold}
          >
            {busy ? "Guardando…" : "Guardar vehículo"}
          </button>
          <span className="muted">
            Los cambios se reflejan en el catálogo público.
          </span>
        </div>
      </form>
      <Modal
        open={cancel}
        onClose={() => setCancel(false)}
        title="¿Salir sin guardar?"
      >
        <p>
          Los cambios de esta ficha se perderán. Guarda el vehículo para
          conservarlos.
        </p>
        <div className="dialog-actions">
          <button
            autoFocus
            className="btn btn-outline"
            onClick={() => setCancel(false)}
          >
            Seguir editando
          </button>
          <button
            className="btn"
            onClick={() => {
              saved.current = true;
              router.push(exitHref.current);
            }}
          >
            Salir sin guardar
          </button>
        </div>
      </Modal>
    </>
  );
}
