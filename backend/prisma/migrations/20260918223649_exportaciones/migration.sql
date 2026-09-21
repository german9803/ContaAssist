-- CreateTable
CREATE TABLE "exportaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "sistema_destino_id" INTEGER NOT NULL,
    "tipo_informacion" VARCHAR(30) NOT NULL,
    "periodo_inicio" DATE NOT NULL,
    "periodo_fin" DATE NOT NULL,
    "version_formato" VARCHAR(20) NOT NULL,
    "cantidad_documentos" INTEGER NOT NULL,
    "ruta_archivo_generado" VARCHAR(400),
    "estado" VARCHAR(30) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exportaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exportacion_documentos" (
    "exportacion_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,

    CONSTRAINT "exportacion_documentos_pkey" PRIMARY KEY ("exportacion_id","documento_id")
);

-- CreateIndex
CREATE INDEX "exportaciones_empresa_id_creado_en_idx" ON "exportaciones"("empresa_id", "creado_en" DESC);

-- AddForeignKey
ALTER TABLE "exportaciones" ADD CONSTRAINT "exportaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportaciones" ADD CONSTRAINT "exportaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportaciones" ADD CONSTRAINT "exportaciones_sistema_destino_id_fkey" FOREIGN KEY ("sistema_destino_id") REFERENCES "sistemas_destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportacion_documentos" ADD CONSTRAINT "exportacion_documentos_exportacion_id_fkey" FOREIGN KEY ("exportacion_id") REFERENCES "exportaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportacion_documentos" ADD CONSTRAINT "exportacion_documentos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
