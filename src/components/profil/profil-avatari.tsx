import { SITE_INITIALS } from '@/lib/constants';
import { dosyaAdresi } from '@/lib/dosya-adresi';
import { cn } from '@/lib/utils/cn';
import type { AttachmentRefDto } from '@/server/services/content-dto';

/**
 * Yuvarlak profil fotoğrafı — public ana sayfa ve panelin Profil ekranı.
 *
 * Fotoğraf yoksa (ya da eklenti görsel değilse) baş harfli bir yer tutucu
 * çiziliyor; boş bir gri daire "kırık görsel" gibi görünürdü.
 *
 * DÜZ `<img>`, `next/image` DEĞİL — T-037f kararı: görsel aynı kökenden ve
 * değişmez adresle geliyor (`immutable`), kutu sabit boyutlu, yani CLS yok.
 */
export function ProfilAvatari({
  avatar,
  ad,
  className,
  harfSinifi = 'text-3xl',
  oncelikli = false,
}: {
  avatar: AttachmentRefDto | null;
  /** `alt` metni. */
  ad: string;
  /** Boyut sınıfları burada (ör. `size-28`). */
  className?: string;
  /** Yer tutucudaki baş harflerin boyutu. */
  harfSinifi?: string;
  /** Sayfanın LCP öğesi olabilir — tembel yükleme kapatılır. */
  oncelikli?: boolean;
}) {
  const gorsel = avatar?.mime.startsWith('image/') ? avatar : null;

  return (
    <div
      className={cn(
        'bg-elevated relative shrink-0 overflow-hidden rounded-full',
        'ring-line ring-1',
        className,
      )}
    >
      {gorsel ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dosyaAdresi(gorsel.id)}
          alt={ad}
          width={gorsel.width ?? undefined}
          height={gorsel.height ?? undefined}
          loading={oncelikli ? 'eager' : 'lazy'}
          fetchPriority={oncelikli ? 'high' : undefined}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={ad}
          className="bg-gradient-accent flex h-full w-full items-center justify-center"
        >
          <span
            aria-hidden="true"
            className={cn(
              'font-display font-bold tracking-tight text-[color:var(--vurgu-uzeri)]',
              harfSinifi,
            )}
          >
            {SITE_INITIALS}
          </span>
        </div>
      )}
    </div>
  );
}
