-- A missing advertised price must stay NULL, never become a fabricated amount.
-- All other publication requirements remain enforced.
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_public_verified";
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_public_verified" CHECK (
  "status" NOT IN ('DISPONIBLE', 'RESERVADO') OR (
    "verified" = true AND "year" IS NOT NULL AND "mileage" IS NOT NULL
    AND "transmission" IS NOT NULL AND "fuel" IS NOT NULL AND "bodyType" IS NOT NULL
  )
);
