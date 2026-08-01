-- CPF do profissional: exigido pelo Asaas para emitir cobrança.
-- Coletado no cadastro (opcional) ou via WhatsApp no fluxo do QUERO.
ALTER TABLE "Professional" ADD COLUMN "cpf" TEXT;
