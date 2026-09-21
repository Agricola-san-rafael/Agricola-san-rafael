-- CreateTable
CREATE TABLE "intentos_login" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intentos_login_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intentos_login_email_created_at_idx" ON "intentos_login"("email", "created_at");
CREATE INDEX "intentos_login_ip_created_at_idx" ON "intentos_login"("ip", "created_at");
