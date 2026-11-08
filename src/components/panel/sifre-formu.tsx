'use client';

import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type * as z from 'zod';

import { Alan } from '@/components/panel/alan';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { changePasswordSchema } from '@/lib/schemas/user';
import { changePasswordAction } from '@/server/actions/password';

/**
 * ŞİFRE DEĞİŞTİRME FORMU — §4.2 `/panel/ayarlar/sifre`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ADR-035'İN CÜMLESİ — DEĞİŞTİRİLMEDEN KULLANILIYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Başarı metni `ADR_035_MESAJ` sabitinde ve bire bir ADR'deki hâli. Üç şeyi
 * birlikte söylemesi şart ve hiçbiri atlanamaz:
 *
 *   - "bu cihaz dahil"      → kullanıcı kendi oturumunun da yetkisini kaybetti
 *   - "oturumlar kapatılmadı" → okumalar sürüyor, C katmanı F6'da
 *   - "değişiklik yapmak için yeniden giriş" → ne yapması gerektiği
 *
 * ⚠️ "Tüm cihazlardan çıkış yapıldı" YASAK: okumalar KAPANMIYOR, yani o cümle
 * doğru olmayan bir şey söylerdi. Panelde doğrulanamayan söz vermeme kuralının
 * (T-034'te öğrenilen) en keskin hâli bu — burada söz yanlış OLUR, belirsiz
 * değil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `totpCode` ALANI SUNUCUNUN BİLDİĞİ DURUMA GÖRE ÇİZİLİYOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Kart iki seçenek bıraktı: alanı HER ZAMAN göster ya da `TOTP_REQUIRED`
 * yanıtında aç. Üçüncüsünü seçtim ve sebebi ölçülebilir: 2FA durumu SUNUCUDA
 * BİLİNİYOR (`getTotpStatus()`, güvenlik ayarları sayfası zaten onu okuyor).
 * Yani tahmin etmek gerekmiyor.
 *
 *   - Her zaman göstermek: 2FA kapalıyken doldurulamayan bir alan — kullanıcı
 *     "boş bırakabilir miyim" diye duraksar.
 *   - `TOTP_REQUIRED`'da açmak: form GÖNDERİMDEN SONRA büyür, kullanıcı şifreyi
 *     iki kez yazar. Formun hata sonrası şekil değiştirmesi, en kötü seçenek.
 *
 * Sunucudan gelen `ikiAdimliAcik` ile alan baştan doğru çiziliyor. Sunucu yine
 * de son söz: `TOTP_REQUIRED` dönerse `fields.totpCode` alana basılıyor ve alan
 * zaten orada.
 */

type SifreFormGirdi = z.input<typeof changePasswordSchema>;

/** ADR-035 — bağlayıcı metin. Değiştirilmeyecek. */
const ADR_035_MESAJ =
  'Şifreniz değiştirildi. Güvenlik için açık olan tüm oturumlar —bu cihaz dahil— artık değişiklik yapamaz; değişiklik yapmak için yeniden giriş yapmanız gerekiyor. Oturumlar kapatılmadı, yalnızca değişiklik yetkileri kaldırıldı.';

const BOS_FORM: SifreFormGirdi = {
  currentPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
  totpCode: '',
};

