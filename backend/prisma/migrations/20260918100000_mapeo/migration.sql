-- AlterTable
ALTER TABLE "documentos" ADD COLUMN     "centro_costo_id" UUID,
ADD COLUMN     "cuenta_contable_id" UUID,
ADD COLUMN     "forma_pago_id" UUID;

-- CreateTable
CREATE TABLE "cuentas_contables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "naturaleza" VARCHAR(10) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cuentas_contables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "centros_costo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "centros_costo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formas_pago" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,

    CONSTRAINT "formas_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sistemas_destino" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "version_formato_actual" VARCHAR(20),

    CONSTRAINT "sistemas_destino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapeo_cuentas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "sistema_destino_id" INTEGER NOT NULL,
    "cuenta_contable_id" UUID NOT NULL,
    "codigo_destino" VARCHAR(50) NOT NULL,

    CONSTRAINT "mapeo_cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapeo_terceros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "sistema_destino_id" INTEGER NOT NULL,
    "tercero_id" UUID NOT NULL,
    "codigo_destino" VARCHAR(50) NOT NULL,

    CONSTRAINT "mapeo_terceros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapeo_formas_pago" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "sistema_destino_id" INTEGER NOT NULL,
    "forma_pago_id" UUID NOT NULL,
    "codigo_destino" VARCHAR(50) NOT NULL,

    CONSTRAINT "mapeo_formas_pago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_contables_empresa_id_codigo_key" ON "cuentas_contables"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "centros_costo_empresa_id_codigo_key" ON "centros_costo"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "formas_pago_empresa_id_codigo_key" ON "formas_pago"("empresa_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "sistemas_destino_codigo_key" ON "sistemas_destino"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "mapeo_cuentas_empresa_id_sistema_destino_id_cuenta_contable_key" ON "mapeo_cuentas"("empresa_id", "sistema_destino_id", "cuenta_contable_id");

-- CreateIndex
CREATE UNIQUE INDEX "mapeo_terceros_empresa_id_sistema_destino_id_tercero_id_key" ON "mapeo_terceros"("empresa_id", "sistema_destino_id", "tercero_id");

-- CreateIndex
CREATE UNIQUE INDEX "mapeo_formas_pago_empresa_id_sistema_destino_id_forma_pago__key" ON "mapeo_formas_pago"("empresa_id", "sistema_destino_id", "forma_pago_id");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cuenta_contable_id_fkey" FOREIGN KEY ("cuenta_contable_id") REFERENCES "cuentas_contables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_centro_costo_id_fkey" FOREIGN KEY ("centro_costo_id") REFERENCES "centros_costo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_forma_pago_id_fkey" FOREIGN KEY ("forma_pago_id") REFERENCES "formas_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_contables" ADD CONSTRAINT "cuentas_contables_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "centros_costo" ADD CONSTRAINT "centros_costo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formas_pago" ADD CONSTRAINT "formas_pago_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_cuentas" ADD CONSTRAINT "mapeo_cuentas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_cuentas" ADD CONSTRAINT "mapeo_cuentas_sistema_destino_id_fkey" FOREIGN KEY ("sistema_destino_id") REFERENCES "sistemas_destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_cuentas" ADD CONSTRAINT "mapeo_cuentas_cuenta_contable_id_fkey" FOREIGN KEY ("cuenta_contable_id") REFERENCES "cuentas_contables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_terceros" ADD CONSTRAINT "mapeo_terceros_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_terceros" ADD CONSTRAINT "mapeo_terceros_sistema_destino_id_fkey" FOREIGN KEY ("sistema_destino_id") REFERENCES "sistemas_destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_terceros" ADD CONSTRAINT "mapeo_terceros_tercero_id_fkey" FOREIGN KEY ("tercero_id") REFERENCES "terceros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_formas_pago" ADD CONSTRAINT "mapeo_formas_pago_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_formas_pago" ADD CONSTRAINT "mapeo_formas_pago_sistema_destino_id_fkey" FOREIGN KEY ("sistema_destino_id") REFERENCES "sistemas_destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapeo_formas_pago" ADD CONSTRAINT "mapeo_formas_pago_forma_pago_id_fkey" FOREIGN KEY ("forma_pago_id") REFERENCES "formas_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

