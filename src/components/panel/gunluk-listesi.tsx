import { BookOpen, Plus } from 'lucide-react';
import Link from 'next/link';

import { gunAyYil, gunlukYolu } from '@/components/panel/hayat-bicim';
import { RUH_HALI } from '@/components/panel/kisisel-etiketler';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils/cn';
import type { JournalEntryListItemDto } from '@/server/services/journal-entry';

/**
 * GÜNLÜK LİSTESİ — §4.2 `/panel/hayat/gunluk`, T-115.
 *
 * TABLO DEĞİL, KART LİSTESİ: günlüğün asıl bilgisi metin. Bir tablo hücresine
 * 240 karakterlik özet sıkıştırmak satırları okunmaz kılardı; sıralanacak
 * sayısal bir sütun da yok (sıra zaten "en yeni gün üstte", sunucuda).
 *
 * ÖZET, METİN DEĞİL: liste DTO'su `content` TAŞIMIYOR (`journal-entry.ts` —
 * 100.000 karakterlik kayıtları liste sayfasında sınırdan geçirmemek için).
 * `truncated` ise "devamını oku" bağlantısı çiziliyor; tam metin yalnızca
 * `[id]` ekranında.
 *
 * ETİKETLER BAĞLANTI: `?etiket=` süzgecine götürüyor — aynı etiketin diğer
 * günlerini görmek, etiketin var olma sebebi.
 *
 * SİLME BURADA YOK, kaydın kendi ekranında: günlük en kişisel serbest metin ve
 * silme geri alınamaz — okumadan silmeyi tek tıka indirmek istenmedi.
 *
 * SERVER COMPONENT — etkileşim yok, yalnızca bağlantılar.
 */
export function GunlukListesi({
  kayitlar,
  toplam,
  aramaVar,
  q,
  etiket,
}: {
  kayitlar: JournalEntryListItemDto[];
  toplam: number;
  aramaVar: boolean;
  q?: string;
  etiket?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-sm">
          <span className="tabular">{toplam}</span> kayıt · en yeni gün üstte
        </p>

        <Link href="/panel/hayat/gunluk/yeni" className={buttonClasses({ size: 'sm' })}>
          <Plus className="size-4" aria-hidden="true" />
          Yeni kayıt
        </Link>
      </div>

      {kayitlar.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={aramaVar ? 'Eşleşen kayıt yok' : 'Henüz günlük yok'}
          description={
            aramaVar
              ? 'Bu arama ya da etiketle eşleşen günlük kaydı bulunamadı.'
              : 'Günün nasıl geçtiğini birkaç cümleyle yaz. Yalnızca panelde görünür; içerik denetim kaydına yazılmaz.'
          }
          action={
            aramaVar ? (
              <Link
                href="/panel/hayat/gunluk"
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                Süzgeci temizle
              </Link>
            ) : (
              <Link href="/panel/hayat/gunluk/yeni" className={buttonClasses({ size: 'sm' })}>
                <Plus className="size-4" aria-hidden="true" />
                İlk günlüğü yaz
              </Link>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {kayitlar.map((k) => (
            <li key={k.id}>
              <article
                aria-labelledby={`gunluk-${k.id}`}
                className="border-line bg-surface rounded-card flex flex-col gap-2 border p-4"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id={`gunluk-${k.id}`} className="min-w-0 text-base">
                    <Link
                      href={`/panel/hayat/gunluk/${k.id}`}
                      className="focus-ring rounded-btn text-primary -m-1 p-1 font-medium break-words"
                    >
                      {k.title ?? gunAyYil(k.date)}
                    </Link>
                  </h2>
                  <p className="text-muted text-xs">
                    <time dateTime={k.date} className="tabular">
                      {gunAyYil(k.date)}
                    </time>
                    {k.mood ? ` · ${RUH_HALI[k.mood]}` : null}
                  </p>
                </header>

                <p className="text-body text-sm break-words">
                  {k.excerpt}
                  {k.truncated && (
                    <>
                      {' '}
                      <Link
                        href={`/panel/hayat/gunluk/${k.id}`}
                        className="focus-ring text-primary rounded-sm font-medium underline underline-offset-4"
                      >
                        Devamını oku
                        <span className="sr-only">: {k.title ?? gunAyYil(k.date)}</span>
                      </Link>
                    </>
                  )}
                </p>

                {k.tags.length > 0 && (
                  <ul aria-label="Etiketler" className="flex flex-wrap gap-1.5">
                    {k.tags.map((t) => (
                      <li key={t}>
                        <Link
                          href={gunlukYolu({ q, etiket: t })}
                          aria-current={t === etiket ? 'true' : undefined}
                          className={cn(
                            'focus-ring rounded-pill inline-flex items-center border px-2.5 py-0.5 text-xs',
                            t === etiket
                              ? 'border-accent/40 bg-accent/12 text-accent-soft'
                              : 'border-line bg-elevated text-body hover:text-primary',
                          )}
                        >
                          #{t}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
