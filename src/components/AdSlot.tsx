/**
 * Slot de monetização — apagado até as contas existirem.
 * Ativa com NEXT_PUBLIC_ADSENSE_CLIENT + NEXT_PUBLIC_ADSENSE_SLOT no env do Coolify.
 * Enquanto não há ID, renderiza nada (site limpo = melhor aprovação no AdSense).
 */
export function AdSlot({ posicao }: { posicao: "topo" | "meio" | "rodape" }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT;
  if (!client || !slot) return null;

  return (
    <div className={`ad-slot ad-${posicao} my-6`} data-ad-position={posicao}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
