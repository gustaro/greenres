-- Product option groups and selectable choices
CREATE TABLE "product_option_groups" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "selectionType" TEXT NOT NULL DEFAULT 'SINGLE',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "minSelections" INTEGER NOT NULL DEFAULT 1,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_option_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_options" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "priceAdjustment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ingredientQuantity" DECIMAL(12,3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_items" ADD COLUMN "selectedOptions" JSONB;

CREATE INDEX "product_option_groups_productId_sortOrder_idx" ON "product_option_groups"("productId", "sortOrder");
CREATE INDEX "product_options_groupId_sortOrder_idx" ON "product_options"("groupId", "sortOrder");
CREATE INDEX "product_options_ingredientId_idx" ON "product_options"("ingredientId");

ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "product_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
