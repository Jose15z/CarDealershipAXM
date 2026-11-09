"use client";
import { useState } from "react";
import {
  api,
  useRemote,
  Heading,
  Loading,
  Empty,
  Feedback,
  date,
  Modal,
} from "./shared";
type RequestItem = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  note?: string;
  type?: string;
  status: string;
  scheduledAt?: string;
  createdAt: string;
  vehicle?: { brand: string; model: string; year: number } | null;
  user?: { name: string; email: string; phone?: string } | null;
};
export function RequestsManager({
  appointments = false,
}: {
  appointments?: boolean;
}) {
  const resource = appointments ? "appointments" : "inquiries";
  const [page, setPage] = useState(1);
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useRemote<Record<string, RequestItem[] | number>>(
    `/api/${resource}?page=${page}`,
  );
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [target, setTarget] = useState<RequestItem | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = (data?.[resource] || []) as RequestItem[];
  const total = Number(data?.total || 0);
  const statuses = appointments
    ? ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"]
    : ["NUEVA", "EN_CONTACTO", "CERRADA"];
  async function save() {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/${resource}/${target.id}`, "PATCH", { status });
      setTarget(null);
      setFeedback(
        appointments
          ? "Estado de la visita actualizado."
          : "Estado de la solicitud actualizado.",
      );
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        label="ATENCIÓN COMERCIAL"
        title={appointments ? "Visitas programadas" : "Solicitudes de clientes"}
        description={
          appointments
            ? "Confirma los encuentros y lleva el seguimiento de cada visita."
            : "Revisa cada oportunidad y registra el estado de la conversación."
        }
      />
      <Feedback message={feedback} />
      <Feedback message={error || loadError} error />
      {loading ? (
        <Loading />
      ) : rows.length ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>{appointments ? "Fecha de visita" : "Recibida"}</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name || item.user?.name}</strong>
                      <br />
                      <span className="muted">
                        {item.email || item.user?.email}
                      </span>
                      {(item.phone || item.user?.phone) && (
                        <>
                          <br />
                          <a
                            className="text-link"
                            href={`tel:${(item.phone || item.user?.phone || "").replace(/[^+\d]/g, "")}`}
                          >
                            {item.phone || item.user?.phone}
                          </a>
                        </>
                      )}
                    </td>
                    <td>
                      {item.vehicle
                        ? `${item.vehicle.brand} ${item.vehicle.model} · ${item.vehicle.year}`
                        : item.type === "VENTA"
                          ? "Venta de vehículo"
                          : "Consulta general"}
                    </td>
                    <td>
                      {date(appointments ? item.scheduledAt! : item.createdAt)}
                    </td>
                    <td>
                      <span className="admin-badge">
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setTarget(item);
                          setStatus(item.status);
                          setError("");
                        }}
                      >
                        Ver y gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <span>
              {total} {appointments ? "visitas" : "solicitudes"} · Página {page}{" "}
              de {Math.max(1, Math.ceil(total / 20))}
            </span>
            <div>
              <button
                className="btn btn-outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                className="btn btn-outline"
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      ) : (
        !loadError && (
          <Empty
            title={appointments ? "Tu agenda está disponible" : "Todo al día"}
            description={
              appointments
                ? "Las visitas solicitadas por los clientes aparecerán aquí."
                : "Cuando alguien solicite información o quiera vender su vehículo, encontrarás la conversación aquí."
            }
          />
        )
      )}
      <Modal
        open={!!target}
        onClose={() => {
          if (!busy) setTarget(null);
        }}
        title={appointments ? "Gestionar visita" : "Gestionar solicitud"}
      >
        <p>
          <strong>{target?.name || target?.user?.name}</strong>
          <br />
          {target?.email || target?.user?.email}
          {target?.vehicle && (
            <>
              <br />
              {target.vehicle.brand} {target.vehicle.model} ·{" "}
              {target.vehicle.year}
            </>
          )}
          {target?.scheduledAt && (
            <>
              <br />
              {date(target.scheduledAt)}
            </>
          )}
        </p>
        {(target?.message || target?.note) && (
          <div className="admin-panel">
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {target?.message || target?.note}
            </p>
          </div>
        )}
        <Feedback message={error} error />
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label htmlFor="request-status">
            Estado
            <select
              id="request-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          {status === "CANCELADA" && (
            <p>
              La visita quedará cancelada. El cliente verá este estado en su
              cuenta.
            </p>
          )}
          <div className="dialog-actions">
            <button
              autoFocus
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setTarget(null)}
            >
              Cancelar
            </button>
            <button className="btn" disabled={busy}>
              {busy ? "Guardando…" : "Guardar estado"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
