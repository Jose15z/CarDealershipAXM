import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container not-found">
      <div>
        <p className="eyebrow">LA SUBASTA AXM</p>
        <h1>CAMBIEMOS DE RUTA.</h1>
        <p>No encontramos esta página o el vehículo ya no está publicado.</p>
        <Link className="btn" href="/inventario">
          Explorar inventario
        </Link>
      </div>
    </div>
  );
}
