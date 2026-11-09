"use client";
import Link from "next/link";
import { useState } from "react";
import { RefreshCw, Plus, ArrowUpRight, Instagram } from "lucide-react";
import {
  api,
  useRemote,
  Heading,
  Feedback,
  Loading,
  Empty,
  date,
  Modal,
} from "./shared";
type Post = {
  id: string;
  externalId: string;
  permalink: string;
  caption: string;
  status: string;
  createdAt: string;
  media: { url: string; type: string }[];
  vehicle?: { id: string; brand: string; model: string; status: string } | null;
};
type SyncData = {
  configured: boolean;
  posts: Post[];
  logs: {
    id: string;
    status: string;
    createdAt: string;
    message: string;
    imported: number;
  }[];
  lastSync: string | null;
};
export function InstagramManager() {
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useRemote<SyncData>("/api/instagram");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const [postId, setPostId] = useState("");
  const [permalink, setPermalink] = useState("");
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState("");
  const [filter, setFilter] = useState("all");
  const [linkPost, setLinkPost] = useState<Post | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  async function sync() {
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const result = await api<{ imported: number }>("/api/instagram", "POST", {
        action: "sync",
      });
      setFeedback(
        `Sincronización terminada: ${result.imported} publicaciones nuevas para revisar.`,
      );
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importPost() {
    setError("");
    if (
      !postId.trim() ||
      !/^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/?$/.test(permalink)
    ) {
      setError(
        "Ingresa el identificador y el enlace original https://www.instagram.com/p/... o /reel/....",
      );
      return;
    }
    const list = images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.some((s) => !s.startsWith("https://"))) {
      setError("Todas las fotografías deben tener una URL HTTPS.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/instagram/import", "POST", {
        postId: postId.trim(),
        permalink,
        caption,
        images: list,
      });
      setManual(false);
      setPostId("");
      setPermalink("");
      setCaption("");
      setImages("");
      setFeedback(
        "Publicación importada para revisión. Completa y verifica los datos antes de publicar un vehículo.",
      );
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function link() {
    if (!linkPost) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/instagram/${linkPost.id}`, "PATCH", {
        vehicleId: vehicleId.trim(),
      });
      setLinkPost(null);
      setVehicleId("");
      setFeedback("Vehículo vinculado con la publicación.");
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const posts = (data?.posts || []).filter(
    (p) =>
      filter === "all" ||
      (filter === "pending" && !p.vehicle) ||
      (filter === "sold" &&
        (p.status === "MANUAL_UPDATE_REQUIRED" ||
          p.vehicle?.status === "VENDIDO")) ||
      (filter === "linked" && !!p.vehicle),
  );
  return (
    <>
      <Heading
        label="INSTAGRAM / CONCILIACIÓN"
        title="Tu inventario, conectado"
        description="Revisa cada publicación antes de convertirla en inventario."
      >
        <button
          className="btn"
          disabled={busy || !data?.configured}
          onClick={sync}
        >
          <RefreshCw size={16} className={busy ? "admin-spin" : ""} />
          {busy ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
      </Heading>
      <Feedback message={error || loadError} error />
      <Feedback message={feedback} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <section className="admin-panel">
            <div className="admin-heading" style={{ marginBottom: 0 }}>
              <div>
                <h2>
                  <Instagram
                    size={18}
                    style={{ display: "inline", marginRight: 9 }}
                  />
                  @lasubastaaxm
                </h2>
                <p className="admin-subtle">
                  {data?.configured
                    ? "Conexión oficial configurada."
                    : "Conexión oficial pendiente. Configura la cuenta profesional, el token y los permisos de Meta para sincronizar."}
                  <br />
                  Última sincronización:{" "}
                  {data?.lastSync
                    ? date(data.lastSync)
                    : "Todavía no se ha sincronizado"}
                </p>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setManual(true);
                  setError("");
                }}
              >
                <Plus size={15} />
                Importar manualmente
              </button>
            </div>
          </section>
          <div className="admin-kpis">
            <div className="admin-kpi">
              <small>Vehículos vinculados</small>
              <strong>
                {data?.posts.filter((p) => p.vehicle).length || 0}
              </strong>
            </div>
            <div className="admin-kpi">
              <small>Pendientes de revisión</small>
              <strong>
                {data?.posts.filter((p) => !p.vehicle).length || 0}
              </strong>
            </div>
            <div className="admin-kpi">
              <small>Vendidos por actualizar</small>
              <strong>
                {data?.posts.filter(
                  (p) =>
                    p.status === "MANUAL_UPDATE_REQUIRED" ||
                    p.vehicle?.status === "VENDIDO",
                ).length || 0}
              </strong>
            </div>
          </div>
          <div className="admin-toolbar">
            <label htmlFor="instagram-filter" className="sr-only">
              Filtrar publicaciones
            </label>
            <select
              className="field"
              id="instagram-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todas las publicaciones</option>
              <option value="pending">Pendientes de revisión</option>
              <option value="linked">Vehículos vinculados</option>
              <option value="sold">Vendidos por actualizar</option>
            </select>
            <a
              href="https://www.instagram.com/lasubastaaxm/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Ver perfil oficial <ArrowUpRight size={14} />
            </a>
          </div>
          {posts.length ? (
            <div className="admin-post-grid">
              {posts.map((post) => (
                <article key={post.id} className="admin-post">
                  {post.media?.[0]?.url && (
                    <img
                      src={post.media[0].url}
                      alt="Fotografía de la publicación importada"
                      style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  )}
                  <div>
                    <span className="admin-badge">
                      {post.status === "MANUAL_UPDATE_REQUIRED"
                        ? "ACTUALIZACIÓN MANUAL PENDIENTE"
                        : post.vehicle
                          ? "VEHÍCULO VINCULADO"
                          : "PENDIENTE DE REVISIÓN"}
                    </span>
                    <p>{post.caption || "Publicación sin descripción."}</p>
                    <span className="admin-subtle">
                      Referencia interna: {post.id}
                    </span>
                  </div>
                  {post.vehicle ? (
                    <>
                      <Link
                        className="text-link"
                        href={`/admin/inventario/${post.vehicle.id}`}
                      >
                        {post.vehicle.brand} {post.vehicle.model} ·{" "}
                        {post.vehicle.status}
                      </Link>
                      {(post.status === "MANUAL_UPDATE_REQUIRED" ||
                        post.vehicle.status === "VENDIDO") && (
                        <div className="notice">
                          Actualiza manualmente la disponibilidad en Instagram
                          usando el enlace original. La web ya tiene registrado
                          el vehículo como vendido.
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <Link
                        className="btn btn-outline"
                        href={`/admin/inventario/nuevo?post=${encodeURIComponent(post.id)}`}
                      >
                        Revisar y crear vehículo
                      </Link>
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setLinkPost(post);
                          setError("");
                        }}
                      >
                        Vincular existente
                      </button>
                    </div>
                  )}
                  <a
                    className="text-link"
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver publicación original <ArrowUpRight size={14} />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="Sin publicaciones en esta vista"
              description="Sincroniza una cuenta autorizada o importa el enlace, la descripción y las fotografías que te proporcione el administrador."
            />
          )}
          <section className="admin-panel" style={{ marginTop: 24 }}>
            <h2>Historial de sincronización</h2>
            {data?.logs.length ? (
              data.logs.map((log) => (
                <div className="admin-log" key={log.id}>
                  <span className="admin-badge">
                    {log.status === "SUCCESS" ? "COMPLETADA" : "ERROR"}
                  </span>
                  <span className="muted"> · {date(log.createdAt)}</span>
                  <p>{log.message}</p>
                  <span className="muted">
                    {log.imported} publicaciones importadas
                  </span>
                </div>
              ))
            ) : (
              <p className="admin-subtle">
                Todavía no hay operaciones registradas.
              </p>
            )}
          </section>
          <p className="admin-subtle">
            La disponibilidad de la web es la fuente principal de verdad. No se
            modifican publicaciones en Instagram automáticamente; las acciones
            no soportadas se gestionan con una tarea manual.
          </p>
        </>
      )}
      <Modal
        open={manual}
        onClose={() => {
          if (!busy) setManual(false);
        }}
        title="Importar publicación autorizada"
      >
        <p>
          Registra el contenido original. La información quedará pendiente de
          revisión y no aparecerá automáticamente en el catálogo.
        </p>
        <Feedback message={error} error />
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void importPost();
          }}
        >
          <label htmlFor="import-id">
            Identificador original de la publicación
            <input
              id="import-id"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
            />
          </label>
          <label htmlFor="import-link">
            Enlace original
            <input
              id="import-link"
              type="url"
              value={permalink}
              onChange={(e) => setPermalink(e.target.value)}
              placeholder="https://www.instagram.com/p/.../"
            />
          </label>
          <label htmlFor="import-caption">
            Descripción original
            <textarea
              className="resize-none"
              id="import-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
          <label htmlFor="import-images">
            Fotografías autorizadas · Una URL HTTPS por línea
            <textarea
              className="resize-none"
              id="import-images"
              value={images}
              onChange={(e) => setImages(e.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <button
              autoFocus
              className="btn btn-outline"
              type="button"
              disabled={busy}
              onClick={() => setManual(false)}
            >
              Cancelar
            </button>
            <button className="btn" disabled={busy}>
              {busy ? "Importando…" : "Importar publicación"}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!linkPost}
        onClose={() => {
          if (!busy) setLinkPost(null);
        }}
        title="Vincular vehículo existente"
      >
        <p>
          Copia el identificador del vehículo desde su URL de edición en el
          inventario.
        </p>
        <Feedback message={error} error />
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void link();
          }}
        >
          <label htmlFor="link-vehicle">
            Identificador interno del vehículo
            <input
              id="link-vehicle"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            />
          </label>
          <div className="dialog-actions">
            <button
              autoFocus
              className="btn btn-outline"
              type="button"
              disabled={busy}
              onClick={() => setLinkPost(null)}
            >
              Cancelar
            </button>
            <button className="btn" disabled={busy || !vehicleId.trim()}>
              {busy ? "Vinculando…" : "Vincular vehículo"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
