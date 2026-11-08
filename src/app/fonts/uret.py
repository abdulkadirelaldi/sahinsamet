"""Font üretimi — ADR-031. Bu klasördeki .woff2 dosyaları bununla üretildi.

    pip install fonttools brotli
    python3 uret.py

Yaptığı iş: google/fonts deposundaki DEĞİŞKEN kaynakları indirir, ağırlık
eksenini yalnızca kullandığımız aralığa daraltır, `latin` + `latin-ext`
birleşimine indirger ve woff2 yazar. Sonunda kapsamı DOĞRULAR — Türkçe bir
karakter düşerse betik hata verir, sessizce bozuk font üretmez.

Aile başına TEK dosya bilinçli: değişken kaldığı için tek yüz bütün ağırlıkları
karşılıyor (163 kB / 3 istek). Sabit ağırlıklara bölmek 275 kB / 7 istek,
Google'ın altkümeli sürümü 218 kB / 6 istek ederdi.
"""

import os
import subprocess
import sys
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# ---------------------------------------------------------------------------
# ARALIK — ADR-045 ÖLÇÜMÜYLE DARALTILDI (2026-10-21).
#
# Önceki kapsam `next/font/google`'ın `latin` + `latin-ext` birleşimiydi (T-023c).
# `latin-ext`in büyük kısmı Latin Genişletilmiş-B, Ek Latin (Vietnamca),
# IPA uzantıları — bu sitede HİÇ geçmeyen yazı sistemleri. Mobil Lighthouse'ta
# ilk yüklemede istenen her bayt LCP benzetimine yazılıyor; Inter tek başına
# 94 kB'tı.
#
# Yeni kapsam: Latin-1 + Latin Genişletilmiş-A (ğ ş ı İ dahil TÜM Türkçe ve
# Avrupa dillerinin çoğu) + noktalama/oklar/para birimi + içerikte geçen birkaç
# teknik işaret (≈ Ω µ ↔). Ölçüm (Inter): 94 444 → 35 956 bayt.
# ---------------------------------------------------------------------------
ARALIK = (
    "U+0000-00FF,U+0100-017F,U+02C6,U+02DA,U+02DC,U+0304,U+0307,U+0308,U+0327,"
    "U+0394,U+03A9,U+03BC,U+2000-206F,U+20AC,U+20BA,U+2122,U+2190-2199,"
    "U+2212,U+2215,U+2248,U+FEFF,U+FFFD"
)

# OpenType özellikleri — yalnızca METİN DİZGİSİ için gerekenler. Stil
# alternatifleri (ss01…, cv01…) hiç kullanılmıyor ve dosyanın üçte birini
# tutuyordu. `locl` Türkçe i/İ biçimleri, `tnum` sekmeli rakam (§3.2) için.
OZELLIKLER = "kern,liga,calt,ccmp,locl,mark,mkmk,case,tnum"

KAYNAK = "https://raw.githubusercontent.com/google/fonts/main/ofl"

ISLER = [
    ("spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf", "space-grotesk", {"wght": (600, 700)}),
    ("inter/Inter%5Bopsz,wght%5D.ttf", "inter", {"opsz": 14, "wght": (400, 600)}),
    ("jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf", "jetbrains-mono", {"wght": (400, 500)}),
]

# Doğrulama kümeleri: Türkçe harfler + Genişletilmiş-A ve para biriminin temsilcileri.
TURKCE = "ĞğŞşİıÜüÖöÇç"
LATIN_EXT_ORNEK = "ĀŒŹˆ€™Ł"


def uret(yol: str, ad: str, eksenler: dict) -> str:
    ham = f"/tmp/{ad}-kaynak.ttf"
    ara = f"/tmp/{ad}-daraltilmis.ttf"
    hedef = f"{ad}.woff2"

    urllib.request.urlretrieve(f"{KAYNAK}/{yol}", ham)

    font = TTFont(ham)
    instancer.instantiateVariableFont(font, eksenler, inplace=True, updateFontNames=False)
    font.save(ara)

    subprocess.run(
        [
            sys.executable, "-m", "fontTools.subset", ara,
            f"--unicodes={ARALIK}",
            f"--layout-features={OZELLIKLER}",
            "--flavor=woff2",
            "--no-hinting",
            f"--output-file={hedef}",
        ],
        check=True,
    )

    os.remove(ham)
    os.remove(ara)
    return hedef


def dogrula(hedef: str) -> None:
    cmap = TTFont(hedef).getBestCmap()
    eksik = [h for h in TURKCE + LATIN_EXT_ORNEK if ord(h) not in cmap]
    if eksik:
        raise SystemExit(f"{hedef}: KAPSAM EKSİK → {''.join(eksik)}")


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    # `python3 uret.py inter` — yalnızca adı verilen aileler; diğer
    # dosyalar yeniden yazılıp ikili fark üretmesin.
    secilen = set(sys.argv[1:])
    for yol, ad, eksenler in ISLER:
        if secilen and ad not in secilen:
            continue
        hedef = uret(yol, ad, eksenler)
        dogrula(hedef)
        print(f"{hedef:24} {os.path.getsize(hedef):7} bayt  kapsam tamam")
