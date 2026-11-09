"use client";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

export class CustomerApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export async function customerRequest<T>(
  path: string,
  options?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method: options?.method ?? "GET",
      headers: ["GET", "HEAD"].includes(
        (options?.method ?? "GET").toUpperCase(),
      )
        ? undefined
        : { "Content-Type": "application/json" },
      body:
        options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options?.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new CustomerApiError(
      "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.",
      0,
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const issueFields: Record<string, string[]> = {};
    for (const issue of data.issues ?? []) {
      const field = issue.path?.[0];
      if (typeof field === "string") {
        issueFields[field] = [...(issueFields[field] ?? []), issue.message];
      }
    }
    const message =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : "No pudimos completar la operación. Inténtalo de nuevo.";
    throw new CustomerApiError(
      message,
      response.status,
      data.fields ?? data.details?.fieldErrors ?? issueFields,
    );
  }
  return data as T;
}
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setFieldError: UseFormSetError<T>,
) {
  if (!(error instanceof CustomerApiError) || !error.fields) return;
  Object.entries(error.fields).forEach(([key, messages], index) => {
    if (messages?.[0])
      setFieldError(
        key as Path<T>,
        { type: "server", message: messages[0] },
        { shouldFocus: index === 0 },
      );
  });
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No pudimos completar la operación. Inténtalo de nuevo.";
}
export function FormNotice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <div className="customer-feedback">
      {error && (
        <p className="notice customer-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="notice customer-success" role="status">
          {success}
        </p>
      )}
    </div>
  );
}
export const CustomerInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    hint?: string;
  }
>(function CustomerInput({ label, error, hint, id, name, ...props }, ref) {
  const inputId = id ?? name;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
      />
      {hint && (
        <small id={`${inputId}-hint`} className="muted">
          {hint}
        </small>
      )}
      <span className="customer-field-error" id={`${inputId}-error`}>
        {error}
      </span>
    </div>
  );
});
export const PasswordInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
    hint?: string;
  }
>(function PasswordInput(
  { label = "Contraseña", error, hint, id = "password", ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="customer-password">
        <input
          ref={ref}
          id={id}
          {...props}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
        />
        <button
          type="button"
          className="customer-password-toggle"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && (
        <small id={`${id}-hint`} className="muted">
          {hint}
        </small>
      )}
      <span className="customer-field-error" id={`${id}-error`}>
        {error}
      </span>
    </div>
  );
});
export function BusyLabel({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {busy && (
        <LoaderCircle
          size={16}
          className="customer-spinner"
          aria-hidden="true"
        />
      )}
      <span>{busy ? "Procesando…" : children}</span>
    </>
  );
}
export function ConsentField({
  registration,
  error,
}: {
  registration: InputHTMLAttributes<HTMLInputElement>;
  error?: string;
}) {
  return (
    <div className="customer-consent">
      <label>
        <input
          type="checkbox"
          {...registration}
          aria-invalid={Boolean(error)}
          aria-describedby="consent-error"
        />
        <span>
          Autorizo el tratamiento de mis datos para atender mi solicitud y
          gestionar mi cuenta, según la{" "}
          <Link href="/privacidad" className="text-link">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      <span id="consent-error" className="customer-field-error">
        {error}
      </span>
    </div>
  );
}
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        className="btn btn-outline"
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await customerRequest("auth/logout", { method: "POST" });
            router.push("/");
            router.refresh();
          } catch (e) {
            setError(errorMessage(e));
            setBusy(false);
          }
        }}
      >
        <LogOut size={16} />
        <BusyLabel busy={busy}>Cerrar sesión</BusyLabel>
      </button>
      {error && (
        <p role="alert" className="customer-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function UnsavedGuard({ dirty }: { dirty: boolean }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [destination, setDestination] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const link = (event.target as Element).closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href, window.location.href);
      if (
        url.href === window.location.href ||
        url.origin !== window.location.origin ||
        (url.pathname === location.pathname && url.search === location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setDestination(url.pathname + url.search + url.hash);
      dialog.current?.showModal();
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  return (
    <dialog ref={dialog} className="customer-dialog" aria-labelledby={titleId}>
      <h2 id={titleId}>Tienes cambios sin guardar</h2>
      <p className="muted">
        Si sales ahora, perderás los datos que has escrito en este formulario.
      </p>
      <div className="customer-actions">
        <button
          type="button"
          className="btn btn-outline"
          autoFocus
          onClick={() => dialog.current?.close()}
        >
          Seguir aquí
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            dialog.current?.close();
            router.push(destination);
          }}
        >
          Salir sin guardar
        </button>
      </div>
    </dialog>
  );
}