export function SifreFormu({ ikiAdimliAcik }: { ikiAdimliAcik: boolean }) {
  const [basarili, setBasarili] = useState(false);

  const kaydet = async (degerler: SifreFormGirdi) => {
    const sonuc = await changePasswordAction(degerler);
    if (sonuc.ok) setBasarili(true);
    return sonuc;
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<SifreFormGirdi>({
    sema: changePasswordSchema,
    varsayilanDegerler: BOS_FORM,
    kaydet,
    /*
      BAŞARIDA FORM TEMİZLENİYOR — şifre alanları ekranda kalmasın. Diğer panel
      formlarında `temizle: false` doğruydu (düzenlenen kaydı kaybetmiş gibi
      hissettirmemek için); burada tam tersi, üç alanın üçü de sır.
    */
    temizle: true,
    /*
      Gizli alan YOK ama 2FA kapalıyken `totpCode` EKRANDA ÇİZİLMİYOR. Sunucu
      yine de o alana hata basabilir (`TOTP_REQUIRED`) ve o mesaj kaybolmasın —
      T-041f'te bulunan, T-043f'te desene taşınan kusurun aynı sınıfı.
    */
    gorunmezAlanlar: ikiAdimliAcik ? [] : ['totpCode'],
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CardTitle seviye="h2">Şifreyi değiştir</CardTitle>

        {/*
          BAŞARI BİLDİRİMİ FORM KABUĞUNUN DIŞINDA ve `FormKabugu`nun kendi kısa
          başarı satırının YERİNE geçiyor: ADR-035'in metni üç cümle ve kabuğun
          tek satırlık yeşil şeridine sığmıyor. `role="status"` — kullanıcının
          yaptığı bir şeyin sonucu ama onu kesmesi gerekmiyor.
        */}
        {basarili && (
          <div
            role="status"
            className="rounded-card border-success/40 bg-success/8 flex items-start gap-2.5 border px-4 py-3"
          >
            <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-success text-sm">
              {ADR_035_MESAJ} Kayıtlı Face ID cihazları da kaldırıldı; Ayarlar → Güvenlik’ten
              yeniden ekleyebilirsiniz.
            </p>
          </div>
        )}

        <FormKabugu
          gonder={gonder}
          durum={durum}
          formHatasi={formHatasi}
          /* Uzun metin yukarıda; kabuğun kendi satırı kısa hâli söylüyor. */
          basariMetni="Diğer cihazlar artık değişiklik yapamaz."
          gonderEtiketi="Şifreyi değiştir"
        >
          <Alan id="currentPassword" etiket="Mevcut şifre" hata={errors.currentPassword?.message}>
            {(b) => (
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...b}
                {...register('currentPassword')}
              />
            )}
          </Alan>

          <div className="grid gap-4 sm:grid-cols-2">
            <Alan
              id="newPassword"
              etiket="Yeni şifre"
              hata={errors.newPassword?.message}
              yardim="En az 12 karakter. Mevcut şifrenle aynı olamaz."
            >
              {(b) => (
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...b}
                  {...register('newPassword')}
                />
              )}
            </Alan>

            <Alan
              id="newPasswordConfirm"
              etiket="Yeni şifre (tekrar)"
              hata={errors.newPasswordConfirm?.message}
            >
              {(b) => (
                <Input
                  id="newPasswordConfirm"
                  type="password"
                  autoComplete="new-password"
                  {...b}
                  {...register('newPasswordConfirm')}
                />
              )}
            </Alan>
          </div>

          {ikiAdimliAcik && (
            <Alan
              id="totpCode"
              etiket="Doğrulama kodu"
              hata={errors.totpCode?.message}
              yardim="Hesabında iki adımlı doğrulama açık. Uygulamadaki 6 haneli kodu ya da bir kurtarma kodunu gir."
            >
              {(b) => (
                <Input
                  id="totpCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="tabular"
                  {...b}
                  {...register('totpCode')}
                />
              )}
            </Alan>
          )}
        </FormKabugu>

        {/*
          NE OLACAĞI ÖNCEDEN SÖYLENİYOR. Sonucu sonradan bildirmek yetmez:
          kullanıcı "bu cihaz dahil" sonucunu kaydetmeden önce bilirse kararı
          bilerek verir. Metin ADR-035 ile aynı şeyi söylüyor, gelecek zamanda.
        */}
        <div className="border-line bg-elevated/40 rounded-card flex items-start gap-3 border p-4">
          <ShieldAlert className="text-muted mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-muted text-sm">
            Kaydettiğinde açık olan tüm oturumlar —<span className="text-body">bu cihaz dahil</span>
            — değişiklik yapma yetkisini kaybeder. Oturumlar kapatılmaz; okumaya devam edebilirsin
            ama değişiklik yapmak için yeniden giriş gerekir.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
