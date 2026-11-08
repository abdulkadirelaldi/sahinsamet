'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from 'react';

import {
  BIRIM_ADI,
  HESAP_TURU,
  SIKLIK,
  tutarHatasi,
  tutarOku,
  miktarBicim,
  tutarYaz,
} from '@/components/panel/cuzdan-bicim';
import { istanbulGunu } from '@/components/panel/hizli-kuyruk';
import { Input } from '@/components/ui/input';
import { HARCAMA_KATEGORILERI } from '@/lib/schemas/wallet';
import {
  addDebtPaymentAction,
  archiveWalletAccountAction,
  createWalletAccountAction,
  createWalletDebtAction,
  createWalletTransferAction,
  deleteWalletTransferAction,
  deleteDebtPaymentAction,
  restoreWalletAccountAction,
  sonlandirWalletFlowAction,
  yenidenBaslatWalletFlowAction,
  createWalletFlowAction,
  deleteWalletDebtAction,
  deleteWalletFlowAction,
  updateWalletAccountAction,
  updateWalletDebtAction,
  updateWalletFlowAction,
} from '@/server/actions/cuzdan';
import type { AkisDto, BorcDto, HesapDto } from '@/server/services/cuzdan';
import type { ApiResponse } from '@/types';
import type { WalletAccountKind, WalletFrequency, WalletUnit } from '@/types';
import { cn } from '@/lib/utils/cn';

/**
 * CÜZDAN FORMLARI (2026-10-30) — telefonda tek sütun, büyük alanlar.
 * Tutar alanları metin + `inputMode="decimal"`: "1.250,50" yazılabilir,
 * `tutarOku` sunucu biçimine çevirir; geçersizse alanın altında söylenir.
 */

const BIRIMLER = Object.keys(BIRIM_ADI) as WalletUnit[];

const SECIM =
  'focus-ring rounded-input border-line-strong bg-elevated text-primary h-11 w-full border px-3';

function Alan({
  etiket,
  hata,
  children,
}: {
  etiket: string;
  hata?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-primary text-sm font-medium">{etiket}</span>
      {children}
      {hata && <span className="text-danger text-xs">{hata}</span>}
    </label>
  );
}

function useGonder() {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [alanHatalari, setAlanHatalari] = useState<Record<string, string>>({});
  const [bekliyor, basla] = useTransition();

  const gonder = (
    eylem: () => Promise<ApiResponse<unknown>>,
    sonra: string | null = '/panel/cuzdan',
    basarida?: () => void,
  ) =>
    basla(async () => {
      setHata(null);
      setAlanHatalari({});
      try {
        const sonuc = await eylem();
        if (!sonuc.ok) {
          setHata(sonuc.error.message);
          setAlanHatalari(sonuc.error.fields ?? {});
          return;
        }
        basarida?.();
        if (sonra) router.push(sonra);
        router.refresh();
      } catch {
        setHata('Bağlantı kurulamadı. Yeniden dene.');
      }
    });

  return { hata, alanHatalari, bekliyor, gonder, setHata };
}

function Kaydet({ bekliyor, etiket = 'Kaydet' }: { bekliyor: boolean; etiket?: string }) {
  return (
    <button
      type="submit"
      disabled={bekliyor}
      className="focus-ring bg-accent hover:bg-accent-hover h-12 rounded-full font-semibold text-white transition-colors disabled:opacity-50"
    >
      {bekliyor ? 'Kaydediliyor…' : etiket}
    </button>
  );
}

