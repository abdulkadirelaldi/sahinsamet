import { ArrowUpRight, Globe, Mail, MapPin } from 'lucide-react';
import type { ComponentProps, ComponentType } from 'react';

import {
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  XIcon,
  YoutubeIcon,
} from '@/components/icons/social';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SITE_NAME } from '@/lib/constants';
import type { ProfileDto } from '@/server/services/content-dto';

import { ProfilAvatari } from './profil-avatari';
import { sosyalBaglantilar, type SosyalAnahtar } from './sosyal';

const IKONLAR: Record<SosyalAnahtar, ComponentType<ComponentProps<'svg'>>> = {
  instagram: InstagramIcon,
  x: XIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
  github: GithubIcon,
  website: Globe,
  email: Mail,
};

/**
 * PUBLIC TEK SAYFA — `/`.
 *
 * Baştan sona `Profile` kaydından çizilir: fotoğraf, ad, tanıtım satırı,
 * konum, kısa tanıtım ve sosyal bağlantılar. Boş alanlar HİÇ çizilmez —
 * "henüz eklenmedi" gibi bir metin ziyaretçiye gösterilmez; profil boşken
 * sayfa ad + tanıtım satırıyla sade bir kartvizit olarak kalır.
 *
 * Tema: kök token'lar (koyu/açık), sağ üstte tema düğmesi.
 */
export function ProfilSayfasi({ profil }: { profil: ProfileDto }) {
  const baglantilar = sosyalBaglantilar(profil.socials);
  const bio = profil.bio.trim();

  return (
    <div className="profil-zemin relative flex min-h-dvh flex-col">
      <header className="flex justify-end px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <ThemeToggle />
      </header>

      <main
        id="icerik"
        className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 pt-6 pb-12 text-center sm:pt-12"
      >
        <ProfilAvatari
          avatar={profil.avatar}
          ad={SITE_NAME}
          oncelikli
          className="ring-canvas size-28 shadow-[0_0_0_4px_var(--accent-glow)] ring-4 sm:size-32"
          harfSinifi="text-4xl sm:text-5xl"
        />

        <h1 className="font-display text-primary mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {SITE_NAME}
        </h1>

        {profil.headline.trim() && (
          <p className="text-body mt-3 text-lg text-balance sm:text-xl">{profil.headline}</p>
        )}

        {profil.location && (
          <p className="text-muted mt-3 inline-flex items-center gap-1.5 text-sm">
            <MapPin className="size-4" aria-hidden="true" />
            {profil.location}
          </p>
        )}

        {bio && (
          <p className="text-body mt-6 max-w-prose text-base leading-relaxed whitespace-pre-line">
            {bio}
          </p>
        )}

        {baglantilar.length > 0 && (
          <nav aria-label="Sosyal bağlantılar" className="mt-10 w-full">
            <ul className="grid gap-3 sm:grid-cols-2">
              {baglantilar.map(({ anahtar, etiket, href, ayrinti, dis }) => {
                const Ikon = IKONLAR[anahtar];
                return (
                  <li key={anahtar}>
                    <a
                      href={href}
                      {...(dis ? { target: '_blank', rel: 'noopener noreferrer me' } : {})}
                      className="group focus-ring rounded-card border-line bg-surface hover:border-line-hover ease-brand duration-micro flex items-center gap-3 border p-3.5 text-left transition-colors"
                    >
                      <span className="bg-elevated text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                        <Ikon className="size-[18px]" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-primary text-sm font-medium">{etiket}</span>
                        <span className="text-muted truncate text-xs">{ayrinti}</span>
                      </span>
                      {dis && (
                        <ArrowUpRight
                          className="text-muted group-hover:text-primary ease-brand duration-micro size-4 shrink-0 transition-colors"
                          aria-hidden="true"
                        />
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </main>

      <footer className="text-muted px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs">
        © {new Date().getFullYear()} {SITE_NAME}
      </footer>
    </div>
  );
}
