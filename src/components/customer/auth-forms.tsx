"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight } from "lucide-react";
import { loginSchema, registerSchema } from "@/lib/validation";
import {
  BusyLabel,
  ConsentField,
  CustomerInput,
  FormNotice,
  PasswordInput,
  customerRequest,
  errorMessage,
  applyServerErrors,
} from "./shared";
import "./customer.css";

type AuthResponse = { user: { role: string } };
function nextDestination(next: string | undefined, role: string) {
  const fallback = role === "ADMIN" ? "/admin" : "/mi-cuenta";
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f]/.test(next)
  )
    return fallback;
  if (next.startsWith("/admin") && role !== "ADMIN") return "/mi-cuenta";
  if (next.startsWith("/iniciar-sesion") || next.startsWith("/registro"))
    return fallback;
  return next;
}
export function LoginForm({
  next,
  configured,
}: {
  next?: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof loginSchema>,
    unknown,
    z.output<typeof loginSchema>
  >({ resolver: zodResolver(loginSchema) });
  return (
    <form
      className="panel customer-form"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          const result = await customerRequest<AuthResponse>("auth/login", {
            method: "POST",
            body: values,
          });
          router.push(nextDestination(next, result.user.role));
          router.refresh();
        } catch (e) {
          applyServerErrors(e, setFieldError);
          setError(errorMessage(e));
        }
      })}
    >
      <h2>Inicia sesión</h2>
      <p className="muted">Tus favoritos y solicitudes, en un solo lugar.</p>
      {!configured && (
        <p className="notice" role="status">
          El inicio de sesión estará disponible cuando se conecte la base de
          datos.
        </p>
      )}
      <CustomerInput
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        {...register("email")}
        error={
          errors.email ? "Escribe un correo electrónico válido." : undefined
        }
      />
      <PasswordInput
        autoComplete="current-password"
        {...register("password")}
        error={errors.password ? "Escribe tu contraseña." : undefined}
      />
      <FormNotice error={error} />
      <button
        className="btn"
        type="submit"
        disabled={isSubmitting || !configured}
        aria-busy={isSubmitting}
      >
        <BusyLabel busy={isSubmitting}>Iniciar sesión</BusyLabel>
        <ArrowUpRight size={17} />
      </button>
      <p className="customer-form-footer muted">
        ¿Aún no tienes cuenta?{" "}
        <Link
          className="text-link"
          href={`/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`}
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}
export function RegisterForm({
  next,
  configured,
}: {
  next?: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof registerSchema>,
    unknown,
    z.output<typeof registerSchema>
  >({ resolver: zodResolver(registerSchema) });
  return (
    <form
      className="panel customer-form"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          const result = await customerRequest<AuthResponse>("auth/register", {
            method: "POST",
            body: values,
          });
          router.push(nextDestination(next, result.user.role));
          router.refresh();
        } catch (e) {
          applyServerErrors(e, setFieldError);
          setError(errorMessage(e));
        }
      })}
    >
      <h2>Crea tu cuenta</h2>
      <p className="muted">Comienza a encontrar tu próximo carro.</p>
      {!configured && (
        <p className="notice" role="status">
          El registro estará disponible cuando se conecte la base de datos.
        </p>
      )}
      <CustomerInput
        label="Nombre completo"
        autoComplete="name"
        maxLength={100}
        {...register("name")}
        error={errors.name?.message}
      />
      <CustomerInput
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        {...register("email")}
        error={
          errors.email ? "Escribe un correo electrónico válido." : undefined
        }
      />
      <CustomerInput
        label="Celular (opcional)"
        type="tel"
        autoComplete="tel"
        maxLength={30}
        {...register("phone")}
        error={errors.phone?.message}
      />
      <PasswordInput
        autoComplete="new-password"
        hint="Usa entre 12 y 72 caracteres. Puedes pegar una contraseña de tu gestor."
        {...register("password")}
        error={errors.password?.message}
      />
      <ConsentField
        registration={register("consent")}
        error={errors.consent?.message}
      />
      <FormNotice error={error} />
      <button
        type="submit"
        className="btn"
        disabled={isSubmitting || !configured}
        aria-busy={isSubmitting}
      >
        <BusyLabel busy={isSubmitting}>Crear cuenta</BusyLabel>
        <ArrowUpRight size={17} />
      </button>
      <p className="customer-form-footer muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          className="text-link"
          href={`/iniciar-sesion${next ? `?next=${encodeURIComponent(next)}` : ""}`}
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
