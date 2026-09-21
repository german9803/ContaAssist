-- CreateTable
CREATE TABLE "extractos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "cuenta_bancaria_id" UUID NOT NULL,
    "periodo_inicio" DATE NOT NULL,
    "periodo_fin" DATE NOT NULL,
    "cantidad_lineas" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extractos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracto_lineas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "extracto_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" VARCHAR(300) NOT NULL,
    "debito" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credito" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pago_id" UUID,

    CONSTRAINT "extracto_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extractos_empresa_id_cuenta_bancaria_id_creado_en_idx" ON "extractos"("empresa_id", "cuenta_bancaria_id", "creado_en" DESC);

-- CreateIndex
CREATE INDEX "extracto_lineas_extracto_id_idx" ON "extracto_lineas"("extracto_id");

-- AddForeignKey
ALTER TABLE "extractos" ADD CONSTRAINT "extractos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extractos" ADD CONSTRAINT "extractos_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "cuentas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracto_lineas" ADD CONSTRAINT "extracto_lineas_extracto_id_fkey" FOREIGN KEY ("extracto_id") REFERENCES "extractos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracto_lineas" ADD CONSTRAINT "extracto_lineas_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pagos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