/** İki dokunuşla silme/arşivleme — yanlış dokunuşa karşı. */
function SilDugmesi({
  etiket,
  onSil,
  bekliyor,
}: {
  etiket: string;
  onSil: () => void;
  bekliyor: boolean;
}) {
  const [onay, setOnay] = useState(false);
  // iOS düğmeye odak vermeyebilir: onay yalnızca `onBlur` ile sönmesin.
  useEffect(() => {
    if (!onay) return;
    const t = setTimeout(() => setOnay(false), 5000);
    return () => clearTimeout(t);
  }, [onay]);
  return (
    <button
      type="button"
      disabled={bekliyor}
      onClick={() => (onay ? onSil() : setOnay(true))}
      onBlur={() => setOnay(false)}
      className={cn(
        'focus-ring flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium',
        onay ? 'border-danger bg-danger text-white' : 'border-line text-danger',
      )}
    >
      <Trash2 className="size-4" aria-hidden="true" />
      {onay ? `${etiket} — emin misin? Tekrar dokun` : etiket}
    </button>
  );
}

/* ===========================================================================
 * HESAP
 * ======================================================================== */

export function HesapFormu({ hesap }: { hesap?: Omit<HesapDto, 'tl'> }) {
  const { hata, alanHatalari, bekliyor, gonder, setHata } = useGonder();
  const [ad, setAd] = useState(hesap?.name ?? '');
  const [tur, setTur] = useState<WalletAccountKind>(hesap?.kind ?? 'BANK');
  const [birim, setBirim] = useState<WalletUnit>(hesap?.unit ?? 'TRY');
  const [bakiye, setBakiye] = useState(hesap ? tutarYaz(hesap.balance) : '');

  const kaydet = (o: FormEvent) => {
    o.preventDefault();
    const balance = tutarOku(bakiye || '0', birim);
    if (balance === null) return setHata(tutarHatasi(birim));
    gonder(() =>
      hesap
        ? updateWalletAccountAction({
            id: hesap.id,
            name: ad,
            kind: tur,
            // Bakiye yalnızca değiştiyse: form açıkken yapılan ödemenin üstüne yazılmasın.
            ...(balance !== hesap.balance ? { balance } : {}),
            ...(birim !== hesap.unit ? { unit: birim } : {}),
          })
        : createWalletAccountAction({ name: ad, kind: tur, unit: birim, balance }),
    );
  };

  return (
    <form onSubmit={kaydet} className="flex flex-col gap-4">
      <Alan etiket="Ad" hata={alanHatalari.name}>
        <Input
          value={ad}
          onChange={(o) => setAd(o.target.value)}
          placeholder="Ziraat, kasadaki altın…"
          required
        />
      </Alan>
      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="Tür">
          <select
            value={tur}
            onChange={(o) => setTur(o.target.value as WalletAccountKind)}
            className={SECIM}
          >
            {(Object.keys(HESAP_TURU) as WalletAccountKind[]).map((k) => (
              <option key={k} value={k}>
                {HESAP_TURU[k]}
              </option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Birim">
          <select
            value={birim}
            onChange={(o) => setBirim(o.target.value as WalletUnit)}
            className={SECIM}
          >
            {BIRIMLER.map((b) => (
              <option key={b} value={b}>
                {BIRIM_ADI[b]}
              </option>
            ))}
          </select>
        </Alan>
      </div>
      {hesap && birim !== hesap.unit && (
        <p role="status" className="text-warning -mt-2 text-xs">
          Birim değişir ama miktar çevrilmez: yanlış birimi düzeltmek içindir. Miktarı kontrol et.
        </p>
      )}
      <Alan
        etiket={birim === 'TRY' ? 'Bakiye (₺)' : `Miktar (${BIRIM_ADI[birim]})`}
        hata={alanHatalari.balance}
      >
        <Input
          value={bakiye}
          onChange={(o) => setBakiye(o.target.value)}
          inputMode="decimal"
          placeholder="0"
        />
      </Alan>
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
      <Kaydet bekliyor={bekliyor} />
      {hesap && (
        <SilDugmesi
          etiket="Hesabı kaldır"
          bekliyor={bekliyor}
          onSil={() => gonder(() => archiveWalletAccountAction({ id: hesap.id }))}
        />
      )}
    </form>
  );
}

/* ===========================================================================
 * BORÇ
 * ======================================================================== */

export function BorcFormu({
  borc,
  odemesiVar = false,
}: {
  /** Ödemesi olan borç silinmez, kapatılır. */
  odemesiVar?: boolean;
  borc?: Omit<BorcDto, 'kalanTl' | 'taksitTl'>;
}) {
  const { hata, alanHatalari, bekliyor, gonder, setHata } = useGonder();
  const [ad, setAd] = useState(borc?.name ?? '');
  const [kime, setKime] = useState(borc?.lender ?? '');
  const [birim, setBirim] = useState<WalletUnit>(borc?.unit ?? 'TRY');
  const [toplam, setToplam] = useState(borc ? tutarYaz(borc.totalAmount) : '');
  const [kalan, setKalan] = useState(borc ? tutarYaz(borc.remainingAmount) : '');
  const [taksit, setTaksit] = useState(borc?.monthlyPayment ? tutarYaz(borc.monthlyPayment) : '');
  const [gun, setGun] = useState(borc?.paymentDay ? String(borc.paymentDay) : '');
  const [bitis, setBitis] = useState(borc?.endDate ?? '');

  const kaydet = (o: FormEvent) => {
    o.preventDefault();
    const remainingAmount = tutarOku(kalan || toplam, birim);
    const totalAmount = tutarOku(toplam || kalan, birim);
    const monthlyPayment = taksit ? tutarOku(taksit, birim) : undefined;
    if (!remainingAmount || !totalAmount || monthlyPayment === null) {
      return setHata(tutarHatasi(birim));
    }
    const paymentDay = gun ? Number(gun) : undefined;
    gonder(
      () =>
        borc
          ? updateWalletDebtAction({
              id: borc.id,
              name: ad,
              lender: kime || null,
              totalAmount,
              remainingAmount,
              monthlyPayment: monthlyPayment ?? null,
              paymentDay: paymentDay ?? null,
              endDate: bitis || null,
            })
          : createWalletDebtAction({
              name: ad,
              lender: kime || undefined,
              unit: birim,
              totalAmount,
              remainingAmount,
              ...(monthlyPayment ? { monthlyPayment } : {}),
              ...(paymentDay ? { paymentDay } : {}),
              ...(bitis ? { endDate: bitis } : {}),
            }),
      borc ? `/panel/cuzdan/borc/${borc.id}` : '/panel/cuzdan',
    );
  };

  return (
    <form onSubmit={kaydet} className="flex flex-col gap-4">
      <Alan etiket="Ad" hata={alanHatalari.name}>
        <Input
          value={ad}
          onChange={(o) => setAd(o.target.value)}
          placeholder="Konut kredisi, altın borcu…"
          required
        />
      </Alan>
      <Alan etiket="Kime (isteğe bağlı)">
        <Input
          value={kime}
          onChange={(o) => setKime(o.target.value)}
          placeholder="Banka ya da kişi"
        />
      </Alan>
      <Alan etiket="Birim">
        <select
          value={birim}
          onChange={(o) => setBirim(o.target.value as WalletUnit)}
          disabled={Boolean(borc)}
          className={SECIM}
        >
          {BIRIMLER.map((b) => (
            <option key={b} value={b}>
              {BIRIM_ADI[b]}
            </option>
          ))}
        </select>
      </Alan>
      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="Toplam borç" hata={alanHatalari.totalAmount}>
          <Input
            value={toplam}
            onChange={(o) => setToplam(o.target.value)}
            inputMode="decimal"
            required
          />
        </Alan>
        <Alan etiket="Kalan (güncel)" hata={alanHatalari.remainingAmount}>
          <Input
            value={kalan}
            onChange={(o) => setKalan(o.target.value)}
            inputMode="decimal"
            placeholder={borc ? '' : 'toplamla aynı'}
          />
        </Alan>
        <Alan etiket="Aylık taksit" hata={alanHatalari.monthlyPayment}>
          <Input
            value={taksit}
            onChange={(o) => setTaksit(o.target.value)}
            inputMode="decimal"
            placeholder="—"
          />
        </Alan>
        <Alan etiket="Ödeme günü" hata={alanHatalari.paymentDay}>
          <Input
            value={gun}
            onChange={(o) => setGun(o.target.value.replace(/\D/g, '').slice(0, 2))}
            inputMode="numeric"
            placeholder="ayın kaçı"
          />
        </Alan>
      </div>
      <Alan etiket="Bitiş tarihi (isteğe bağlı)" hata={alanHatalari.endDate}>
        <Input type="date" value={bitis} onChange={(o) => setBitis(o.target.value)} />
      </Alan>
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
      <Kaydet bekliyor={bekliyor} />
      {borc &&
        (odemesiVar ? (
          <SilDugmesi
            etiket="Borcu kapat"
            bekliyor={bekliyor}
            onSil={() => gonder(() => updateWalletDebtAction({ id: borc.id, isClosed: true }))}
          />
        ) : (
          <SilDugmesi
            etiket="Borcu sil"
            bekliyor={bekliyor}
            onSil={() => gonder(() => deleteWalletDebtAction({ id: borc.id }))}
          />
        ))}
    </form>
  );
}

export function OdemeFormu({
  borcId,
  birim,
  bugun,
  hesaplar,
}: {
  borcId: string;
  birim: WalletUnit;
  bugun: string;
  hesaplar: { id: string; name: string; unit: WalletUnit; balance: string }[];
}) {
  const { hata, bekliyor, gonder, setHata } = useGonder();
  const [tutar, setTutar] = useState('');
  const [tarih, setTarih] = useState(bugun);
  const [hesapId, setHesapId] = useState(
    (hesaplar.find((h) => h.unit === birim) ?? hesaplar[0])?.id ?? '',
  );
  const [hesapTutari, setHesapTutari] = useState('');
  const seciliHesap = hesaplar.find((h) => h.id === hesapId);
  const farkliBirim = seciliHesap && seciliHesap.unit !== birim ? seciliHesap.unit : null;

  const kaydet = (o: FormEvent) => {
    o.preventDefault();
    const amount = tutarOku(tutar, birim);
    if (!amount || Number(amount) <= 0) return setHata(tutarHatasi(birim));
    const hesapTutar = farkliBirim ? tutarOku(hesapTutari, farkliBirim) : null;
    if (farkliBirim && (!hesapTutar || Number(hesapTutar) <= 0)) {
      return setHata(`Hesaptan çıkan tutarı yaz (${BIRIM_ADI[farkliBirim]}).`);
    }
    gonder(
      () =>
        addDebtPaymentAction({
          debtId: borcId,
          date: tarih,
          amount,
          ...(hesapId ? { hesapId } : {}),
          ...(hesapTutar ? { hesapTutar } : {}),
        }),
      null,
      () => {
        setTutar('');
        setHesapTutari('');
      },
    );
  };

  return (
    <form
      onSubmit={kaydet}
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <span className="text-primary font-semibold">Ödeme yap</span>
      <div className="grid grid-cols-2 gap-3">
        <Alan etiket={birim === 'TRY' ? 'Tutar (₺)' : `Miktar (${BIRIM_ADI[birim]})`}>
          <Input
            value={tutar}
            onChange={(o) => setTutar(o.target.value)}
            inputMode="decimal"
            required
          />
        </Alan>
        <Alan etiket="Tarih">
          <Input type="date" value={tarih} onChange={(o) => setTarih(o.target.value)} required />
        </Alan>
      </div>
      {hesaplar.length > 0 && (
        <Alan etiket="Düşülecek hesap">
          <select value={hesapId} onChange={(o) => setHesapId(o.target.value)} className={SECIM}>
            {hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} · {miktarBicim(h.balance, h.unit)}
              </option>
            ))}
            <option value="">Hesaptan düşme</option>
          </select>
        </Alan>
      )}
      {farkliBirim && (
        <Alan etiket={`Hesaptan çıkan tutar (${BIRIM_ADI[farkliBirim]})`}>
          <Input
            value={hesapTutari}
            onChange={(o) => setHesapTutari(o.target.value)}
            inputMode="decimal"
            required
          />
        </Alan>
      )}
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
      <Kaydet bekliyor={bekliyor} etiket="Ödemeyi kaydet" />
    </form>
  );
}

