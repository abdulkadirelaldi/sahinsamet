# Fontlar — ADR-031

Üç aile repoda tutuluyor. Derleme fonts.gstatic.com'a **çıkmaz**; `next/font/google`
derleme anında ağa gittiği ve CI'ı iki kez düşürdüğü için (koşu 31909914487)
`next/font/local`'a geçildi.

| Dosya                  | Aile                    | Ağırlık ekseni | Boyut   |
| ---------------------- | ----------------------- | -------------- | ------- |
| `space-grotesk.woff2`  | Space Grotesk           | 600–700        | 35.2 kB |
| `inter.woff2`          | Inter (opsz 14'e sabit) | 400–600        | 94.4 kB |
| `jetbrains-mono.woff2` | JetBrains Mono          | 400–500        | 33.8 kB |

Üçü de **değişken** kaldı: tek dosya bütün ağırlıkları karşılıyor. Sabit
ağırlıklara ayırmak yedi dosya ve 275 kB ederdi (ölçüldü); Google'ın altkümeli
sürümü altı dosya ve 218 kB idi.

## Kapsam

**ADR-045 ile daraltıldı (2026-10-21):** Latin-1 + Latin Genişletilmiş-A
(ğ ş ı İ dahil tüm Türkçe ve Avrupa dillerinin çoğu) + noktalama, oklar, para
birimi ve içerikte geçen birkaç teknik işaret (≈ Ω µ ↔). Önceki `latin-ext`
birleşiminin büyük kısmı (Genişletilmiş-B, Vietnamca, IPA) sitede hiç geçmiyordu.
OpenType özellikleri de yalnızca dizgi için gerekenlere indi (stil alternatifleri
atıldı). Ölçüm — mobil Lighthouse, LCP benzetimi ilk yükte istenen her baytı
sayıyor:

| Dosya                  | Önce    | Sonra   |
| ---------------------- | ------- | ------- |
| `inter.woff2`          | 94.4 kB | 37.3 kB |
| `space-grotesk.woff2`  | 35.2 kB | 24.4 kB |
| `jetbrains-mono.woff2` | 33.8 kB | 30.9 kB |

Türkçe harflerin hiçbiri pazarlık konusu değil: `uret.py` üretimden sonra
kapsamı **doğrular** — biri düşerse hata verir. (JetBrains Mono'da `₺` glifi
fontun kendisinde yok; altkümeyle ilgisi yok.)

## Yeniden üretme

```
pip install fonttools brotli
cd src/app/fonts
python3 uret.py          # kaynak TTF'leri google/fonts'tan indirir, altkümeler
```

`uret.py` üretimden sonra kapsamı **doğrular**: Türkçe karakterlerden veya
temsili latin-ext karakterlerinden biri eksikse hata verir.

## Lisans

Üçü de SIL Open Font License 1.1. Lisans metinleri bu klasörde:
`inter-OFL.txt`, `space-grotesk-OFL.txt`, `jetbrains-mono-OFL.txt`.
Kaynak: <https://github.com/google/fonts>.
