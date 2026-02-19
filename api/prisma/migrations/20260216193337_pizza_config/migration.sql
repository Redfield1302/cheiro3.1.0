-- CreateEnum
CREATE TYPE "PizzaPricingRule" AS ENUM ('MAIOR_SABOR', 'PROPORCIONAL');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isPizza" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pizzaPricingRule" "PizzaPricingRule" NOT NULL DEFAULT 'MAIOR_SABOR';

-- CreateTable
CREATE TABLE "ProductPizzaSize" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxFlavors" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPizzaSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPizzaFlavor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPizzaFlavor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPizzaFlavorPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "flavorId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductPizzaFlavorPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPizzaSize_tenantId_productId_active_sort_idx" ON "ProductPizzaSize"("tenantId", "productId", "active", "sort");

-- CreateIndex
CREATE INDEX "ProductPizzaFlavor_tenantId_productId_active_sort_idx" ON "ProductPizzaFlavor"("tenantId", "productId", "active", "sort");

-- CreateIndex
CREATE INDEX "ProductPizzaFlavorPrice_tenantId_flavorId_sizeId_idx" ON "ProductPizzaFlavorPrice"("tenantId", "flavorId", "sizeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPizzaFlavorPrice_flavorId_sizeId_key" ON "ProductPizzaFlavorPrice"("flavorId", "sizeId");

-- AddForeignKey
ALTER TABLE "ProductPizzaSize" ADD CONSTRAINT "ProductPizzaSize_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPizzaSize" ADD CONSTRAINT "ProductPizzaSize_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPizzaFlavor" ADD CONSTRAINT "ProductPizzaFlavor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPizzaFlavor" ADD CONSTRAINT "ProductPizzaFlavor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPizzaFlavorPrice" ADD CONSTRAINT "ProductPizzaFlavorPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPizzaFlavorPrice" ADD CONSTRAINT "ProductPizzaFlavorPrice_flavorId_fkey" FOREIGN KEY ("flavorId") REFERENCES "ProductPizzaFlavor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPizzaFlavorPrice" ADD CONSTRAINT "ProductPizzaFlavorPrice_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "ProductPizzaSize"("id") ON DELETE CASCADE ON UPDATE CASCADE;
