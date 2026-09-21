-- CreateTable
CREATE TABLE "productos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "codigo" VARCHAR(30),
    "nombre" VARCHAR(200) NOT NULL,
    "unidad_medida" VARCHAR(20),
    "cuenta_contable_id" UUID,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodegas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bodegas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_detalles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documento_id" UUID NOT NULL,
    "producto_id" UUID,
    "bodega_id" UUID,
    "descripcion" VARCHAR(300) NOT NULL,
    "cantidad" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "valor_unitario" DECIMAL(18,4) NOT NULL,
    "subtotal_linea" DECIMAL(18,2) NOT NULL,
    "porcentaje_iva" DECIMAL(6,3),
    "descuento" DECIMAL(18,2),
    "cuenta_contable_id" UUID,
    "centro_costo_id" UUID,

    CONSTRAINT "documento_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapeo_productos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "sistema_destino_id" INTEGER NOT NULL,
    "producto_id" UUID NOT NULL,
    "codigo_destino" VARCHAR(50) NOT NULL,

    CONSTRAINT "mapeo_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapeo_bodegas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "sistema_destino_id" INTEGER NOT NULL,
    "bodega_id" UUID NOT NULL,
    "codigo_destino" VARCHAR(50) NOT NULL,

    CONSTRAINT "mapeo_bodegas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_empresa_id_codigo_key" ON "productos"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "bodegas_empresa_id_codigo_key" ON "bodegas"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "documento_detalles_documento_id_idx" ON "documento_detalles"("documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "mapeo_productos_empresa_id_sistema_destino_id_producto_id_key" ON "mapeo_productos"("empresa_id", "sistema_destino_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "mapeo_bodegas_empresa_id_sistema_destino_id_bodega_id_key" ON "mapeo_bodegas"("empresa_id", "sistema_destino_id", "bodega_id");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_cuenta_contable_id_fkey" FOREIGN KEY ("cuenta_contable_id") REFERENCES "cuentas_contables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bodegas" ADD CONSTRAINT "bodegas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_detalles" ADD CONSTRAINT "documento_detalles_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_detalles" ADD CONSTRAINT "documento_detalles_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_detalles" ADD CONSTRAINT "documento_detalles_bodega_id_fkey" FOREIGN KEY ("bodega_id") REFERENCES "bodegas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_detalles" ADD CONSTRAINT "documento_detalles_cuenta_contable_id_fkey" FOREIGN KEY ("cuenta_contable_id") REFERENCES "cuentas_contables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento_detalles" ADD CONSTRAINT "documento_detalles_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "centros_costo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_productos" ADD CONSTRAINT "mapeo_productos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_productos" ADD CONSTRAINT "mapeo_productos_sistema_destino_id_fkey" FOREIGN KEY ("sistema_destino_id") REFERENCES "sistemas_destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_productos" ADD CONSTRAINT "mapeo_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_bodegas" ADD CONSTRAINT "mapeo_bodegas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_bodegas" ADD CONSTRAINT "mapeo_bodegas_sistema_destino_id_fkey" FOREIGN KEY ("sistema_destino_id") REFERENCES "sistemas_destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_bodegas" ADD CONSTRAINT "mapeo_bodegas_bodega_id_fkey" FOREIGN KEY ("bodega_id") REFERENCES "bodegas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
