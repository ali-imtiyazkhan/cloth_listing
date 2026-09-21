-- CreateTable
CREATE TABLE "cloth_items" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "cloth_image_path" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloth_items_pkey" PRIMARY KEY ("id")
);