/** Ödeme satırındaki silme: hesaba iade edilir, kalan borç geri eklenir. */
export function OdemeSilDugmesi({ odemeId }: { odemeId: string }) {
  const { hata, bekliyor, gonder } = useGonder();
  return (
    <div className="flex flex-col items-end gap-1">
      <SilDugmesi
        etiket="Sil"
        bekliyor={bekliyor}
        onSil={() => gonder(() => deleteDebtPaymentAction({ id: odemeId }), null)}
      />
      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </div>
  );
}

/** Hesaplar arası transfer: yalnızca aynı birimdeki hesaba. */
export function TransferFormu({
  hesaplar,
  bugun,
}: {
  hesaplar: { id: string; name: string; unit: WalletUnit; balance: string }[];
  bugun: string;
}) {
  const { hata, alanHatalari, bekliyor, gonder, setHata } = useGonder();
  const [kaynak, setKaynak] = useState(hesaplar[0]?.id ?? '');
  const kaynakHesap = hesaplar.find((h) => h.id === kaynak);
  const hedefler = hesaplar.filter((h) => h.unit === kaynakHesap?.unit && h.id !== kaynak);
  const [hedef, setHedef] = useState('');
  const [tutar, setTutar] = useState('');
  const [tarih, setTarih] = useState(bugun);
  const secilenHedef = hedefler.some((h) => h.id === hedef) ? hedef : (hedefler[0]?.id ?? '');

  const kaydet = (o: FormEvent) => {
    o.preventDefault();
    if (!kaynakHesap || !secilenHedef) return setHata('Aynı birimde iki hesap gerekir.');
    const amount = tutarOku(tutar, kaynakHesap.unit);
    if (!amount || Number(amount) <= 0) return setHata(tutarHatasi(kaynakHesap.unit));
    gonder(
      () =>
        createWalletTransferAction({
          kaynakId: kaynak,
          hedefId: secilenHedef,
          amount,
          gun: tarih,
        }),
      null,
      () => setTutar(''),
    );
  };

  return (
    <form
      onSubmit={kaydet}
      className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
    >
      <Alan etiket="Nereden">
        <select value={kaynak} onChange={(o) => setKaynak(o.target.value)} className={SECIM}>
          {hesaplar.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} · {miktarBicim(h.balance, h.unit)}
            </option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Nereye" hata={alanHatalari.hedefId}>
        <select
          value={secilenHedef}
          onChange={(o) => setHedef(o.target.value)}
          className={SECIM}
          disabled={hedefler.length === 0}
        >
          {hedefler.length === 0 && <option value="">Aynı birimde başka hesap yok</option>}
          {hedefler.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} · {miktarBicim(h.balance, h.unit)}
            </option>
          ))}
        </select>
      </Alan>
      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="Tutar" hata={alanHatalari.amount}>
          <Input
            value={tutar}
            onChange={(o) => setTutar(o.target.value)}
            inputMode="decimal"
            required
          />
        </Alan>
        <Alan etiket="Tarih">
          <Input type="date" value={tarih} onChange={(o) => setTarih(o.target.value)} required />
        </Alan>
      </div>
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
      <Kaydet bekliyor={bekliyor} etiket="Aktar" />
    </form>
  );
}

