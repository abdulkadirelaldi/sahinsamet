import type { Socials } from '@/lib/schemas';

/**
 * İçerik DTO sözleşmesi — ADR-026 "sözleşme-önce".
 *
 * BU DOSYA FRONTEND'İN TEK KAYNAĞI. T-021'in fixture'ı BU TİPLERDEN TÜRETİLİR;
 * elle yazılmış bir kopya olamaz (ADR-026'nın tek kırılgan noktası bu — fixture
 * tipten saparsa servisler gelince değişim mekanik olmaz).
 *
 * Frontend `import type` kullanmalı: tipler derlemede silinir, sunucu modülleri
 * istemci paketine sızmaz.
 *
 * TASARIM KURALLARI (T-015 konvansiyonu):
 *   - `Decimal` YOK. Bu modellerde para alanı da yok; yine de Prisma satırı
 *     dışarı ham çıkmaz, her servis `toDto()` yazar.
 *   - `@db.Date` alanları `AppDay` (`'YYYY-MM-DD'`) olarak çıkar (ADR-016).
 *   - An bildiren alanlar (`publishedAt`) ISO 8601 dize.
 *   - Kapak/galeri görselleri `AttachmentRefDto` — **`url` YOK** (ADR-018).
 */

/* ===========================================================================
 * ORTAK
 * ======================================================================== */

/**
 * Bir R2 nesnesine referans — ADR-018.
 *
 * `url` ALANI YOKTUR ve gelmeyecektir. §8.11 private bucket + 15 dk imzalı URL
 * istiyor; kalıcı URL ya bayat olurdu ya da bucket'ın public olduğu anlamına
 * gelirdi. Dosyayı sunan `GET /api/v1/dosya/[id]` (ADR-044): adres KİMLİKTEN
 * (`dosyaAdresi`), imzasız ve bayatlamaz — R2'yi sunucu kendi imzasıyla okur.
 *
 * `width`/`height` DTO'da BİLEREK var: Frontend `next/image` ile CLS'i ancak
 * boyutu bilerek önleyebilir (§5.2.3, K1 hedefi CLS < 0.05).
 */
export interface AttachmentRefDto {
  id: string;
  /** R2 nesne anahtarı — yalnızca sunucu kullanır; tarayıcı `dosyaAdresi(id)` görür (ADR-044). */
  key: string;
  mime: string;
  /** Görsel değilse (örn. PDF) `null`. */
  width: number | null;
  height: number | null;
}

/** Sayfalanmış liste sonucu. */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

/* ===========================================================================
 * PROFILE — tekil (ADR-017)
 * ======================================================================== */

export interface ProfileDto {
  id: string;
  headline: string;
  bio: string;
  location: string | null;
  /**
   * `socialsSchema` ile DOĞRULANMIŞ bağlantılar. Sütun serbest `Json`; okuma
   * yolunda şemadan geçmeyen anahtar/değer DÜŞER, public sayfaya ulaşmaz.
   */
  socials: Socials;
  avatar: AttachmentRefDto | null;
}
