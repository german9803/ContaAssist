-- CreateTable
CREATE TABLE "pagos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "tercero_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "forma_pago_id" UUID,
    "observaciones" VARCHAR(1000),
    "estado" VARCHAR(20) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago_documentos" (
    "pago_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "valor_aplicado" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "pago_documentos_pkey" PRIMARY KEY ("pago_id","documento_id")
);

-- CreateIndex
CREATE INDEX "pagos_empresa_id_tipo_fecha_idx" ON "pagos"("empresa_id", "tipo", "fecha" DESC);

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_tercero_id_fkey" FOREIGN KEY ("tercero_id") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_forma_pago_id_fkey" FOREIGN KEY ("forma_pago_id") REFERENCES "formas_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_documentos" ADD CONSTRAINT "pago_documentos_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pagos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_documentos" ADD CONSTRAINT "pago_documentos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
