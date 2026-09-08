import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function processarUmaVez(provider: string, eventId: string, handler: () => Promise<void>) {
  const where = { provider_eventId: { provider, eventId } };
  try {
    await prisma.webhookReceipt.create({ data: { provider, eventId } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const existing = await prisma.webhookReceipt.findUniqueOrThrow({ where });
    if (existing.state === "DONE") return;
    // Só uma requisição pode retomar um erro conhecido. Não roubar trabalho em andamento.
    const claimed = await prisma.webhookReceipt.updateMany({
      where: { provider, eventId, state: "FAILED" }, data: { state: "PROCESSING" },
    });
    if (!claimed.count) throw new Error("webhook_in_progress_or_requires_review");
  }
  try {
    await handler();
    await prisma.webhookReceipt.update({ where, data: { state: "DONE" } });
  } catch (error) {
    await prisma.webhookReceipt.update({ where, data: { state: "FAILED" } });
    throw error;
  }
}
