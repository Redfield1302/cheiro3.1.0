-- AlterTable
ALTER TABLE "DeliveryPerson" ADD COLUMN "tenantId" TEXT;

-- Backfill para ambientes que ja possuem entregadores sem tenant.
UPDATE "DeliveryPerson" dp
SET "tenantId" = t."id"
FROM "Tenant" t
WHERE dp."tenantId" IS NULL
  AND t."id" = (
    SELECT "id" FROM "Tenant" ORDER BY "createdAt" ASC LIMIT 1
  );

-- Se ainda houver nulos e nao existir tenant, esta migracao deve falhar com mensagem clara.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "DeliveryPerson" WHERE "tenantId" IS NULL) THEN
    RAISE EXCEPTION 'Nao foi possivel preencher DeliveryPerson.tenantId. Crie ao menos um Tenant antes da migracao.';
  END IF;
END $$;

-- AlterColumn
ALTER TABLE "DeliveryPerson" ALTER COLUMN "tenantId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "DeliveryPerson_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPerson_tenantId_email_key" ON "DeliveryPerson"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "DeliveryPerson" ADD CONSTRAINT "DeliveryPerson_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
