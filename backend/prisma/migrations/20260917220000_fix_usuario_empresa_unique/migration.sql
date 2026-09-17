-- DropIndex
DROP INDEX "usuario_empresa_rol_usuario_id_empresa_id_rol_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "usuario_empresa_rol_usuario_id_empresa_id_key" ON "usuario_empresa_rol"("usuario_id", "empresa_id");

