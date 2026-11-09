import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VehiclePrice } from "../src/components/public/vehicle-price";
import type { VehicleRecord } from "../src/lib/data";
const vehicle = {
  price: null,
  referencePrice: 78800000,
  referencePriceUrl: "https://example.test/comparable",
  referencePriceLabel: "Comparable GLA 200 2018, 49.000 km",
  referencePriceAsOf: "noviembre de 2026",
  referencePriceCheckedAt: new Date("2026-11-07T12:00:00Z"),
} as unknown as VehicleRecord;
describe("precios con procedencia", () => {
  it("muestra referencia, fuente y distinción de cotización en la ficha", () => {
    const html = renderToStaticMarkup(
      createElement(VehiclePrice, { vehicle, detail: true }),
    );
    expect(html).toContain("78.800.000 COP");
    expect(html).toContain("Referencia de mercado");
    expect(html).toContain('href="https://example.test/comparable"');
    expect(html).toContain("no una cotización de LA SUBASTA AXM");
  });
  it("prioriza el precio publicado y oculta la referencia", () => {
    const html = renderToStaticMarkup(
      createElement(VehiclePrice, {
        vehicle: { ...vehicle, price: 90000000 } as unknown as VehicleRecord,
      }),
    );
    expect(html).toContain("90.000.000 COP");
    expect(html).not.toContain("Referencia de mercado");
  });
});
