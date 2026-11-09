"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send } from "lucide-react";
import { inquirySchema } from "@/lib/validation";
import {
  BusyLabel,
  ConsentField,
  CustomerInput,
  FormNotice,
  UnsavedGuard,
  customerRequest,
  errorMessage,
  applyServerErrors,
} from "./shared";
import "./customer.css";
export function InquiryForm({
  vehicleId,
  type = "INFORMACION",
  initialValues,
  heading,
  configured = true,
}: {
  vehicleId?: string;
  type?: "INFORMACION" | "CONTACTO" | "VENTA";
  initialValues?: { name?: string; email?: string; phone?: string | null };
  heading?: string;
  configured?: boolean;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<
    z.input<typeof inquirySchema>,
    unknown,
    z.output<typeof inquirySchema>
  >({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      vehicleId,
      type,
      name: initialValues?.name ?? "",
      email: initialValues?.email ?? "",
      phone: initialValues?.phone ?? "",
      message: "",
      consent: undefined,
    },
  });
  return (
    <form
      className="customer-form"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError("");
        setSuccess("");
        try {
          await customerRequest("inquiries", { method: "POST", body: values });
          setSuccess(
            "Solicitud recibida. Nuestro equipo se pondrá en contacto contigo.",
          );
          reset({ ...values, message: "", consent: undefined });
        } catch (e) {
          applyServerErrors(e, setFieldError);
          setError(errorMessage(e));
        }
      })}
    >
      {heading && <h2>{heading}</h2>}
      <p className="muted">
        {type === "VENTA"
          ? "Cuéntanos la marca, modelo, año, kilometraje y el precio que tienes en mente."
          : "Déjanos tus datos y cuéntanos cómo podemos ayudarte."}
      </p>
      {!configured && (
        <p className="notice" role="status">
          El formulario estará disponible al conectar la base de datos. También
          puedes contactarnos por Instagram.
        </p>
      )}
      <div className="form-grid">
        <CustomerInput
          label="Nombre completo"
          autoComplete="name"
          maxLength={100}
          {...register("name")}
          error={errors.name?.message}
        />
        <CustomerInput
          label="Celular"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          {...register("phone")}
          error={errors.phone?.message}
        />
      </div>
      <CustomerInput
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        {...register("email")}
        error={
          errors.email ? "Escribe un correo electrónico válido." : undefined
        }
      />
      <div className="field">
        <label htmlFor={`message-${type}`}>
          {type === "VENTA" ? "Información de tu vehículo" : "Tu mensaje"}
        </label>
        <textarea
          id={`message-${type}`}
          rows={5}
          maxLength={5000}
          className="resize-none"
          {...register("message")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={`message-${type}-error`}
          placeholder={
            type === "VENTA"
              ? "Marca, modelo, año, kilómetros, versión y precio esperado. Agrega enlaces a fotografías si los tienes."
              : "Me gustaría conocer más información…"
          }
        />
        <span className="customer-field-error" id={`message-${type}-error`}>
          {errors.message?.message}
        </span>
      </div>
      <ConsentField
        registration={register("consent")}
        error={errors.consent?.message}
      />
      <FormNotice error={error} success={success} />
      <button
        className="btn"
        type="submit"
        disabled={isSubmitting || !configured}
        aria-busy={isSubmitting}
      >
        <BusyLabel busy={isSubmitting}>
          {type === "VENTA" ? "Enviar mi vehículo" : "Enviar solicitud"}
        </BusyLabel>
        <Send size={16} />
      </button>
      <small className="muted">
        Esta solicitud no confirma una compra, reserva ni recepción del
        vehículo. Si la envías con tu sesión iniciada, podrás verla en{" "}
        <Link href="/mi-cuenta" className="text-link">
          tus solicitudes
        </Link>
        .
      </small>
      <UnsavedGuard dirty={isDirty && !isSubmitting} />
    </form>
  );
}
