"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  api,
  AdminVehicle,
  useRemote,
  Heading,
  Feedback,
  Loading,
  Empty,
  money,
  Modal,
} from "./shared";
type Inventory = {
  configured: boolean;
  vehicles: AdminVehicle[];
  total: number;
  pages: number;
  page: number;
};
export function InventoryManager() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [target, setTarget] = useState<AdminVehicle | null>(null);
  const [action, setAction] = useState<"sell" | "archive">("sell");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") || "");
    setQuery(p.get("q") || "");
    setStatus(p.get("status") || "");
    setPage(Math.max(1, Number(p.get("page")) || 1));
    if (p.get("guardado"))
      setResult("Vehículo guardado. Los cambios ya están disponibles.");
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (status) p.set("status", status);
    if (page > 1) p.set("page", String(page));
    window.history.replaceState(
      null,
      "",
      `/admin/inventario${p.size ? "?" + p.toString() : ""}`,
    );
  }, [ready, query, status, page]);
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useRemote<Inventory>(
    `/api/vehicles?admin=true&page=${page}&q=${encodeURIComponent(query)}&status=${status}`,
  );
  useEffect(() => {
    if (data && page > Math.max(1, data.pages))
      setPage(Math.max(1, data.pages));
  }, [data, page]);
  async function commit() {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      if (action === "sell") {
        if (!Number(amount) || Number(amount) < 0)
          throw new Error(
            "Ingresa el valor final de venta en pesos colombianos.",
          );
        await api(`/api/vehicles/${target.id}/sell`, "POST", {
          revision: target.revision,
          amount: Number(amount),
          idempotencyKey: crypto.randomUUID(),
        });
        setResult(
          "Venta confirmada. El vehículo ya no aparece en el inventario disponible.",
        );
      } else {
        await api(`/api/vehicles/${target.id}`, "DELETE", {
          revision: target.revision,
        });
        setResult("Vehículo archivado. Su historial comercial se conserva.");
      }
      setTarget(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function feature(vehicle: AdminVehicle) {
    setError("");
    setBusy(true);
    try {
      await api(`/api/vehicles/${vehicle.id}`, "PATCH", {
        brand: vehicle.brand,
        model: vehicle.model,
        version: vehicle.version,
        year: vehicle.year,
        price: vehicle.price === null ? null : Number(vehicle.price),
        mileage: vehicle.mileage,
        transmission: vehicle.transmission,
        fuel: vehicle.fuel,
        bodyType: vehicle.bodyType,
        displacement: vehicle.displacement,
        color: vehicle.color,
        partialPlate: vehicle.partialPlate,
        city: vehicle.city,
        description: vehicle.description,
        status: vehicle.status,
        featured: !vehicle.featured,
        verified: vehicle.verified,
        images: vehicle.images.map(({ url, alt, position }) => ({
          url,
          alt,
          position,
        })),
        features: vehicle.features.map(({ category, name }) => ({
          category,
          name,
        })),
        revision: vehicle.revision,
      });
      setResult(
        vehicle.featured
          ? "Vehículo retirado de destacados."
          : "Vehículo destacado.",
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
        label="GESTIÓN DE INVENTARIO"
        title="Cada vehículo, bajo control"
        description="Administra disponibilidad, precios y publicaciones."
      >
        <Link className="btn" href="/admin/inventario/nuevo">
          <Plus size={16} />
          Agregar vehículo
        </Link>
      </Heading>
      <Feedback message={result} />
      <Feedback message={error || loadError} error />
      <div className="admin-toolbar">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q);
            setPage(1);
          }}
        >
          <label className="sr-only" htmlFor="inventory-search">
            Buscar vehículos
          </label>
          <input
            id="inventory-search"
            placeholder="Marca, modelo o referencia"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              className="btn btn-outline"
              aria-label="Limpiar búsqueda"
              onClick={() => {
                setQ("");
                setQuery("");
                setPage(1);
              }}
            >
              <X size={16} />
            </button>
          )}
          <button className="btn btn-outline" type="submit">
            <Search size={16} />
            Buscar
          </button>
        </form>
        <label className="sr-only" htmlFor="admin-status">
          Disponibilidad
        </label>
        <select
          id="admin-status"
          className="field"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          {["DRAFT", "DISPONIBLE", "RESERVADO", "VENDIDO", "ARCHIVADO"].map(
            (s) => (
              <option key={s} value={s}>
                {s === "DRAFT"
                  ? "Borrador"
                  : s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ),
          )}
        </select>
      </div>
      {loading ? (
        <Loading />
      ) : data?.vehicles.length ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Destacado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.vehicles.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className="vehicle-cell">
                        {v.images[0] && (
                          <img
                            src={v.images[0].url}
                            alt={v.images[0].alt || `${v.brand} ${v.model}`}
                          />
                        )}
                        <div>
                          <strong>
                            {v.brand} {v.model}
                          </strong>
                          <span className="muted">
                            {v.year} · {v.version || v.bodyType}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{money(v.price)}</td>
                    <td>
                      <span className={`admin-badge ${v.status}`}>
                        {v.status === "DRAFT" ? "BORRADOR" : v.status}
                      </span>
                    </td>
                    <td>
                      <button
                        disabled={
                          busy ||
                          v.status === "VENDIDO" ||
                          v.status === "ARCHIVADO"
                        }
                        onClick={() => feature(v)}
                      >
                        {v.featured ? "Quitar destacado" : "Destacar"}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/admin/inventario/${v.id}`}>Editar</Link>
                        {["DISPONIBLE", "RESERVADO"].includes(v.status) && (
                          <button
                            disabled={busy}
                            onClick={() => {
                              setTarget(v);
                              setAction("sell");
                              setAmount(String(v.price));
                              setError("");
                            }}
                          >
                            Confirmar venta
                          </button>
                        )}
                        {v.status !== "ARCHIVADO" && v.status !== "VENDIDO" && (
                          <button
                            className="danger"
                            onClick={() => {
                              setTarget(v);
                              setAction("archive");
                              setError("");
                            }}
                          >
                            Archivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <span>
              {data.total} vehículos · Página {data.page} de{" "}
              {Math.max(1, data.pages)}
            </span>
            <div>
              <button
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                className="btn btn-outline"
                disabled={page >= data.pages}
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
            title={
              query || status
                ? "No encontramos vehículos"
                : "El inventario está listo para comenzar"
            }
            description={
              query || status
                ? "Prueba otra búsqueda o cambia los filtros."
                : "Crea el primer registro con fotografías autorizadas y datos verificados. Los borradores solo son visibles para tu equipo."
            }
          >
            <Link className="btn btn-outline" href="/admin/inventario/nuevo">
              Agregar vehículo
            </Link>
          </Empty>
        )
      )}
      <Modal
        open={!!target}
        onClose={() => {
          if (!busy) setTarget(null);
        }}
        title={action === "sell" ? "Confirmar venta" : "Archivar vehículo"}
      >
        <p>
          <strong>
            {target?.brand} {target?.model} · {target?.year}
          </strong>
          <br />
          {action === "sell"
            ? "Se registrará la venta y el vehículo dejará de estar disponible. Esta acción conserva el historial comercial."
            : "El vehículo dejará de mostrarse al público. Podrás consultar su historial desde este panel."}
        </p>
        <Feedback message={error} error />
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void commit();
          }}
        >
          {action === "sell" && (
            <label htmlFor="sale-amount">
              Valor final de venta (COP)
              <input
                id="sale-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
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
            <button type="submit" className="btn" disabled={busy}>
              {busy
                ? "Guardando…"
                : action === "sell"
                  ? "Confirmar venta"
                  : "Archivar vehículo"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
