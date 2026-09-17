-- CreateTable
CREATE TABLE "terceros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "tipo_identificacion" VARCHAR(10) NOT NULL,
    "identificacion" VARCHAR(20) NOT NULL,
    "dv" CHAR(1),
    "razon_social" VARCHAR(200) NOT NULL,
    "tipo_tercero" VARCHAR(20) NOT NULL,
    "email" VARCHAR(150),
    "telefono" VARCHAR(30),
    "ciudad" VARCHAR(80),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "terceros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "archivo_origen_id" UUID,
    "tipo_documento" VARCHAR(30) NOT NULL,
    "numero_documento" VARCHAR(50),
    "prefijo" VARCHAR(10),
    "fecha_emision" DATE,
    "fecha_vencimiento" DATE,
    "tercero_id" UUID,
    "subtotal" DECIMAL(18,2),
    "total_impuestos" DECIMAL(18,2),
    "total_retenciones" DECIMAL(18,2),
    "total" DECIMAL(18,2),
    "moneda" CHAR(3) NOT NULL DEFAULT 'COP',
    "estado" VARCHAR(30) NOT NULL,
    "texto_extraido" TEXT,
    "observaciones" VARCHAR(1000),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impuestos" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "porcentaje" DECIMAL(6,3) NOT NULL,

    CONSTRAINT "impuestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_impuestos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documento_id" UUID NOT NULL,
    "impuesto_id" INTEGER NOT NULL,
    "base" DECIMAL(18,2) NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "documento_impuestos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "terceros_empresa_id_tipo_tercero_idx" ON "terceros"("empresa_id", "tipo_tercero");

-- CreateIndex
CREATE UNIQUE INDEX "terceros_empresa_id_tipo_identificacion_identificacion_key" ON "terceros"("empresa_id", "tipo_identificacion", "identificacion");

-- CreateIndex
CREATE INDEX "documentos_empresa_id_estado_idx" ON "documentos"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "documentos_empresa_id_tercero_id_idx" ON "documentos"("empresa_id", "tercero_id");

-- CreateIndex
CREATE UNIQUE INDEX "impuestos_codigo_key" ON "impuestos"("codigo");

-- CreateIndex
CREATE INDEX "documento_impuestos_documento_id_idx" ON "documento_impuestos"("documento_id");

-- AddForeignKey
ALTER TABLE "terceros" ADD CONSTRAINT "terceros_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_archivo_origen_id_fkey" FOREIGN KEY ("archivo_origen_id") REFERENCES "archivos_origen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tercero_id_fkey" FOREIGN KEY ("tercero_id") REFERENCES "terceros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_impuestos" ADD CONSTRAINT "documento_impuestos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_impuestos" ADD CONSTRAINT "documento_impuestos_impuesto_id_fkey" FOREIGN KEY ("impuesto_id") REFERENCES "impuestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

