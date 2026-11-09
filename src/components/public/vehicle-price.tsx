import type { VehicleRecord } from "@/lib/data";
import { money } from "./format";
export function VehiclePrice({ vehicle, detail = false }: { vehicle: VehicleRecord; detail?: boolean }) {
 const reference = vehicle.price === null && vehicle.referencePrice !== null;
 return <div className="price-block">
  <p className={detail ? "vehicle-detail-price" : "vehicle-price"}>{money(reference ? vehicle.referencePrice : vehicle.price)}</p>
  {reference && <div className="price-reference">
   <span>Referencia de mercado</span>
   <a href={vehicle.referencePriceUrl!} target="_blank" rel="noreferrer">Ver fuente ↗</a>
   {detail && <><p>{vehicle.referencePriceLabel}. Valor de la fuente: {vehicle.referencePriceAsOf}.</p><p>Consultado el {new Date(vehicle.referencePriceCheckedAt!).toLocaleDateString("es-CO", {timeZone: "America/Bogota"})}. Es una referencia de otro anuncio o guía, no una cotización de LA SUBASTA AXM. Confirma el precio de este vehículo con el equipo.</p></>}
  </div>}
 </div>;
}
