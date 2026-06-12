// Faixa de parceiros de conteúdo (conforme o app real: Watch + CNN + Universal
// + Globo). Wordmarks estilizados — sem usar os logotipos oficiais.
const PARTNERS = ['Watch', 'CNN', 'Universal', 'Globo'];

export function PartnerStrip() {
  return (
    <div className="border-y border-white/5 bg-black/40 px-4 py-4 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Transmissão por
        </span>
        {PARTNERS.map((p, i) => (
          <span key={p} className="flex items-center gap-6">
            <span className="text-base font-bold tracking-tight text-white/80 transition-colors hover:text-white sm:text-lg">
              {p}
            </span>
            {i < PARTNERS.length - 1 && (
              <span className="text-white/20" aria-hidden="true">
                +
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
