-- CreateTable
CREATE TABLE "tryon_jobs" (
    "id" TEXT NOT NULL,
    "job_id" VARCHAR(255) NOT NULL,
    "cloth_image_path" VARCHAR(500) NOT NULL,
    "dummy_image_path" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "result_url" VARCHAR(500),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "tryon_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tryon_jobs_job_id_key" ON "tryon_jobs"("job_id");
