-- DropForeignKey
ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_inventoryItemId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cmvTotal" DOUBLE PRECISION,
ADD COLUMN     "grossMarginPercent" DOUBLE PRECISION,
ADD COLUMN     "grossMarginValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "cmvTotal" DOUBLE PRECISION,
ADD COLUMN     "cmvUnit" DOUBLE PRECISION,
ADD COLUMN     "marginPercent" DOUBLE PRECISION,
ADD COLUMN     "marginValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProductPizzaFlavor" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "RecipeItem" ADD COLUMN     "ingredientProductId" TEXT,
ALTER COLUMN "inventoryItemId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "RecipeItem_productId_idx" ON "RecipeItem"("productId");

-- CreateIndex
CREATE INDEX "RecipeItem_inventoryItemId_idx" ON "RecipeItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "RecipeItem_ingredientProductId_idx" ON "RecipeItem"("ingredientProductId");

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientProductId_fkey" FOREIGN KEY ("ingredientProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
