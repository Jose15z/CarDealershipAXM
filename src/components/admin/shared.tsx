"use client";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, CarFront } from "lucide-react";
export type AdminVehicle = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  version?: string | null;
  year: number | null;
  price: number | string | null;
  mileage: number | null;
  transmission: string | null;
  fuel: string | null;
  bodyType: string | null;
  displacement?: string | null;
  color?: string | null;
  partialPlate?: string | null;
  city: string;
  description: string;
  status: string;
  featured: boolean;
  verified: boolean;
  revision: number;
  images: { url: string; alt: string; position: number }[];
  features: { category: string; name: string }[];
  createdAt?: string;
};
export const money = (value: number | string | null) =>
  value === null
    ? "Precio pendiente"
    : new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(Number(value)) + " COP";
export const date = (value: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
export async function api<T = Record<string, unknown>>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: ["GET", "HEAD"].includes(method.toUpperCase())
      ? undefined
      : { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      payload.error || "No pudimos completar la operación. Intenta de nuevo.",
    );
  return payload as T;
}
export function useRemote<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    fetch(path, { signal: abort.signal, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw new Error(d.error || "No pudimos cargar la información.");
        return d;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [path, version]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
export function Feedback({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <div
      className={`admin-feedback${error ? " error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {message}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="admin-loading" role="status">
      <LoaderCircle size={19} className="admin-spin" />
      Cargando información…
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="admin-empty">
      <CarFront size={28} />
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Heading({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <span className="eyebrow">{label}</span>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      className="admin-dialog"
      aria-labelledby="admin-dialog-title"
    >
      <h2 id="admin-dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
