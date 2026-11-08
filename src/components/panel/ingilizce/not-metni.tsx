import type { ReactNode } from 'react';

/**
 * Ders notu: düz metin; boş satır paragraf, `- ` madde, `**kalın**`. HTML değil, React
 * düğümü üretir — içerik koddan gelse de `dangerouslySetInnerHTML` gerekmez.
 */
function satirIci(metin: string): ReactNode[] {
  return metin.split(/(\*\*[^*]+\*\*)/g).map((parca, i) =>
    parca.startsWith('**') && parca.endsWith('**') ? (
      <strong key={i} className="text-primary font-semibold">
        {parca.slice(2, -2)}
      </strong>
    ) : (
      parca
    ),
  );
}

/** Bir bloğu sırayla paragraf satırları ve madde gruplarına ayırır. */
function blokParcalari(blok: string): { madde: boolean; satirlar: string[] }[] {
  const parcalar: { madde: boolean; satirlar: string[] }[] = [];
  for (const ham of blok.split('\n')) {
    const satir = ham.trim();
    if (!satir) continue;
    const madde = satir.startsWith('- ');
    const son = parcalar.at(-1);
    if (son && son.madde === madde) son.satirlar.push(madde ? satir.slice(2) : satir);
    else parcalar.push({ madde, satirlar: [madde ? satir.slice(2) : satir] });
  }
  return parcalar;
}

export function NotMetni({ metin }: { metin: string }) {
  return (
    <div className="text-body flex flex-col gap-3 text-[15px] leading-relaxed">
      {metin
        .trim()
        .split(/\n\s*\n/)
        .flatMap((blok, i) =>
          blokParcalari(blok).map((parca, j) =>
            parca.madde ? (
              <ul key={`${i}-${j}`} className="flex list-disc flex-col gap-1.5 pl-5">
                {parca.satirlar.map((s, k) => (
                  <li key={k}>{satirIci(s)}</li>
                ))}
              </ul>
            ) : (
              <p key={`${i}-${j}`}>
                {parca.satirlar.map((s, k) => (
                  <span key={k} className="block">
                    {satirIci(s)}
                  </span>
                ))}
              </p>
            ),
          ),
        )}
    </div>
  );
}
