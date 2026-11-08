import {
  Activity,
  Dumbbell,
  LayoutDashboard,
  Languages,
  LayoutTemplate,
  Settings,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * PANEL ROTA HARİTASI — §4.2. Menü VE kırıntı yolu (breadcrumb) buradan okur.
 *
 * TEK KAYNAK OLMASI ŞART: etiketler iki yerde yazılsaydı bir gün ayrışır ve
 * menüde "Müşteriler" yazarken kırıntıda "musteriler" görünürdü. Aynı hatayı
 * T-025'te başlık slug'larında yaşadık; oradaki çözüm de tek fonksiyondu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * YENİ ROTA EKLEME KURALI (T-032 sözleşmesi)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. Rota YAZILMADAN ÖNCE buraya `hazir` VERMEDEN eklenir: menüde görünür,
 *    "Yakında" rozeti taşır, tıklanamaz ve ÖN ÇEKİLMEZ. Olmayan bir rotayı
 *    `next/link` önden çekince 404 döner ve konsola hata yazar (T-002b).
 * 2. Sayfa yayına girdiği TURDA `hazir: true` yapılır — sonraki tura bırakılmaz,
 *    çünkü unutulduğunda çalışan bir sayfa menüden erişilemez kalır.
 * 3. Kırıntı yolu ayrıca bir şey istemez: etiket buradan gelir. Rota burada
 *    yoksa kırıntı segmenti olduğu gibi gösterir (uydurma etiket üretmez).
 */

export type PanelRotasi = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Sayfa gerçekten var mı — yalnızca `true` olanlar tıklanır ve ön çekilir. */
  hazir?: boolean;
};

export const PANEL_GRUPLARI: ReadonlyArray<{
  title: string;
  items: readonly PanelRotasi[];
}> = [
  {
    title: 'Kişisel',
    items: [
      { href: '/panel', label: 'Bugün', icon: LayoutDashboard, hazir: true },
      { href: '/panel/cuzdan', label: 'Cüzdan', icon: Wallet, hazir: true },
      { href: '/panel/hayat', label: 'Hayat', icon: Sparkles, hazir: true },
      { href: '/panel/spor', label: 'Spor', icon: Dumbbell, hazir: true },
      { href: '/panel/saglik', label: 'Sağlık', icon: Activity, hazir: true },
    ],
  },
  {
    // Ayrı grup: ilk grup telefondaki alt sekmeler, beşte kalmalı.
    title: 'Gelişim',
    items: [{ href: '/panel/ingilizce', label: 'İngilizce', icon: Languages, hazir: true }],
  },
  {
    title: 'Site',
    items: [{ href: '/panel/icerik/profil', label: 'Profil', icon: UserRound, hazir: true }],
  },
  {
    title: 'Sistem',
    items: [
      { href: '/panel/ayarlar', label: 'Ayarlar', icon: Settings, hazir: true },
      { href: '/panel/desenler', label: 'Desenler', icon: LayoutTemplate, hazir: true },
    ],
  },
] as const;

/**
 * TELEFONDAKİ ALT SEKME ÇUBUĞU (2026-10-29) — panel çoğunlukla iPhone'dan
 * kullanılıyor. Beş kişisel bölüm (iOS'un önerdiği üst sınır); geri kalan her
 * şey üst çubuktaki "Daha" düğmesinin açtığı çekmecede (2026-10-30, Cüzdan
 * gelince altıncı sekme yerine). Masaüstünde bunun yerine yan menü var.
 */
export const ALT_SEKMELER: readonly PanelRotasi[] = PANEL_GRUPLARI[0]!.items;

/**
 * Menüde tanımlı olmayan ama kırıntıda görünen alt yollar.
 *
 * ⚠️ `HAZIR_EK_YOLLAR` ile BİRLİKTE tutulmalı: etiket burada, tıklanabilirlik
 * orada. T-054f'te üç yol oldu ve `rotaHazirMi`nin tek yola sabitlenmiş
 * `=== '/panel/ayarlar/guvenlik'` kontrolü o anda YANLIŞ cevap vermeye başladı —
 * yeni sayfalar yazıldığı hâlde kırıntıda tıklanamıyordu. Küme hâline getirmek,
 * bir sonraki eklemede aynı hatanın tekrarlanmamasını sağlıyor.
 */
