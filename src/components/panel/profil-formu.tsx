'use client';

import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type * as z from 'zod';

import { Alan, BOS_ISE_YOK } from '@/components/panel/alan';
import { DosyaYukleyici } from '@/components/panel/dosya-yukleyici';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { ProfilAvatari } from '@/components/profil/profil-avatari';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { SITE_NAME } from '@/lib/constants';
import { SOSYAL_AGLAR, updateProfileSchema } from '@/lib/schemas/profile';
import { saveProfileAction } from '@/server/actions/profile';
import type { AttachmentRefDto, ProfileDto } from '@/server/services/content-dto';

/**
 * PROFİL FORMU — `/panel/icerik/profil`. Public ana sayfanın TAMAMI buradan.
 *
 * TEK EYLEM: `saveProfileAction` (`upsert`). `Profile` tekil kayıt (ADR-017);
 * "yeni profil" ya da "profili sil" diye bir eylem yok, düğme her zaman "Kaydet".
 *
 * SOSYAL BAĞLANTILAR — EKLE / DÜZENLE / KALDIR:
 * Yalnızca dolu bağlantılar satır olarak görünür; boş platformlar altta
 * "+ Instagram" gibi düğmelerle eklenir. Kaldırmak alanı `undefined` yapar ve
 * satırı gizler. Kaydetme `socials` nesnesinin TAMAMINI gönderdiği için kaldırılan
 * anahtar veritabanından da düşer. Anahtar listesi `SOSYAL_AGLAR`dan — şemanın
 * tanıdığı kümenin dışında bir alan arayüzde hiç oluşamaz (`.strict()`).
 *
 * BOŞALTMAK TEMİZLER: konum boşaltılırsa `null` gider (T-031'de `undefined` =
 * "dokunma" demek; aksi hâlde boşaltılan konum sessizce kalırdı).
 */

type ProfilFormGirdi = z.input<typeof updateProfileSchema>;

type SosyalAlan = (typeof SOSYAL_AGLAR)[number]['anahtar'] | 'email';

const SOSYAL_ALANLAR: ReadonlyArray<{
  anahtar: SosyalAlan;
  etiket: string;
  tur: 'url' | 'email';
  ipucu: string;
}> = [
  ...SOSYAL_AGLAR.map(({ anahtar, etiket, alanAdlari }) => ({
    anahtar,
    etiket,
    tur: 'url' as const,
    ipucu:
      anahtar === 'youtube'
        ? 'https://youtube.com/@kanal'
        : alanAdlari[0]
          ? `https://${alanAdlari[0]}/kullanici`
          : 'https://ornek.com',
  })),
  { anahtar: 'email', etiket: 'E-posta', tur: 'email', ipucu: 'ad@ornek.com' },
];

/** Boş metin → `null` (temizle). */
const BOS_ISE_NULL = {
  setValueAs: (deger: unknown) => (typeof deger === 'string' && deger.trim() === '' ? null : deger),
};

export function baslangicDegerleri(profil: ProfileDto): ProfilFormGirdi {
  return {
    headline: profil.headline,
    bio: profil.bio,
    location: profil.location ?? null,
    /*
      Alan alan açılıyor: şemada olmayan bir anahtar veritabanında olsa bile
      (sütun serbest `Json`) forma sızmasın — `.strict()` kaydı reddederdi.
      `profil.socials` zaten okuma yolunda süzülmüş geliyor.
    */
    socials: Object.fromEntries(
      SOSYAL_ALANLAR.map(({ anahtar }) => [anahtar, profil.socials[anahtar] ?? undefined]),
    ),
    avatarAttachmentId: profil.avatar?.id ?? null,
  };
}

