-- CreateTable
CREATE TABLE "cargas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo_origen" VARCHAR(20) NOT NULL,
    "cantidad_archivos" INTEGER NOT NULL,
    "estado" VARCHAR(30) NOT NULL,
    "iniciado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_en" TIMESTAMPTZ(6),

    CONSTRAINT "cargas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_origen" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "carga_id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nombre_original" VARCHAR(260) NOT NULL,
    "extension" VARCHAR(10) NOT NULL,
    "tamano_bytes" BIGINT NOT NULL,
    "hash_sha256" CHAR(64) NOT NULL,
    "ruta_almacenamiento" VARCHAR(400) NOT NULL,
    "estado" VARCHAR(30) NOT NULL,
    "mensaje_error" VARCHAR(1000),

    CONSTRAINT "archivos_origen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "accion" VARCHAR(60) NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "entidad_id" UUID,
    "campo" VARCHAR(60),
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cargas_empresa_id_iniciado_en_idx" ON "cargas"("empresa_id", "iniciado_en" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "archivos_origen_empresa_id_hash_sha256_key" ON "archivos_origen"("empresa_id", "hash_sha256");

-- CreateIndex
CREATE INDEX "auditoria_empresa_id_creado_en_idx" ON "auditoria"("empresa_id", "creado_en" DESC);

-- CreateIndex
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- AddForeignKey
ALTER TABLE "cargas" ADD CONSTRAINT "cargas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargas" ADD CONSTRAINT "cargas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_origen" ADD CONSTRAINT "archivos_origen_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "cargas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_origen" ADD CONSTRAINT "archivos_origen_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

