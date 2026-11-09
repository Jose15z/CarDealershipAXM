"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container section">
      <div className="empty-state" role="alert">
        <h1 style={{ fontSize: 46 }}>NO PUDIMOS CARGAR ESTA PÁGINA.</h1>
        <p>
          Inténtalo de nuevo. Si el problema continúa, nuestro equipo puede
          ayudarte desde Instagram.
        </p>
        <div className="actions">
          <button className="btn" onClick={reset}>
            Volver a intentar
          </button>
          <a
            className="btn btn-outline"
            href="https://www.instagram.com/lasubastaaxm/"
            target="_blank"
            rel="noreferrer"
          >
            Visitar Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