export function ProfilFormu({ profil }: { profil: ProfileDto }) {
  const router = useRouter();

  const kaydet = async (degerler: ProfilFormGirdi) => {
    const sonuc = await saveProfileAction(degerler);
    if (sonuc.ok) router.refresh();
    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<ProfilFormGirdi>({
    sema: updateProfileSchema,
    varsayilanDegerler: baslangicDegerleri(profil),
    kaydet,
    temizle: false,
    // Ekranda girdi olarak görünmeyen alan — ona düşen mesaj form düzeyine çıksın.
    gorunmezAlanlar: ['avatarAttachmentId'],
  });

  const {
    register,
    formState: { errors },
  } = form;

  /* Satırı görünen bağlantılar — başta yalnızca dolu olanlar. */
  const [gorunen, setGorunen] = useState<SosyalAlan[]>(() =>
    SOSYAL_ALANLAR.filter(({ anahtar }) => Boolean(profil.socials[anahtar])).map(
      ({ anahtar }) => anahtar,
    ),
  );
  const eklenebilir = SOSYAL_ALANLAR.filter(({ anahtar }) => !gorunen.includes(anahtar));

  const ekle = (anahtar: SosyalAlan) => {
    setGorunen((onceki) => [...onceki, anahtar]);
    // Yeni satırın girdisine odaklan — çizildikten sonra.
    requestAnimationFrame(() => document.getElementById(`socials-${anahtar}`)?.focus());
  };

  const kaldir = (anahtar: SosyalAlan) => {
    form.setValue(`socials.${anahtar}`, undefined, { shouldDirty: true });
    form.clearErrors(`socials.${anahtar}`);
    setGorunen((onceki) => onceki.filter((k) => k !== anahtar));
  };

  return (
    <div className="flex flex-col gap-6">
      <FotografKarti
        profil={profil}
        onSecildi={(id) =>
          form.setValue('avatarAttachmentId', id, { shouldDirty: true, shouldValidate: true })
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle seviye="h2">Profil</CardTitle>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: 'ghost', size: 'sm' })}
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Sayfayı aç
            </a>
          </div>

          <FormKabugu
            gonder={gonder}
            durum={durum}
            formHatasi={formHatasi}
            basariMetni="Kaydedildi. Değişiklikler ana sayfada görünüyor."
            gonderEtiketi="Kaydet"
          >
            <Alan
              id="headline"
              etiket="Tanıtım satırı"
              hata={errors.headline?.message}
              yardim={`Adının (${SITE_NAME}) hemen altındaki kısa satır. Örn. “Fotoğrafçı · İstanbul”.`}
            >
              {(b) => <Input id="headline" {...b} {...register('headline')} />}
            </Alan>

            <Alan
              id="location"
              etiket="Konum"
              hata={errors.location?.message}
              yardim="İsteğe bağlı. Boş bırakılırsa gösterilmez."
            >
              {(b) => <Input id="location" {...b} {...register('location', BOS_ISE_NULL)} />}
            </Alan>

            <Alan
              id="bio"
              etiket="Kısa tanıtım"
              hata={errors.bio?.message}
              yardim="Birkaç cümle, düz metin (en çok 2000 karakter). Satır sonları korunur."
            >
              {(b) => <Textarea id="bio" rows={6} {...b} {...register('bio')} />}
            </Alan>

            {/* ── SOSYAL BAĞLANTILAR ─────────────────────────────────────── */}
            <fieldset className="flex flex-col gap-3">
              <legend className="text-primary text-sm font-medium">Sosyal bağlantılar</legend>

              <p className="text-muted text-xs">
                Yalnızca eklediğin bağlantılar sayfada görünür. Adres tam olmalı (https://…) ve
                platformun kendi alan adında olmalı; e-posta sayfada “mailto” bağlantısı olur.
              </p>

              {gorunen.length === 0 && (
                <p className="text-muted border-line rounded-card border border-dashed p-4 text-sm">
                  Henüz bağlantı yok. Aşağıdan bir platform ekle.
                </p>
              )}

              <ul className="flex flex-col gap-3">
                {SOSYAL_ALANLAR.filter(({ anahtar }) => gorunen.includes(anahtar)).map(
                  ({ anahtar, etiket, tur, ipucu }) => (
                    <li key={anahtar} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Alan
                          id={`socials-${anahtar}`}
                          etiket={etiket}
                          hata={errors.socials?.[anahtar]?.message}
                        >
                          {(b) => (
                            <Input
                              id={`socials-${anahtar}`}
                              type={tur}
                              inputMode={tur === 'email' ? 'email' : 'url'}
                              autoComplete="off"
                              placeholder={ipucu}
                              {...b}
                              {...register(`socials.${anahtar}`, BOS_ISE_YOK)}
                            />
                          )}
                        </Alan>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-7"
                        onClick={() => kaldir(anahtar)}
                        aria-label={`${etiket} bağlantısını kaldır`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </li>
                  ),
                )}
              </ul>

              {eklenebilir.length > 0 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Bağlantı ekle">
                  {eklenebilir.map(({ anahtar, etiket }) => (
                    <Button
                      key={anahtar}
                      variant="secondary"
                      size="sm"
                      onClick={() => ekle(anahtar)}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      {etiket}
                    </Button>
                  ))}
                </div>
              )}
            </fieldset>
          </FormKabugu>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * PROFİL FOTOĞRAFI — yükle / değiştir / kaldır (ADR-044).
 *
 * Yüklemek BAĞLAMAK değil: dosya profilin havuzuna girer, fotoğraf olması
 * formun KAYDIYLA olur. Böylece değişiklik formun geri kalanıyla tek kayıtta
 * ve tek denetim satırında.
 */
function FotografKarti({
  profil,
  onSecildi,
}: {
  profil: ProfileDto;
  onSecildi: (id: string | null) => void;
}) {
  const [avatar, setAvatar] = useState<AttachmentRefDto | null>(profil.avatar);
  const bekleyen = (avatar?.id ?? null) !== (profil.avatar?.id ?? null);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle seviye="h2">Fotoğraf</CardTitle>

        <div className="flex flex-wrap items-center gap-5">
          <ProfilAvatari avatar={avatar} ad="Profil fotoğrafı" className="size-24" />

          <div className="flex flex-col items-start gap-2">
            <DosyaYukleyici
              entity="PROFILE"
              entityId={profil.id}
              tur="gorsel"
              etiket={avatar ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}
              onYuklendi={(dosya) => {
                setAvatar({
                  id: dosya.id,
                  key: dosya.key,
                  mime: dosya.mime,
                  width: dosya.width,
                  height: dosya.height,
                });
                onSecildi(dosya.id);
              }}
            />
            {avatar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAvatar(null);
                  onSecildi(null);
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Fotoğrafı kaldır
              </Button>
            )}
          </div>
        </div>

        <p className="text-muted text-xs">
          Kare bir görsel en iyi sonucu verir (en az 400×400). Fotoğraf yoksa sayfada baş harfler
          görünür.
        </p>

        {bekleyen && (
          <p role="status" className="text-warning text-sm">
            Fotoğraf değişti — aşağıdaki profil formunu{' '}
            <span className="font-medium">kaydedince</span> geçerli olur.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
