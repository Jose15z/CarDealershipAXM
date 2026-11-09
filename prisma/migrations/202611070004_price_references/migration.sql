ALTER TABLE "Vehicle"
 ADD COLUMN "referencePrice" DECIMAL(15,0),
 ADD COLUMN "referencePriceUrl" TEXT,
 ADD COLUMN "referencePriceLabel" TEXT,
 ADD COLUMN "referencePriceAsOf" TEXT,
 ADD COLUMN "referencePriceCheckedAt" TIMESTAMP(3),
 ADD COLUMN "catalogPrice" DECIMAL(15,0);
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_reference_price_provenance" CHECK (
 "referencePrice" IS NULL OR ("referencePrice" > 0 AND
 "referencePriceUrl" IS NOT NULL AND "referencePriceUrl" LIKE 'https://%' AND
 "referencePriceLabel" IS NOT NULL AND length("referencePriceLabel") > 0 AND
 "referencePriceAsOf" IS NOT NULL AND "referencePriceCheckedAt" IS NOT NULL));
CREATE FUNCTION vehicle_catalog_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW."catalogPrice" := COALESCE(NEW.price, NEW."referencePrice");
 RETURN NEW;
END;
$$;
CREATE TRIGGER vehicle_catalog_price BEFORE INSERT OR UPDATE ON "Vehicle"
 FOR EACH ROW EXECUTE FUNCTION vehicle_catalog_price();
UPDATE "Vehicle" SET "catalogPrice" = price;
CREATE INDEX "Vehicle_catalogPrice_idx" ON "Vehicle"("catalogPrice");
