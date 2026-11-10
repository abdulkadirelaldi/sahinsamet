'use client';

import { Bell, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { FormAlert, FormError } from '@/components/ui/form-error';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { takvimEtkinligiSchema, type TakvimKapsami } from '@/lib/schemas/takvim';
import {
  ayinGunuMetni,
  dakikaEkle,
  dakikaFarki,
  gunAyMetni,
  GUN_ADLARI,
  GUN_KISA,
  saatMetni,
} from '@/lib/takvim/bicim';
import type { TakvimEtkinligiVerisi, TakvimOlusumu } from '@/lib/takvim/gorunum';
import {
  EN_COK_HATIRLATMA,
  EN_UZUN_HATIRLATMA_DK,
  hatirlatmaEtiketi,
  SAATLI_SECENEKLER,
  TUM_GUN_SECENEKLERI,
  varsayilanHatirlatmalar,
} from '@/lib/takvim/hatirlatma';
import { KATEGORI_SIRASI, TAKVIM_KATEGORILERI } from '@/lib/takvim/kategoriler';
import { haftaninGunu, TEKRAR_YOK, type TekrarKurali } from '@/lib/takvim/tekrar';
import { cn } from '@/lib/utils/cn';
import { appWallClockMinutes, toAppDay, type AppDay } from '@/server/services/_shared/app-date';
import type { ApiResponse, TakvimKategori } from '@/types';

/**
 * ETKİNLİK FORMU (2026-11-10). Doğrulama SUNUCUYLA AYNI şema (`takvimEtkinligiSchema`): hata
 * gönderilmeden alanın altında görünür, sunucu yine ayrıca doğrular.
 *
 * Başlangıç değişince süre korunur (bitiş birlikte kayar) — Google'daki gibi. Tekrarlayan bir
 * seri kaydedilirken kapsam sorulur: yalnızca bu / bu ve sonrakiler / tümü.
 */

export interface FormDurumu {
  baslik: string;
  aciklama: string;
  konum: string;
  kategori: TakvimKategori;
  tumGun: boolean;
  baslangicGun: AppDay;
  baslangicSaat: string;
  bitisGun: AppDay;
  bitisSaat: string;
  tekrar: TekrarKurali;
  hatirlatmalar: number[];
}

/** Boş günden/saatten yeni etkinlik. `dk` yoksa tüm gün. */
export function yeniForm(gun: AppDay, dk: number | null): FormDurumu {
  const bas = dk ?? 9 * 60;
  const son = dakikaEkle(gun, saatMetni(bas), 60);
  return {
    baslik: '',
    aciklama: '',
    konum: '',
    kategori: 'KISISEL',
    tumGun: dk === null,
    baslangicGun: gun,
    baslangicSaat: saatMetni(bas),
    bitisGun: dk === null ? gun : son.gun,
    bitisSaat: son.saat,
    tekrar: TEKRAR_YOK,
    hatirlatmalar: varsayilanHatirlatmalar(dk === null),
  };
}

/** Tıklanan oluşumdan düzenleme formu: tarih ve saat OLUŞUMUN, geri kalanı serinin. */
export function duzenlemeFormu(e: TakvimEtkinligiVerisi, o: TakvimOlusumu): FormDurumu {
  const bitis = new Date(o.bitis);
  const timed = !e.tumGun;
  return {
    baslik: e.baslik,
    aciklama: e.aciklama ?? '',
    konum: e.konum ?? '',
    kategori: e.kategori,
    tumGun: e.tumGun,
    baslangicGun: o.gun,
    baslangicSaat: timed ? saatMetni(appWallClockMinutes(new Date(o.baslangic))) : '09:00',
    bitisGun: timed ? toAppDay(bitis) : o.sonGun,
    bitisSaat: timed ? saatMetni(appWallClockMinutes(bitis)) : '10:00',
    tekrar: { ...e.tekrar, gunler: [...e.tekrar.gunler] },
    hatirlatmalar: [...e.hatirlatmalar],
  };
}

type TekrarSecimi = 'YOK' | 'GUNLUK' | 'HAFTALIK' | 'HAFTA_ICI' | 'AYLIK' | 'YILLIK' | 'OZEL';
const HAFTA_ICI = [1, 2, 3, 4, 5];

function secimi(k: TekrarKurali, bas: AppDay): TekrarSecimi {
  if (k.tur === 'YOK') return 'YOK';
  if (k.aralik !== 1 || k.sayi !== null || k.bitisGun !== null) return 'OZEL';
  if (k.tur === 'HAFTALIK') {
    const g = [...k.gunler].sort((a, b) => a - b).join(',');
    if (g === HAFTA_ICI.join(',')) return 'HAFTA_ICI';
    if (g === '' || g === String(haftaninGunu(bas))) return 'HAFTALIK';
    return 'OZEL';
  }
  return k.tur;
}

function secimdenKural(s: Exclude<TekrarSecimi, 'OZEL'>, bas: AppDay): TekrarKurali {
  const temel = { aralik: 1, bitisGun: null, sayi: null };
  switch (s) {
    case 'YOK':
      return TEKRAR_YOK;
    case 'HAFTALIK':
      return { ...temel, tur: 'HAFTALIK', gunler: [haftaninGunu(bas)] };
    case 'HAFTA_ICI':
      return { ...temel, tur: 'HAFTALIK', gunler: HAFTA_ICI };
    default:
      return { ...temel, tur: s, gunler: [] };
  }
}

const OZEL_BIRIMLER = [
  { dk: 1, ad: 'dakika' },
  { dk: 60, ad: 'saat' },
  { dk: 1440, ad: 'gün' },
  { dk: 10080, ad: 'hafta' },
] as const;

const TEKRAR_BIRIMLERI: { tur: TekrarKurali['tur']; ad: string }[] = [
  { tur: 'GUNLUK', ad: 'günde' },
  { tur: 'HAFTALIK', ad: 'haftada' },
  { tur: 'AYLIK', ad: 'ayda' },
  { tur: 'YILLIK', ad: 'yılda' },
];

export function EtkinlikFormu({
  ilk,
  seriTekrarli,
  kaydet,
  vazgec,
}: {
  ilk: FormDurumu;
  /** Düzenlenen seri tekrarlıysa kaydederken kapsam sorulur. */
  seriTekrarli: boolean;
  kaydet: (girdi: unknown, kapsam: TakvimKapsami) => Promise<ApiResponse<unknown>>;
  vazgec: () => void;
}) {
  const kimlik = useId();
  const [f, setF] = useState<FormDurumu>(ilk);
  const [ozel, setOzel] = useState(() => secimi(ilk.tekrar, ilk.baslangicGun) === 'OZEL');
  const [hatalar, setHatalar] = useState<Record<string, string>>({});
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const [kapsamAdimi, setKapsamAdimi] = useState<unknown>(null);
  const [kapsam, setKapsam] = useState<TakvimKapsami>('tek');
  const [ozelSayi, setOzelSayi] = useState('');
  const [ozelBirim, setOzelBirim] = useState(60);

  const baslikRef = useRef<HTMLInputElement>(null);
  // Pencere ayrıntıdan düzenlemeye geçince de odak başlıkta olsun (pencere yeniden açılmıyor).
  useEffect(() => baslikRef.current?.focus(), []);

  const alan = (ad: string) => `${kimlik}-${ad}`;
  const guncelle = (yama: Partial<FormDurumu>) => setF((o) => ({ ...o, ...yama }));

  /** Başlangıç değişince süre korunur; basit haftalık tekrar yeni güne geçer. */
  const baslangiciDegistir = (gun: AppDay, saat: string) => {
    if (!gun) return;
    setF((o) => {
      const sure = Math.max(
        0,
        dakikaFarki(
          { gun: o.baslangicGun, saat: o.baslangicSaat },
          { gun: o.bitisGun, saat: o.bitisSaat },
        ),
      );
      const son = dakikaEkle(gun, saat, sure);
      const s = secimi(o.tekrar, o.baslangicGun);
      const tekrar = !ozel && s === 'HAFTALIK' ? secimdenKural('HAFTALIK', gun) : o.tekrar;
      return {
        ...o,
        baslangicGun: gun,
        baslangicSaat: saat,
        bitisGun: son.gun,
        bitisSaat: son.saat,
        tekrar,
      };
    });
  };

  const tumGunDegistir = (tumGun: boolean) =>
    setF((o) => ({
      ...o,
      tumGun,
      bitisGun: tumGun && o.bitisGun < o.baslangicGun ? o.baslangicGun : o.bitisGun,
      // Öbür kipin varsayılanı duruyorsa bu kipin varsayılanına geçer; kullanıcı seçimi korunur.
      hatirlatmalar:
        o.hatirlatmalar.join() === varsayilanHatirlatmalar(!tumGun).join()
          ? varsayilanHatirlatmalar(tumGun)
          : o.hatirlatmalar,
    }));

  const girdi = () => ({
    baslik: f.baslik,
    aciklama: f.aciklama,
    konum: f.konum,
    kategori: f.kategori,
    tumGun: f.tumGun,
    baslangicGun: f.baslangicGun,
    baslangicSaat: f.baslangicSaat,
    bitisGun: f.bitisGun,
    bitisSaat: f.bitisSaat,
    tekrar: { ...f.tekrar, gunler: [...f.tekrar.gunler] },
    hatirlatmalar: f.hatirlatmalar,
  });

  const gonder = async (veri: unknown, k: TakvimKapsami) => {
    setBekliyor(true);
    setGenelHata(null);
    try {
      const sonuc = await kaydet(veri, k);
      if (!sonuc.ok) {
        setHatalar(sonuc.error.fields ?? {});
        setGenelHata(sonuc.error.message);
        setKapsamAdimi(null);
      }
    } catch {
      setGenelHata('Kaydedilemedi — bağlantı kurulamadı. Yeniden dene.');
    } finally {
      setBekliyor(false);
    }
  };

  const onayla = (e: FormEvent) => {
    e.preventDefault();
    const veri = girdi();
    const sonuc = takvimEtkinligiSchema.safeParse(veri);
    if (!sonuc.success) {
      const yeni: Record<string, string> = {};
      for (const issue of sonuc.error.issues) {
        const anahtar = issue.path.map(String).join('.');
        yeni[anahtar] ??= issue.message;
      }
      setHatalar(yeni);
      setGenelHata('Formda düzeltilecek alanlar var.');
      return;
    }
    setHatalar({});
    if (seriTekrarli) {
      // Tekrar kuralı değiştiyse "yalnızca bu" anlamsız: tek oluşumun kuralı olmaz.
      const kuralAyni = JSON.stringify(f.tekrar) === JSON.stringify(ilk.tekrar);
      setKapsam(kuralAyni ? 'tek' : 'sonraki');
      setKapsamAdimi(veri);
      return;
    }
    void gonder(veri, 'tum');
  };

  if (kapsamAdimi !== null) {
    const kuralAyni = JSON.stringify(f.tekrar) === JSON.stringify(ilk.tekrar);
    return (
      <KapsamSecici
        baslik="Tekrarlayan etkinliği düzenle"
        secenekler={kuralAyni ? ['tek', 'sonraki', 'tum'] : ['sonraki', 'tum']}
        secili={kapsam}
        sec={setKapsam}
        bekliyor={bekliyor}
        hata={genelHata}
        onayMetni="Kaydet"
        onayla={() => void gonder(kapsamAdimi, kapsam)}
        vazgec={() => setKapsamAdimi(null)}
      />
    );
  }

  const tekrarSecimi: TekrarSecimi = ozel ? 'OZEL' : secimi(f.tekrar, f.baslangicGun);
  const hataAlani = (anahtar: string) =>
    hatalar[anahtar] ? (
      <FormError id={alan(`${anahtar}-hata`)}>{hatalar[anahtar]}</FormError>
    ) : null;
  const hataBagi = (anahtar: string) =>
    hatalar[anahtar] ? { 'aria-invalid': true, 'aria-describedby': alan(`${anahtar}-hata`) } : {};

  const secenekler = (f.tumGun ? TUM_GUN_SECENEKLERI : SAATLI_SECENEKLER).filter(
    (dk) => !f.hatirlatmalar.includes(dk),
  );
  const hatirlatmaEkle = (dk: number) =>
    guncelle({ hatirlatmalar: [...new Set([...f.hatirlatmalar, dk])].sort((a, b) => a - b) });
  const ozelHatirlatmaDk = Number(ozelSayi) * ozelBirim;
  const ozelGecerli =
    Number.isInteger(Number(ozelSayi)) &&
    Number(ozelSayi) >= 0 &&
    ozelSayi !== '' &&
    ozelHatirlatmaDk <= EN_UZUN_HATIRLATMA_DK;

  return (
    <form onSubmit={onayla} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={alan('baslik')} required>
          Başlık
        </Label>
        <Input
          id={alan('baslik')}
          ref={baslikRef}
          data-ilk-odak
          value={f.baslik}
          maxLength={120}
          autoComplete="off"
          placeholder="Örn. Diş hekimi"
          onChange={(e) => guncelle({ baslik: e.target.value })}
          {...hataBagi('baslik')}
        />
        {hataAlani('baslik')}
      </div>

      <label className="text-body flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
        Tüm gün
        <input
          type="checkbox"
          role="switch"
          checked={f.tumGun}
          onChange={(e) => tumGunDegistir(e.target.checked)}
          className="accent-accent size-5"
        />
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1.5">
        <Label htmlFor={alan('baslangicGun')} className="col-span-2">
          Başlangıç
        </Label>
        <Input
          id={alan('baslangicGun')}
          type="date"
          value={f.baslangicGun}
          onChange={(e) => baslangiciDegistir(e.target.value, f.baslangicSaat)}
          className={cn(f.tumGun && 'col-span-2')}
          {...hataBagi('baslangicGun')}
        />
        {!f.tumGun && (
          <Input
            type="time"
            aria-label="Başlangıç saati"
            value={f.baslangicSaat}
            onChange={(e) => e.target.value && baslangiciDegistir(f.baslangicGun, e.target.value)}
            className="w-36"
            {...hataBagi('baslangicSaat')}
          />
        )}
        <div className="col-span-2">
          {hataAlani('baslangicGun')}
          {hataAlani('baslangicSaat')}
        </div>

        <Label htmlFor={alan('bitisGun')} className="col-span-2">
          Bitiş
        </Label>
        <Input
          id={alan('bitisGun')}
          type="date"
          value={f.bitisGun}
          min={f.baslangicGun}
          onChange={(e) => e.target.value && guncelle({ bitisGun: e.target.value })}
          className={cn(f.tumGun && 'col-span-2')}
          {...hataBagi('bitisGun')}
        />
        {!f.tumGun && (
          <Input
            type="time"
            aria-label="Bitiş saati"
            value={f.bitisSaat}
            onChange={(e) => e.target.value && guncelle({ bitisSaat: e.target.value })}
            className="w-36"
            {...hataBagi('bitisSaat')}
          />
        )}
        <div className="col-span-2">
          {hataAlani('bitisGun')}
          {hataAlani('bitisSaat')}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={alan('tekrar')}>Tekrar</Label>
        <select
          id={alan('tekrar')}
          value={tekrarSecimi}
          onChange={(e) => {
            const s = e.target.value as TekrarSecimi;
            if (s === 'OZEL') {
              setOzel(true);
              if (f.tekrar.tur === 'YOK')
                guncelle({ tekrar: secimdenKural('HAFTALIK', f.baslangicGun) });
              return;
            }
            setOzel(false);
            guncelle({ tekrar: secimdenKural(s, f.baslangicGun) });
          }}
          className={SECIM}
        >
          <option value="YOK">Tekrar etmez</option>
          <option value="GUNLUK">Her gün</option>
          <option value="HAFTALIK">Her hafta {GUN_ADLARI[haftaninGunu(f.baslangicGun) - 1]}</option>
          <option value="HAFTA_ICI">Hafta içi her gün (Pzt–Cum)</option>
          <option value="AYLIK">Her ay {ayinGunuMetni(Number(f.baslangicGun.slice(8, 10)))}</option>
          <option value="YILLIK">Her yıl {gunAyMetni(f.baslangicGun)}</option>
          <option value="OZEL">Özel…</option>
        </select>
        {tekrarSecimi === 'OZEL' && (
          <OzelTekrar
            kimlik={kimlik}
            kural={f.tekrar}
            baslangicGun={f.baslangicGun}
            degistir={(tekrar) => guncelle({ tekrar })}
            hatalar={hatalar}
          />
        )}
        {hataAlani('tekrar.aralik')}
        {hataAlani('tekrar.sayi')}
        {hataAlani('tekrar.bitisGun')}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-primary mb-1.5 text-sm font-medium">Kategori</legend>
        <div role="radiogroup" aria-label="Kategori" className="flex flex-wrap gap-2">
          {KATEGORI_SIRASI.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={f.kategori === k}
              onClick={() => guncelle({ kategori: k })}
              className={cn(
                'focus-ring flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
                f.kategori === k
                  ? 'border-accent bg-accent/12 text-primary font-medium'
                  : 'border-line bg-elevated text-body',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-2.5 rounded-full', TAKVIM_KATEGORILERI[k].nokta)}
              />
              {TAKVIM_KATEGORILERI[k].ad}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-primary mb-1.5 text-sm font-medium">Hatırlatmalar</legend>
        {f.hatirlatmalar.length === 0 && (
          <p className="text-muted text-sm">Hatırlatma yok — bildirim gelmez.</p>
        )}
        <ul className="flex flex-col gap-1.5">
          {f.hatirlatmalar.map((dk) => {
            const ad = hatirlatmaEtiketi(dk, f.tumGun);
            return (
              <li
                key={dk}
                className="bg-elevated flex min-h-11 items-center gap-2 rounded-xl pr-1 pl-3 text-sm"
              >
                <Bell className="text-muted size-4 shrink-0" aria-hidden="true" />
                <span className="text-body flex-1">{ad}</span>
                <button
                  type="button"
                  aria-label={`${ad} hatırlatmasını kaldır`}
                  onClick={() =>
                    guncelle({ hatirlatmalar: f.hatirlatmalar.filter((x) => x !== dk) })
                  }
                  className="focus-ring text-muted hover:text-danger flex size-9 items-center justify-center rounded-full"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        {f.hatirlatmalar.length < EN_COK_HATIRLATMA && (
          <div className="flex flex-col gap-2">
            <select
              aria-label="Hatırlatma ekle"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'ozel') {
                  setOzelSayi(f.tumGun ? '3' : '45');
                  setOzelBirim(f.tumGun ? 1440 : 1);
                } else if (v) hatirlatmaEkle(Number(v));
              }}
              className={SECIM}
            >
              <option value="">+ Hatırlatma ekle</option>
              {secenekler.map((dk) => (
                <option key={dk} value={dk}>
                  {hatirlatmaEtiketi(dk, f.tumGun)}
                </option>
              ))}
              <option value="ozel">Özel…</option>
            </select>
            {ozelSayi !== '' && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label="Özel hatırlatma süresi"
                  value={ozelSayi}
                  onChange={(e) => setOzelSayi(e.target.value)}
                  className="w-20"
                />
                <select
                  aria-label="Birim"
                  value={ozelBirim}
                  onChange={(e) => setOzelBirim(Number(e.target.value))}
                  className={cn(SECIM, 'w-auto flex-1')}
                >
                  {OZEL_BIRIMLER.map((b) => (
                    <option key={b.dk} value={b.dk}>
                      {b.ad} önce
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!ozelGecerli}
                  onClick={() => {
                    hatirlatmaEkle(ozelHatirlatmaDk);
                    setOzelSayi('');
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Ekle
                </Button>
              </div>
            )}
          </div>
        )}
        {hataAlani('hatirlatmalar')}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={alan('konum')}>Konum</Label>
        <Input
          id={alan('konum')}
          value={f.konum}
          maxLength={200}
          placeholder="İsteğe bağlı"
          onChange={(e) => guncelle({ konum: e.target.value })}
          {...hataBagi('konum')}
        />
        {hataAlani('konum')}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={alan('aciklama')}>Açıklama</Label>
        <Textarea
          id={alan('aciklama')}
          rows={3}
          value={f.aciklama}
          maxLength={2000}
          placeholder="İsteğe bağlı"
          onChange={(e) => guncelle({ aciklama: e.target.value })}
          {...hataBagi('aciklama')}
        />
        {hataAlani('aciklama')}
      </div>

      {genelHata && <FormAlert>{genelHata}</FormAlert>}
      <div className="flex gap-2">
        <Button type="submit" disabled={bekliyor} className="flex-1">
          {bekliyor && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
        <Button type="button" variant="secondary" onClick={vazgec}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

const SECIM =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3 text-sm';

function OzelTekrar({
  kimlik,
  kural,
  baslangicGun,
  degistir,
  hatalar,
}: {
  kimlik: string;
  kural: TekrarKurali;
  baslangicGun: AppDay;
  degistir: (k: TekrarKurali) => void;
  hatalar: Record<string, string>;
}) {
  const bitis: 'hic' | 'tarih' | 'sayi' =
    kural.sayi !== null ? 'sayi' : kural.bitisGun !== null ? 'tarih' : 'hic';
  const gunler = kural.gunler.length > 0 ? kural.gunler : [haftaninGunu(baslangicGun)];

  return (
    <div className="border-line flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-body">Her</span>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          aria-label="Tekrar aralığı"
          value={kural.aralik}
          onChange={(e) =>
            degistir({ ...kural, aralik: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
          }
          className="w-20"
          aria-invalid={Boolean(hatalar['tekrar.aralik'])}
        />
        <select
          aria-label="Tekrar birimi"
          value={kural.tur}
          onChange={(e) => {
            const tur = e.target.value as TekrarKurali['tur'];
            degistir({ ...kural, tur, gunler: tur === 'HAFTALIK' ? gunler : [] });
          }}
          className={cn(SECIM, 'w-auto flex-1')}
        >
          {TEKRAR_BIRIMLERI.map((b) => (
            <option key={b.tur} value={b.tur}>
              {b.ad} bir
            </option>
          ))}
        </select>
      </div>

      {kural.tur === 'HAFTALIK' && (
        <div role="group" aria-label="Tekrar günleri" className="grid grid-cols-7 gap-1">
          {GUN_KISA.map((ad, i) => {
            const gun = i + 1;
            const secili = gunler.includes(gun);
            return (
              <button
                key={ad}
                type="button"
                aria-pressed={secili}
                aria-label={GUN_ADLARI[i]}
                onClick={() => {
                  const yeni = secili ? gunler.filter((g) => g !== gun) : [...gunler, gun];
                  if (yeni.length > 0) degistir({ ...kural, gunler: yeni.sort((a, b) => a - b) });
                }}
                className={cn(
                  'focus-ring min-h-10 rounded-full text-xs font-medium',
                  secili ? 'bg-accent text-white' : 'bg-elevated text-body',
                )}
              >
                {ad}
              </button>
            );
          })}
        </div>
      )}

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="text-primary mb-1 font-medium">Bitiş</legend>
        <Secenek
          ad={`${kimlik}-bitis`}
          secili={bitis === 'hic'}
          sec={() => degistir({ ...kural, bitisGun: null, sayi: null })}
        >
          Hiçbir zaman
        </Secenek>
        <Secenek
          ad={`${kimlik}-bitis`}
          secili={bitis === 'tarih'}
          sec={() => degistir({ ...kural, bitisGun: kural.bitisGun ?? baslangicGun, sayi: null })}
        >
          Tarihte
          <Input
            type="date"
            aria-label="Tekrar bitiş tarihi"
            value={kural.bitisGun ?? ''}
            min={baslangicGun}
            disabled={bitis !== 'tarih'}
            onChange={(e) =>
              e.target.value && degistir({ ...kural, bitisGun: e.target.value, sayi: null })
            }
            className="ml-auto w-40"
          />
        </Secenek>
        <Secenek
          ad={`${kimlik}-bitis`}
          secili={bitis === 'sayi'}
          sec={() => degistir({ ...kural, sayi: kural.sayi ?? 10, bitisGun: null })}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={730}
            aria-label="Tekrar sayısı"
            value={kural.sayi ?? ''}
            disabled={bitis !== 'sayi'}
            onChange={(e) =>
              degistir({
                ...kural,
                sayi: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                bitisGun: null,
              })
            }
            className="w-20"
          />
          kez
        </Secenek>
      </fieldset>
    </div>
  );
}

function Secenek({
  ad,
  secili,
  sec,
  children,
}: {
  ad: string;
  secili: boolean;
  sec: () => void;
  children: ReactNode;
}) {
  return (
    <label className="text-body flex min-h-11 items-center gap-2">
      <input
        type="radio"
        name={ad}
        checked={secili}
        onChange={sec}
        className="accent-accent size-4"
      />
      {children}
    </label>
  );
}

const KAPSAM_ADLARI: Record<TakvimKapsami, string> = {
  tek: 'Yalnızca bu etkinlik',
  sonraki: 'Bu ve sonraki etkinlikler',
  tum: 'Tüm etkinlikler',
};

/** Tekrarlayan etkinlikte düzenleme/silme kapsamı — tarayıcı `confirm`ü yerine. */
export function KapsamSecici({
  baslik,
  secenekler,
  secili,
  sec,
  bekliyor,
  hata,
  onayMetni,
  tehlikeli = false,
  onayla,
  vazgec,
}: {
  baslik: string;
  secenekler: readonly TakvimKapsami[];
  secili: TakvimKapsami;
  sec: (k: TakvimKapsami) => void;
  bekliyor: boolean;
  hata: string | null;
  onayMetni: string;
  tehlikeli?: boolean;
  onayla: () => void;
  vazgec: () => void;
}) {
  const ad = useId();
  const ilkRef = useRef<HTMLInputElement>(null);
  useEffect(() => ilkRef.current?.focus(), []);
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1">
        <legend className="text-primary mb-2 text-base font-medium">{baslik}</legend>
        {secenekler.map((k, i) => (
          <label key={k} className="text-body flex min-h-11 items-center gap-3 text-sm">
            <input
              type="radio"
              name={ad}
              checked={secili === k}
              onChange={() => sec(k)}
              ref={i === 0 ? ilkRef : undefined}
              className="accent-accent size-4"
            />
            {KAPSAM_ADLARI[k]}
          </label>
        ))}
      </fieldset>
      {hata && <FormAlert>{hata}</FormAlert>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={tehlikeli ? 'danger' : 'primary'}
          disabled={bekliyor}
          onClick={onayla}
          className="flex-1"
        >
          {bekliyor && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {onayMetni}
        </Button>
        <Button type="button" variant="secondary" onClick={vazgec}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
