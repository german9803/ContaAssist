-- CreateTable
CREATE TABLE "reglas_validacion" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(300) NOT NULL,
    "severidad" VARCHAR(20) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reglas_validacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_validaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documento_id" UUID NOT NULL,
    "regla_id" INTEGER NOT NULL,
    "resultado" VARCHAR(20) NOT NULL,
    "mensaje" VARCHAR(500),
    "evaluado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_validaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reglas_validacion_codigo_key" ON "reglas_validacion"("codigo");

-- CreateIndex
CREATE INDEX "documento_validaciones_documento_id_evaluado_en_idx" ON "documento_validaciones"("documento_id", "evaluado_en" DESC);

-- AddForeignKey
ALTER TABLE "documento_validaciones" ADD CONSTRAINT "documento_validaciones_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_validaciones" ADD CONSTRAINT "documento_validaciones_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "reglas_validacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

