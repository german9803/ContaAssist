-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "cuenta_bancaria_id" UUID;

-- CreateTable
CREATE TABLE "cuentas_bancarias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "banco" VARCHAR(100) NOT NULL,
    "numero_cuenta" VARCHAR(30) NOT NULL,
    "tipo_cuenta" VARCHAR(20) NOT NULL,
    "saldo_inicial" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "moneda" CHAR(3) NOT NULL DEFAULT 'COP',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_bancarias_empresa_id_banco_numero_cuenta_key" ON "cuentas_bancarias"("empresa_id", "banco", "numero_cuenta");

-- AddForeignKey
ALTER TABLE "cuentas_bancarias" ADD CONSTRAINT "cuentas_bancarias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cuenta_bancaria_id_fkey" FOREIGN KEY ("cuenta_bancaria_id") REFERENCES "cuentas_bancarias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