/** Transferi geri alır: para kaynak hesaba döner. */
export function TransferGeriAl({ transferId }: { transferId: string }) {
  const { hata, bekliyor, gonder } = useGonder();
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={bekliyor}
        onClick={() => gonder(() => deleteWalletTransferAction({ id: transferId }), null)}
        className="focus-ring bg-elevated text-body min-h-10 rounded-full px-4 text-sm font-medium disabled:opacity-60"
      >
        Geri al
      </button>
      {hata && (
        <p role="alert" className="text-danger max-w-40 text-right text-xs">
          {hata}
        </p>
      )}
    </div>
  );
}

/** Arşivdeki hesabı geri getirir. */
export function HesapGeriGetir({ hesapId, ad }: { hesapId: string; ad: string }) {
  const { hata, bekliyor, gonder } = useGonder();
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={bekliyor}
        aria-label={`${ad}: geri getir`}
        onClick={() => gonder(() => restoreWalletAccountAction({ id: hesapId }), null)}
        className="focus-ring bg-elevated text-body min-h-10 rounded-full px-4 text-sm font-medium disabled:opacity-60"
      >
        Geri getir
      </button>
      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </div>
  );
}

/* ===========================================================================
 * GELİR / GİDER
 * ======================================================================== */

export function AkisFormu({
  tur,
  akis,
  hesaplar = [],
}: {
  hesaplar?: { id: string; name: string; unit: WalletUnit; balance: string }[];
  tur: 'INCOME' | 'EXPENSE';
  akis?: Omit<AkisDto, 'aylikTl'>;
}) {
  const { hata, alanHatalari, bekliyor, gonder, setHata } = useGonder();
  const [ad, setAd] = useState(akis?.name ?? '');
  const [karsi, setKarsi] = useState(akis?.counterparty ?? '');
  const [birim, setBirim] = useState<WalletUnit>(akis?.unit ?? 'TRY');
  const [tutar, setTutar] = useState(akis ? tutarYaz(akis.amount) : '');
  const [siklik, setSiklik] = useState<WalletFrequency>(akis?.frequency ?? 'MONTHLY');
  const [gun, setGun] = useState(akis?.day ? String(akis.day) : '');
  const [tarih, setTarih] = useState(akis?.date ?? '');
  const [kategori, setKategori] = useState(akis?.category ?? 'Diğer');
  const [hesapId, setHesapId] = useState(akis?.hesapId ?? '');
  const gelir = tur === 'INCOME';
  const harcama = !gelir && siklik === 'ONCE';
  const uygunHesaplar = hesaplar.filter((h) => h.unit === birim);

  const kaydet = (o: FormEvent) => {
    o.preventDefault();
    const amount = tutarOku(tutar, birim);
    if (!amount) return setHata(tutarHatasi(birim));
    if (siklik === 'ONCE' && !tarih) return setHata('Tek seferlik kayıt için tarih seç.');
    if (siklik === 'WEEKLY' && Number(gun) > 7) {
      return setHata('Haftanın günü 1 (pazartesi) ile 7 (pazar) arasında olmalı.');
    }
    const day = gun ? Number(gun) : undefined;
    const ortak = { name: ad, unit: birim, amount, frequency: siklik };
    const tekSefer = siklik === 'ONCE';
    const secilenHesap = uygunHesaplar.some((h) => h.id === hesapId) ? hesapId : '';
    gonder(() =>
      akis
        ? updateWalletFlowAction({
            id: akis.id,
            ...ortak,
            counterparty: karsi || null,
            day: day ?? null,
            date: tarih || null,
            category: harcama ? kategori : null,
            // Arşivlenmiş hesaba bağlı eski kalemin bağı sessizce kopmasın.
            ...(hesapId && hesapId === akis.hesapId && !secilenHesap
              ? {}
              : { hesapId: tekSefer ? secilenHesap || null : null }),
          })
        : createWalletFlowAction({
            kind: tur,
            ...ortak,
            ...(karsi ? { counterparty: karsi } : {}),
            ...(day ? { day } : {}),
            ...(tarih ? { date: tarih } : {}),
            ...(harcama ? { category: kategori } : {}),
            ...(tekSefer && secilenHesap ? { hesapId: secilenHesap } : {}),
          }),
    );
  };

  return (
    <form onSubmit={kaydet} className="flex flex-col gap-4">
      <Alan etiket="Ad" hata={alanHatalari.name}>
        <Input
          value={ad}
          onChange={(o) => setAd(o.target.value)}
          placeholder={gelir ? 'Maaş, burs, proje…' : 'Kira, telefon, abonelik…'}
          required
        />
      </Alan>
      <Alan etiket={gelir ? 'Kimden' : 'Kime'}>
        <Input
          value={karsi}
          onChange={(o) => setKarsi(o.target.value)}
          placeholder="isteğe bağlı"
        />
      </Alan>
      <div className="grid grid-cols-2 gap-3">
        <Alan etiket="Tutar" hata={alanHatalari.amount}>
          <Input
            value={tutar}
            onChange={(o) => setTutar(o.target.value)}
            inputMode="decimal"
            required
          />
        </Alan>
        <Alan etiket="Birim">
          <select
            value={birim}
            onChange={(o) => setBirim(o.target.value as WalletUnit)}
            className={SECIM}
          >
            {BIRIMLER.map((b) => (
              <option key={b} value={b}>
                {BIRIM_ADI[b]}
              </option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Sıklık">
          <select
            value={siklik}
            onChange={(o) => {
              const yeni = o.target.value as WalletFrequency;
              setSiklik(yeni);
              if (yeni === 'ONCE' && !tarih) setTarih(istanbulGunu());
            }}
            className={SECIM}
          >
            {(Object.keys(SIKLIK) as WalletFrequency[]).map((s) => (
              <option key={s} value={s}>
                {SIKLIK[s]}
              </option>
            ))}
          </select>
        </Alan>
        {siklik === 'MONTHLY' || siklik === 'WEEKLY' ? (
          <Alan
            etiket={siklik === 'WEEKLY' ? 'Haftanın günü (1–7)' : 'Ayın günü'}
            hata={alanHatalari.day}
          >
            <Input
              value={gun}
              onChange={(o) => setGun(o.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
              placeholder="—"
            />
          </Alan>
        ) : (
          <Alan etiket="Tarih">
            <Input
              type="date"
              value={tarih}
              onChange={(o) => setTarih(o.target.value)}
              required={siklik === 'ONCE'}
            />
          </Alan>
        )}
        {harcama && (
          <Alan etiket="Kategori">
            <select
              value={kategori}
              onChange={(o) => setKategori(o.target.value)}
              className={SECIM}
            >
              {[...new Set([...HARCAMA_KATEGORILERI, kategori])].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Alan>
        )}
      </div>
      {siklik === 'ONCE' && uygunHesaplar.length > 0 && (
        <Alan etiket={gelir ? 'Yatan hesap' : 'Düşülecek hesap'}>
          <select value={hesapId} onChange={(o) => setHesapId(o.target.value)} className={SECIM}>
            <option value="">{gelir ? 'Hesaba ekleme' : 'Hesaptan düşme'}</option>
            {uygunHesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} · {miktarBicim(h.balance, h.unit)}
              </option>
            ))}
          </select>
        </Alan>
      )}
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
      <Kaydet bekliyor={bekliyor} />
      {akis && akis.frequency !== 'ONCE' && (
        <button
          type="button"
          disabled={bekliyor}
          onClick={() =>
            gonder(() =>
              akis.isActive
                ? sonlandirWalletFlowAction({ id: akis.id })
                : yenidenBaslatWalletFlowAction({ id: akis.id }),
            )
          }
          className="focus-ring border-line text-body flex h-11 items-center justify-center rounded-full border px-4 text-sm font-medium disabled:opacity-60"
        >
          {akis.isActive ? 'Sonlandır (geçmiş aylar korunur)' : 'Yeniden başlat'}
        </button>
      )}
      {akis && (
        <SilDugmesi
          etiket={gelir ? 'Geliri sil' : 'Gideri sil'}
          bekliyor={bekliyor}
          onSil={() => gonder(() => deleteWalletFlowAction({ id: akis.id }))}
        />
      )}
    </form>
  );
}
