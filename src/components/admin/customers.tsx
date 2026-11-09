"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  Heading,
  Loading,
  Empty,
  Feedback,
  Modal,
  api,
  useRemote,
  date,
} from "./shared";
type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { inquiries: number; appointments: number };
};
export function Customers() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") || "");
  const [target, setTarget] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const {
    data,
    error: loadError,
    loading,
    reload,
  } = useRemote<{
    users: Customer[];
    total: number;
    page: number;
    pages: number;
  }>(`/api/users?${params}`);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string; phone: string }>();
  function search(page = 1) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("page", String(page));
    router.push(`/admin/clientes?${p}`);
  }
  return (
    <>
      <Heading
        label="RELACIONES COMERCIALES"
        title="Clientes"
        description="Datos de contacto y actividad de las cuentas de clientes."
      />
      <Feedback message={loadError || error} error />
      <Feedback message={message} />
      <form
        className="admin-search"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <label htmlFor="customer-search" className="sr-only">
          Buscar clientes
        </label>
        <input
          id="customer-search"
          value={q}
          placeholder="Buscar por nombre o correo"
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Limpiar búsqueda de clientes"
            onClick={() => {
              setQ("");
              router.push("/admin/clientes");
              document.getElementById("customer-search")?.focus();
            }}
          >
            <X size={15} />
          </button>
        )}
        <button className="btn btn-outline" type="submit">
          <Search size={15} />
          Buscar
        </button>
      </form>
      {loading ? (
        <Loading />
      ) : data?.users.length ? (
        <section className="admin-panel">
          <p className="muted">
            {data.total} clientes · Página {data.page} de {data.pages}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Clientes registrados</caption>
              <thead>
                <tr>
                  {[
                    "Cliente",
                    "Contacto",
                    "Solicitudes",
                    "Visitas",
                    "Registro",
                    "Acciones",
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>
                      <a href={`mailto:${u.email}`}>{u.email}</a>
                      <br />
                      {u.phone ? (
                        <a href={`tel:${u.phone}`}>{u.phone}</a>
                      ) : (
                        "Sin celular"
                      )}
                    </td>
                    <td>{u._count.inquiries}</td>
                    <td>{u._count.appointments}</td>
                    <td>{date(u.createdAt)}</td>
                    <td>
                      <button
                        className="btn btn-small btn-outline"
                        onClick={() => {
                          reset({ name: u.name, phone: u.phone || "" });
                          setTarget(u);
                          setError("");
                        }}
                      >
                        Editar contacto
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <nav className="pagination" aria-label="Paginación de clientes">
              <button
                className="btn btn-outline btn-small"
                disabled={data.page <= 1}
                onClick={() => search(data.page - 1)}
              >
                Anterior
              </button>
              <button
                className="btn btn-outline btn-small"
                disabled={data.page >= data.pages}
                onClick={() => search(data.page + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </section>
      ) : (
        <Empty
          title="No hay clientes para mostrar"
          description="Las cuentas registradas aparecerán aquí. Ajusta la búsqueda si no encuentras un cliente."
        />
      )}
      <Modal
        open={!!target}
        onClose={() => {
          if (!isSubmitting) setTarget(null);
        }}
        title="Editar contacto del cliente"
      >
        <form
          noValidate
          onSubmit={handleSubmit(async (values) => {
            setError("");
            try {
              await api(`/api/users/${target!.id}`, "PATCH", {
                name: values.name,
                phone: values.phone || null,
              });
              setTarget(null);
              setMessage("Contacto actualizado.");
              reload();
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <p className="muted">{target?.email}</p>
          <div className="field">
            <label htmlFor="customer-name">Nombre completo</label>
            <input
              id="customer-name"
              {...register("name", {
                required: "Ingresa el nombre.",
                maxLength: 100,
              })}
              aria-invalid={!!errors.name}
              aria-describedby="customer-name-error"
            />
            <span id="customer-name-error" className="field-error">
              {errors.name?.message}
            </span>
          </div>
          <div className="field">
            <label htmlFor="customer-phone">Celular</label>
            <input
              id="customer-phone"
              type="tel"
              {...register("phone", { maxLength: 30 })}
            />
          </div>
          <Feedback message={error} error />
          <div className="dialog-actions">
            <button
              autoFocus
              type="button"
              className="btn btn-outline"
              disabled={isSubmitting}
              onClick={() => setTarget(null)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
