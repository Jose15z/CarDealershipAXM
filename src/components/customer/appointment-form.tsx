"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays } from "lucide-react";
import {
  BusyLabel,
  CustomerApiError,
  CustomerInput,
  FormNotice,
  customerRequest,
  errorMessage,
} from "./shared";
import "./customer.css";
const visitSchema = z.object({
  date: z
    .string()
    .min(1, "Elige la fecha y hora de tu visita.")
    .refine(
      (v) =>
        Number.isFinite(Date.parse(`${v}-05:00`)) &&
        Date.parse(`${v}-05:00`) > Date.now(),
      "Elige una fecha y hora futura en Colombia.",
    ),
  note: z.string().max(2000, "Usa máximo 2.000 caracteres."),
});
export function AppointmentForm({ vehicleId }: { vehicleId: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: { date: "", note: "" },
  });
  return (
    <form
      className="customer-form customer-appointment"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError("");
        setSuccess("");
        setNeedsLogin(false);
        try {
          await customerRequest("appointments", {
            method: "POST",
            body: {
              vehicleId,
              scheduledAt: new Date(`${values.date}-05:00`).toISOString(),
              note: values.note,
            },
          });
          setSuccess(
            "Visita solicitada. Espera la confirmación de nuestro equipo en tu cuenta.",
          );
          reset();
        } catch (e) {
          setError(errorMessage(e));
          if (e instanceof CustomerApiError && e.status === 401)
            setNeedsLogin(true);
        }
      })}
    >
      <h2>Agenda una visita</h2>
      <p className="muted">
        Propón una fecha y hora. Nuestro equipo confirmará la disponibilidad.
      </p>
      <CustomerInput
        label="Fecha y hora en Colombia"
        type="datetime-local"
        hint="Zona horaria: Armenia, Colombia (UTC−5)."
        {...register("date")}
        error={errors.date?.message}
      />
      <div className="field">
        <label htmlFor="visit-note">Comentario (opcional)</label>
        <textarea
          id="visit-note"
          className="resize-none"
          rows={3}
          maxLength={2000}
          {...register("note")}
          aria-invalid={Boolean(errors.note)}
          aria-describedby="visit-note-error"
        />
        <span id="visit-note-error" className="customer-field-error">
          {errors.note?.message}
        </span>
      </div>
      <FormNotice error={error} success={success} />
      {needsLogin && (
        <Link
          className="text-link"
          href={`/iniciar-sesion?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/mi-cuenta")}`}
        >
          Inicia sesión para agendar tu visita
        </Link>
      )}
      <button
        className="btn btn-outline"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        type="submit"
      >
        <CalendarDays size={16} />
        <BusyLabel busy={isSubmitting}>Solicitar visita</BusyLabel>
      </button>
    </form>
  );
}
