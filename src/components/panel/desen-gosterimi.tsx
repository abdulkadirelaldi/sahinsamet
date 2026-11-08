'use client';

import { FilePlus2, Wallet } from 'lucide-react';
import { useState } from 'react';
import * as z from 'zod';

import { ArsivleDugmesi } from '@/components/panel/arsivle-dugmesi';
import { FormKabugu, usePanelForm } from '@/components/panel/panel-form';
import { VeriTablosu, type Sutun } from '@/components/panel/veri-tablosu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApiResponse } from '@/types';

/**
 * DESEN GÖSTERİMİ — T-032'nin altı ortak deseni ÇALIŞIR hâlde.
 *
 * Bu sayfa bir vitrin değil, bir SÖZLEŞME KANITI: F3/F4/F5'in ekranları bu
 * desenleri çoğaltacak ve buradaki davranış (boş/yükleniyor/hata üçlüsü,
 * §7.2 alan eşlemesi, arşivleme dili) referans alınacak.
 *
 * VERİ SAHTE ve öyle kalmalı: gerçek veri T-033+'ta gelecek. Sahte veri
 * `data-desen-gosterimi` ile işaretli, böylece "panelde uydurma sayı var mı"
 * sorusu aranarak yanıtlanabilir (ADR-027'nin uydurma istatistik yasağı bu
 * sayfayı kapsamıyor — burada amaç sayı göstermek değil, deseni göstermek).
 */

type OrnekSatir = {
  id: string;
  aciklama: string;
  kategori: string;
  tutar: number;
  tarih: string;
};

const ORNEK_SATIRLAR: OrnekSatir[] = [
  {
    id: '1',
    aciklama: 'Kurumsal site — 2. taksit',
    kategori: 'Gelir',
    tutar: 18500,
    tarih: '2026-08-04',
  },
  {
    id: '2',
    aciklama: 'Sunucu ve alan adı',
    kategori: 'Gider',
    tutar: -1249.9,
    tarih: '2026-08-11',
  },
  {
    id: '3',
    aciklama: 'Rezervasyon paneli — bakım',
    kategori: 'Gelir',
    tutar: 3200,
    tarih: '2026-08-19',
  },
  {
    id: '4',
    aciklama: 'Tasarım aracı aboneliği',
    kategori: 'Gider',
    tutar: -742.35,
    tarih: '2026-08-22',
  },
];

const paraBicimi = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 });

const SUTUNLAR: ReadonlyArray<Sutun<OrnekSatir>> = [
  {
    anahtar: 'aciklama',
    baslik: 'Açıklama',
    deger: (satir) => satir.aciklama,
    siralamaDegeri: (satir) => satir.aciklama,
  },
  {
    anahtar: 'kategori',
    baslik: 'Kategori',
    ikincil: true,
    deger: (satir) => (
      <Badge variant={satir.kategori === 'Gelir' ? 'success' : 'neutral'}>{satir.kategori}</Badge>
    ),
    siralamaDegeri: (satir) => satir.kategori,
  },
  {
    anahtar: 'tarih',
    baslik: 'Tarih',
    sayisal: true,
    ikincil: true,
    deger: (satir) => satir.tarih,
    siralamaDegeri: (satir) => satir.tarih,
  },
  {
    anahtar: 'tutar',
    baslik: 'Tutar',
    sayisal: true,
    deger: (satir) => paraBicimi.format(satir.tutar),
    siralamaDegeri: (satir) => satir.tutar,
  },
];

/** Gösterim formu — gerçek şemalar F3'te gelecek, kural aynı yerden okunacak. */
const ornekSema = z.object({
  baslik: z.string().trim().min(3, { error: 'Başlık en az 3 karakter olmalı.' }),
  tutar: z.string().regex(/^-?\d+([.,]\d{1,2})?$/, { error: 'Tutarı sayı olarak gir.' }),
});

type OrnekForm = z.infer<typeof ornekSema>;