const EK_ETIKETLER: Record<string, string> = {
  '/panel/ayarlar/guvenlik': 'Güvenlik',
  '/panel/ayarlar/bildirimler': 'Bildirimler',
  '/panel/ayarlar/hatalar': 'Hatalar',
  '/panel/ayarlar/saglik-baglantisi': 'iPhone sağlık verisi',
  '/panel/ayarlar/sifre': 'Şifre',
  '/panel/ayarlar/denetim': 'Denetim kaydı',
  '/panel/spor/egzersizler': 'Egzersizler',
  '/panel/spor/rekorlar': 'Rekorlar',
  '/panel/spor/program': 'Program',
  '/panel/spor/gelisim': 'Gelişim',
  '/panel/spor/gecmis': 'Geçmiş',
  '/panel/cuzdan/yeni': 'Yeni',
  '/panel/cuzdan/rapor': 'Aylık rapor',
  '/panel/cuzdan/arsiv': 'Arşiv',
  '/panel/cuzdan/ara': 'Ara',
  '/panel/cuzdan/transfer': 'Transfer',
  '/panel/cuzdan/hesap': 'Hesap',
  '/panel/cuzdan/borc': 'Borç',
  '/panel/cuzdan/akis': 'Gelir / gider',
  '/panel/spor/oturum': 'Antrenman',
  '/panel/hayat/aliskanliklar': 'Alışkanlıklar',
  '/panel/hayat/hedefler': 'Hedefler',
  '/panel/hayat/gunluk': 'Günlük',
  '/panel/hayat/rapor': 'Rapor',
  '/panel/haftalik': 'Haftalık özet',
  '/panel/aylik': 'Aylık özet',
  '/panel/ingilizce/ders': 'Ders',
  /* `/panel/icerik` bir sayfa DEĞİL, yalnızca kırıntı yolundaki ara segment. */
  '/panel/icerik': 'İçerik',
};

/** `EK_ETIKETLER` içinden GERÇEKTEN sayfası olanlar — `/panel/icerik` hariç. */
const HAZIR_EK_YOLLAR: ReadonlySet<string> = new Set([
  '/panel/ayarlar/guvenlik',
  '/panel/ayarlar/bildirimler',
  '/panel/ayarlar/hatalar',
  '/panel/ayarlar/saglik-baglantisi',
  '/panel/ayarlar/sifre',
  '/panel/ayarlar/denetim',
  '/panel/spor/egzersizler',
  '/panel/spor/rekorlar',
  '/panel/spor/program',
  '/panel/spor/gelisim',
  '/panel/spor/gecmis',
  '/panel/cuzdan/yeni',
  '/panel/cuzdan/rapor',
  '/panel/cuzdan/arsiv',
  '/panel/cuzdan/ara',
  '/panel/cuzdan/transfer',
  '/panel/hayat/aliskanliklar',
  '/panel/hayat/hedefler',
  '/panel/hayat/gunluk',
  '/panel/hayat/rapor',
  '/panel/haftalik',
  '/panel/aylik',
]);

const ETIKETLER: Record<string, string> = {
  ...Object.fromEntries(PANEL_GRUPLARI.flatMap((g) => g.items.map((i) => [i.href, i.label]))),
  ...EK_ETIKETLER,
};

/**
 * Yol için görünen ad. Kayıt kimliği ("cmt8uw…") kullanıcıya gösterilmez: nötr "Ayrıntı"
 * yazılır, kaydın adını sayfanın başlığı verir. Başka bilinmeyen segment olduğu gibi döner.
 */
export function rotaEtiketi(yol: string): string {
  if (yol in ETIKETLER) return ETIKETLER[yol] as string;
  const son = yol.split('/').pop() ?? yol;
  return /^c[a-z0-9]{20,}$/.test(son) ? 'Ayrıntı' : son;
}

/** Bu yol tıklanabilir mi (sayfa yazıldı mı). */
export function rotaHazirMi(yol: string): boolean {
  if (yol in EK_ETIKETLER) return HAZIR_EK_YOLLAR.has(yol);
  return PANEL_GRUPLARI.some((g) => g.items.some((i) => i.href === yol && i.hazir));
}
