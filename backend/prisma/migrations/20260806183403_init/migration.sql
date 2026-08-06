-- CreateTable
CREATE TABLE "papel" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "papel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "celularPessoal" VARCHAR(20) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "imagem" VARCHAR(500),
    "dataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletado" BOOLEAN NOT NULL DEFAULT false,
    "authUserId" TEXT,
    "idPapel" INTEGER NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endereco" (
    "id" SERIAL NOT NULL,
    "cep" VARCHAR(9) NOT NULL,
    "logradouro" VARCHAR(300) NOT NULL,
    "numero" VARCHAR(10) NOT NULL,
    "complemento" VARCHAR(200),
    "cidade" VARCHAR(200) NOT NULL,
    "estado" VARCHAR(2) NOT NULL,

    CONSTRAINT "endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estabelecimento" (
    "id" SERIAL NOT NULL,
    "razaoSocial" VARCHAR(300) NOT NULL,
    "nomeFantasia" VARCHAR(200),
    "cnpj" VARCHAR(18) NOT NULL,
    "emailInstitucional" VARCHAR(200) NOT NULL,
    "celularInstitucional" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(2000) NOT NULL,
    "deletado" BOOLEAN NOT NULL DEFAULT false,
    "idUsuario" INTEGER NOT NULL,
    "idEndereco" INTEGER NOT NULL,

    CONSTRAINT "estabelecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entidade_beneficiaria" (
    "id" SERIAL NOT NULL,
    "razaoSocial" VARCHAR(300) NOT NULL,
    "nomeFantasia" VARCHAR(200),
    "cnpj" VARCHAR(18) NOT NULL,
    "emailInstitucional" VARCHAR(200) NOT NULL,
    "celularInstitucional" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(2000) NOT NULL,
    "deletado" BOOLEAN NOT NULL DEFAULT false,
    "idUsuario" INTEGER NOT NULL,
    "idEndereco" INTEGER NOT NULL,

    CONSTRAINT "entidade_beneficiaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_alimento" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "status_alimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_pedido" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,

    CONSTRAINT "status_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alimento" (
    "id" SERIAL NOT NULL,
    "imagem" VARCHAR(500),
    "nome" VARCHAR(200) NOT NULL,
    "qtdUnidade" VARCHAR(50) NOT NULL,
    "descricao" VARCHAR(2000) NOT NULL,
    "estado" VARCHAR(50),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPublicacao" TIMESTAMP(3) NOT NULL,
    "deletado" BOOLEAN NOT NULL DEFAULT false,
    "idCategoria" INTEGER NOT NULL,
    "idEstabelecimento" INTEGER NOT NULL,
    "idStatus" INTEGER NOT NULL,

    CONSTRAINT "alimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivo_cancelamento" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "idAdministrador" INTEGER NOT NULL,

    CONSTRAINT "motivo_cancelamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "id" SERIAL NOT NULL,
    "dataPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantidade" INTEGER NOT NULL,
    "deletado" BOOLEAN NOT NULL DEFAULT false,
    "idAlimento" INTEGER NOT NULL,
    "idStatus" INTEGER NOT NULL,
    "idEstabelecimento" INTEGER NOT NULL,
    "idEntidadeBeneficiaria" INTEGER NOT NULL,
    "idMotivoCancelamento" INTEGER,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "papel_nome_key" ON "papel"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_celularPessoal_key" ON "usuario"("celularPessoal");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_authUserId_key" ON "usuario"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimento_cnpj_key" ON "estabelecimento"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimento_emailInstitucional_key" ON "estabelecimento"("emailInstitucional");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimento_celularInstitucional_key" ON "estabelecimento"("celularInstitucional");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimento_idUsuario_key" ON "estabelecimento"("idUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "estabelecimento_idEndereco_key" ON "estabelecimento"("idEndereco");

-- CreateIndex
CREATE UNIQUE INDEX "entidade_beneficiaria_cnpj_key" ON "entidade_beneficiaria"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "entidade_beneficiaria_emailInstitucional_key" ON "entidade_beneficiaria"("emailInstitucional");

-- CreateIndex
CREATE UNIQUE INDEX "entidade_beneficiaria_celularInstitucional_key" ON "entidade_beneficiaria"("celularInstitucional");

-- CreateIndex
CREATE UNIQUE INDEX "entidade_beneficiaria_idUsuario_key" ON "entidade_beneficiaria"("idUsuario");

-- CreateIndex
CREATE UNIQUE INDEX "entidade_beneficiaria_idEndereco_key" ON "entidade_beneficiaria"("idEndereco");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nome_key" ON "categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "status_alimento_nome_key" ON "status_alimento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "status_pedido_nome_key" ON "status_pedido"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "motivo_cancelamento_nome_key" ON "motivo_cancelamento"("nome");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_idPapel_fkey" FOREIGN KEY ("idPapel") REFERENCES "papel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimento" ADD CONSTRAINT "estabelecimento_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estabelecimento" ADD CONSTRAINT "estabelecimento_idEndereco_fkey" FOREIGN KEY ("idEndereco") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidade_beneficiaria" ADD CONSTRAINT "entidade_beneficiaria_idUsuario_fkey" FOREIGN KEY ("idUsuario") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entidade_beneficiaria" ADD CONSTRAINT "entidade_beneficiaria_idEndereco_fkey" FOREIGN KEY ("idEndereco") REFERENCES "endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alimento" ADD CONSTRAINT "alimento_idCategoria_fkey" FOREIGN KEY ("idCategoria") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alimento" ADD CONSTRAINT "alimento_idEstabelecimento_fkey" FOREIGN KEY ("idEstabelecimento") REFERENCES "estabelecimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alimento" ADD CONSTRAINT "alimento_idStatus_fkey" FOREIGN KEY ("idStatus") REFERENCES "status_alimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motivo_cancelamento" ADD CONSTRAINT "motivo_cancelamento_idAdministrador_fkey" FOREIGN KEY ("idAdministrador") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_idAlimento_fkey" FOREIGN KEY ("idAlimento") REFERENCES "alimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_idStatus_fkey" FOREIGN KEY ("idStatus") REFERENCES "status_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_idEstabelecimento_fkey" FOREIGN KEY ("idEstabelecimento") REFERENCES "estabelecimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_idEntidadeBeneficiaria_fkey" FOREIGN KEY ("idEntidadeBeneficiaria") REFERENCES "entidade_beneficiaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_idMotivoCancelamento_fkey" FOREIGN KEY ("idMotivoCancelamento") REFERENCES "motivo_cancelamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