export function DesenGosterimi() {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [bosMu, setBosMu] = useState(false);
  const [arsivMesaji, setArsivMesaji] = useState<string | null>(null);

  /**
   * SAHTE SUNUCU: §7.2 zarfını taklit ediyor.
   * "hata" yazan başlık 400 + `fields` döndürüyor — alan eşlemesi görünsün diye.
   */
  const kaydet = async (degerler: OrnekForm): Promise<ApiResponse<{ id: string }>> => {
    await new Promise((coz) => setTimeout(coz, 700));
    if (degerler.baslik.toLowerCase().includes('hata')) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Gönderilen bilgilerde hata var.',
          fields: { baslik: 'Bu başlık kullanılamıyor (sunucudan gelen hata).' },
        },
      };
    }
    return { ok: true, data: { id: 'ornek' } };
  };

  const { form, durum, formHatasi, gonder } = usePanelForm<OrnekForm>({
    sema: ornekSema,
    varsayilanDegerler: { baslik: '', tutar: '' },
    kaydet,
    temizle: true,
  });

  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="flex flex-col gap-6" data-desen-gosterimi>
      {/* ── 1 + 5 + 4: TABLO, YÜKLENİYOR, BOŞ DURUM ─────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle seviye="h2">Veri tablosu</CardTitle>
              <CardDescription>
                Sıralama, sekmeli rakam, yükleniyor iskeleti ve boş durum tek bileşende.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setYukleniyor(true);
                  setTimeout(() => setYukleniyor(false), 1500);
                }}
              >
                Yükleniyor
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setBosMu((o) => !o)}>
                {bosMu ? 'Satırları göster' : 'Boş durum'}
              </Button>
            </div>
          </div>

          <VeriTablosu
            baslik="Örnek işlem listesi"
            satirlar={bosMu ? [] : ORNEK_SATIRLAR}
            sutunlar={SUTUNLAR}
            satirAnahtari={(satir) => satir.id}
            yukleniyor={yukleniyor}
            bosDurum={
              <EmptyState
                icon={Wallet}
                title="Bu ay henüz işlem yok"
                description="İlk gelir veya gideri girdiğinde aylık özet burada canlanacak."
                action={
                  <Button type="button" size="sm">
                    <FilePlus2 className="size-4" aria-hidden="true" />
                    İşlem ekle
                  </Button>
                }
              />
            }
          />
        </CardContent>
      </Card>

      {/* ── 2: FORM KABUĞU ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle seviye="h2">Form kabuğu</CardTitle>
            <CardDescription>
              Başlığa &quot;hata&quot; yazıp kaydet: sunucunun{' '}
              <code className="tabular">fields</code> yanıtı doğrudan alanın altına düşer,
              yazdıkların kaybolmaz.
            </CardDescription>
          </div>

          <FormKabugu
            gonder={gonder}
            durum={durum}
            formHatasi={formHatasi}
            basariMetni="Kaydedildi. (Bu gösterimde sunucuya gerçekten yazılmıyor.)"
            gonderEtiketi="Kaydet"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="desen-baslik">Başlık</Label>
                <Input
                  id="desen-baslik"
                  aria-invalid={errors.baslik ? true : undefined}
                  aria-describedby={errors.baslik ? 'desen-baslik-hata' : undefined}
                  {...register('baslik')}
                />
                {errors.baslik && (
                  <FormError id="desen-baslik-hata">{errors.baslik.message}</FormError>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="desen-tutar">Tutar</Label>
                {/* §3.2 — sayısal girdi de sekmeli rakamla yazılır. */}
                <Input
                  id="desen-tutar"
                  inputMode="decimal"
                  className="tabular"
                  aria-invalid={errors.tutar ? true : undefined}
                  aria-describedby={errors.tutar ? 'desen-tutar-hata' : undefined}
                  {...register('tutar')}
                />
                {errors.tutar && (
                  <FormError id="desen-tutar-hata">{errors.tutar.message}</FormError>
                )}
              </div>
            </div>
          </FormKabugu>
        </CardContent>
      </Card>

      {/* ── 3: ARŞİVLEME ────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle seviye="h2">Arşivleme</CardTitle>
            <CardDescription>
              ADR-017: panelde silme yok. Düğme arşivler ve bunu kullanıcıya açıkça söyler.
            </CardDescription>
          </div>

          <ArsivleDugmesi
            kayitAdi="Rezervasyon paneli"
            arsivle={async () => {
              await new Promise((coz) => setTimeout(coz, 700));
              setArsivMesaji('Kayıt arşivlendi. (Gösterim — gerçek bir kayıt değişmedi.)');
              return { ok: true, data: null };
            }}
          />

          {arsivMesaji && (
            <p role="status" className="text-success text-sm">
              {arsivMesaji}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── 6: HATA SINIRI ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle seviye="h2">Hata durumu</CardTitle>
            <CardDescription>
              Panelin hata sınırı <code className="tabular">(panel)/error.tsx</code>. Aşağıdaki
              düğme bilerek bir hata fırlatır; sınır devreye girer ve &quot;Tekrar dene&quot; ile
              geri dönülür.
            </CardDescription>
          </div>

          <PatlatDugmesi />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hata sınırını GERÇEKTEN sınayan düğme.
 *
 * Hata `onClick` içinde değil RENDER sırasında fırlatılıyor: React hata
 * sınırları olay işleyicilerindeki hataları yakalamaz. Yanlış yerde fırlatan
 * bir düğme "sınır çalışmıyor" gibi görünürdü.
 */
function PatlatDugmesi() {
  const [patlat, setPatlat] = useState(false);
  if (patlat) throw new Error('Desen gösterimi — hata sınırı denemesi.');

  return (
    /* `self-start`: kart bir flex sütunu, düğme yoksa tam genişliğe yayılıyor
       ve tıklama hedefi olduğundan çok daha büyük görünüyordu. */
    <Button
      type="button"
      variant="danger"
      size="sm"
      className="self-start"
      onClick={() => setPatlat(true)}
    >
      Hata fırlat
    </Button>
  );
}
