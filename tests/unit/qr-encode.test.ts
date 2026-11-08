import { describe, expect, it } from 'vitest';

import { encodeQr } from '@/components/auth/qr-encode';

/**
 * QR kodlayıcının KALICI doğrulaması — ADR-024'ün şartı.
 *
 * NEDEN BU DOSYA VAR: kodlayıcı T-036'da bir kütüphane yerine elle yazıldı ve
 * doğruluğu, referans `qrcode` paketiyle 1080 matrislik geçici bir karşılaştırma
 * ile gösterildi. O karşılaştırma silindi — yani bugün hiçbir şeyi garanti
 * etmiyordu. Buradaki vektörler o doğrulamayı tekrarlanabilir hâle getirir.
 *
 * ALTIN VEKTÖRLERİN KAYNAĞI: matrisler `qrcode@1.5.4` REFERANS uygulamasından
 * üretildi, bizim kodlayıcımızdan DEĞİL. Bu bilinçli: kendi çıktımızı mühürleseydik
 * test yalnızca "bugün ne üretiyorsak onu üretmeye devam et" derdi ve mevcut bir
 * hatayı sonsuza kadar doğru sayardı. Referanstan üretilince test STANDARDI mühürler.
 *
 * İKİ REGRESYON ÖZELLİKLE HEDEFLENİYOR (T-036'da bulunan gerçek hatalar):
 *   (a) Biçim bilgisinin birinci kopyası satır 8'e yazılıyordu; sütun 8 olmalı.
 *   (b) Reed–Solomon üreteç polinomunun katsayı sırası tersti; EC kod sözcükleri
 *       sessizce bozuluyordu.
 * İkisi de çıktıyı gözle "geçerli bir QR" gibi bırakıyor ama kod okunamıyor.
 * Bu yüzden gözle kontrol yeterli değildir, matris karşılaştırması şarttır.
 *
 * Vektörler yeniden üretilecekse: referansı geçici bir dizine kurup
 * `QR.create([{ data, mode: 'byte' }], { errorCorrectionLevel: 'M' })` çıktısını
 * satır-major bit dizisi olarak paketleyip base64'e çevir.
 */

type AltinVektor = {
  ad: string;
  girdi: string;
  surum: number;
  boyut: number;
  /** Satır-major bit dizisi, 8'erli paketlenip base64'e çevrilmiş. */
  matris: string;
};

/** Base64 paketli matrisi boolean ızgarasına açar. */
function acMatris(b64: string, boyut: number): boolean[][] {
  const bytes = Buffer.from(b64, 'base64');
  const matris: boolean[][] = [];

  for (let r = 0; r < boyut; r += 1) {
    const satir: boolean[] = [];
    for (let c = 0; c < boyut; c += 1) {
      const index = r * boyut + c;
      satir.push(((bytes[index >>> 3]! >> (7 - (index & 7))) & 1) === 1);
    }
    matris.push(satir);
  }

  return matris;
}

/** İlk farklı modülü insan okunur biçimde bildirir — 2500 elemanlı dizi farkı okunmaz. */
function ilkFark(beklenen: boolean[][], gercek: boolean[][]): string | null {
  for (let r = 0; r < beklenen.length; r += 1) {
    for (let c = 0; c < beklenen.length; c += 1) {
      if (beklenen[r]![c] !== gercek[r]![c]) {
        let toplam = 0;
        for (let i = 0; i < beklenen.length; i += 1) {
          for (let j = 0; j < beklenen.length; j += 1) {
            if (beklenen[i]![j] !== gercek[i]![j]) toplam += 1;
          }
        }
        return `ilk fark (satır ${r}, sütun ${c}): beklenen ${beklenen[r]![c] ? 'koyu' : 'açık'}, üretilen ${gercek[r]![c] ? 'koyu' : 'açık'} — toplam ${toplam} modül farklı`;
      }
    }
  }
  return null;
}

const ALTIN_VEKTORLER: AltinVektor[] = [
  {
    ad: 'kisa ascii',
    girdi: 'HELLO',
    surum: 1,
    boyut: 21,
    matris: '/tP8E1Bunrt1JduorsFZB/qv4B8Ai/fI5cvsrOXIjQLk4wB3L/sxUEMiupOt0MLunPEEjA/o+oA=',
  },
  {
    ad: 'tek karakter',
    girdi: 'x',
    surum: 1,
    boyut: 21,
    matris: '/oP8EpBulrt1ZduursF5B/qv4BsAi5fPgMrg9PnCjU244wBHE/owUEsqurP90MrulPkEzU/q4oA=',
  },
  {
    ad: 'surum 2 (15 bayt)',
    girdi: 'hv3qigc29ufx18y',
    surum: 2,
    boyut: 25,
    matris:
      '/hc/wQ/QbrNLt1hl262a7BWBB/qq/gFVAL44PghrqrTV/K4wrQr9r74lBCqoZadoZgGnkP4AV0c/kapwVbErqL/11APG62ULBOUx/tEngA==',
  },
  {
    ad: 'surum 3 (27 bayt)',
    girdi: '18ydz07tslm6rakn5epjb4wohv3',
    surum: 3,
    boyut: 29,
    matris:
      '/vdD/BY60G61hrt0loXbqlOuwQ8BB/qqr+AHQQCfr9S4zdOvCOabSSmm4bHxYKFYhAFuao1fu5nV5W/RIV0BQsS7n61/4msu76JD+4BGdHv6VmtQU5caus3fldYVYa6OqXcEtirf6G78AA==',
  },
  {
    ad: 'otpauth kisa',
    girdi: 'otpauth://totp/A:b@c.com?secret=JBSWY3DPEHPK3PXP&issuer=A',
    surum: 4,
    boyut: 33,
    matris:
      '/rZkP8EIEhButzFLt0sPVdui1krsFRpFB/qqqv4Al2IAoygaEqTryPIOylXPvoumMZ4wUUuUTSP2jexURxJ7WGRLs92d8hABztggo0//oBtQEqeom1JCKHfUB9lTXiIy10TazuKq+wBW9cT/s9eq8EOmMYujXb+N0JLs7upUaScEsHCo/qEYqoA=',
  },
  {
    ad: 'surum 5 (63 bayt)',
    girdi: '18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3',
    surum: 5,
    boyut: 37,
    matris:
      '/laq6/wRDKOQbqknJrt1n7Wl26r7sq7BbxU9B/qqqq/gFfAkAL5WP+vhpqwgCr7AEuzusKlKSRv77J9+erArpLp9dRHwYIDO5iEGuoRy+kCrdGmE2OwNUyvOfUQ8eD+mftTHSbSKWGyqX2ag8gDi5m8u9r4NXCFJraKLZSNoaQ4sq/7mN/sASm7Ee/gvM6uwXC/xGbr6hN+t1ptX3K6+7REbBLp/HB/tXS5jgA==',
  },
  {
    ad: 'utf8 turkce',
    girdi:
      'otpauth://totp/Panel:ç.ş.ğ@örnek.com?secret=MZXW6YTBOI======&issuer=Işık%20Ağı&digits=6&period=30',
    surum: 6,
    boyut: 41,
    matris:
      '/hg8bT/BHDQdUG6z4Qgrt1x9e6XbqlTSeuwVojTlB/qqqqr+AePvMQC+IZLOPlZyuqeXh6RLvYeTCbfnKKVq2Lf3dMJymT0giOuxYEFCuBRBFJLcfn6VwjwY1J6Lj60/Jjy7JfIdvyMipFCPxGFKfY3pejnw0UtGm1MsYuAwrcnIxsuWnnyXF5cUX4eylUK8+9aO1PSoCLh/spuAGsA5Yp8Vc5u/BGR2+ABLJYfE/5b2nOrQWw/BEZuvKS9PjdUnSUgu6scgZ+EES5AFlv79tvVsAA==',
  },
  {
    ad: 'surum 7 (107 bayt)',
    girdi:
      '9ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc',
    surum: 7,
    boyut: 45,
    matris:
      '/moWHkv8EG0fzpBushgeNLt1FdxCNduuCf87rsFXFEaBB/qqqqqv4BU/HzwAvl0/o2PghKvUVsHDu8FfTdyCSnDH8eanHvVVMMjIbgEs9TzOJ8ydXYTSoZseS1fohzcWDnwgnu/OqCf5C5xRPqs1OcT/P/w2/WRThEWsfauJa1LrxRQRG1kfL/3Px1+HwB3WGojCxDKNTznClv+prvOh4sqQKJZmsW6kr/5ar6r1EjL8G/r9InRt4WOZT7PWMiHCwYDfS2jyfP/dr9mxivpS+ABAVHuMf/j8ahCqEF2TGzEdur3vwz/V1SCW+AdupS19LxUEhjAH6s/qd1t1uQA=',
  },
  {
    ad: 'surum 8 (123 bayt)',
    girdi:
      'hv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18y',
    surum: 8,
    boyut: 49,
    matris:
      '/lkwfKC/wQiLBevQbqjQPyRrt1nkpGul26oL/2lC7BXbUYHRB/qqqqqq/gHttH+kAL5Qi+BJPg4Z+QOgU7PcXNlp8m6beQtQXy3zFXx1jWmBASp866tpE8fgmD7T38pGsnmiEKi2DIIm/YohrByK5R2tg3G7AwSBvo2psEW8dq8tSzAEFmOhf1wvlLvnkV2kVSMTqvFusT2uxHN5HwREk+R2+m/+uaLbGzphAP3WXFPb/uIQ5jBrsUv+L0WKpgsktWhcoiv+OwnzOl7uOM5TogHc17L0CuE4jLf6WCj99+AEmLuqXK06D7kcYggWn+bgctT1BKLi8MvnWf6AfAkXzsa/l+auCarwVLLHtrGbrM8+FJ+l10o73OdK6x5G1bhHBLWPxrLh/s/dlg3HgA==',
  },
  {
    ad: 'otpauth gercek',
    girdi:
      'otpauth://totp/Samet%20%C5%9Eahin%20Ki%C5%9Fisel%20Panel:sahip@ornek.com?secret=JBSWY3DPEHPK3PXP&issuer=Samet%20%C5%9Eahin%20Ki%C5%9Fisel%20Panel&algorithm=SHA1&digits=6&period=30',
    surum: 9,
    boyut: 53,
    matris:
      '/uhZ86vj/BQ0fov1kG6kdULJRLt0Ryc399XbruRv+KIuwTPaxokxB/qqqqqqr+AA2FEA+QCf/HL/f8y9AuOHv518vKfhOdV2sEspOacSrqKxSK3am6xOvVm9RbSE++cZoRMW7J4/XnyiTTrgKAmoR8zPI0pzhb6H1YPKUT16WVGfYowa5G03f2ePvvBz5ivdt7mqqwCDlZZUJd/zWsmL3+fn/ejvwkY1NHxTRRKwtepGQrKxaOkeF5HZ+LUPyqH9etvUXd6S0yuKn1ZqKKaHgbbpVd+6XjIBPdt8bC/Mf/cdKIMHanOwMThorbYq47+yvjoqrbSwlkGh7/rWLZs4xCnaPj2NQ0x8p1cczfeOIE6L+FFdTTw3/iZp5xDKwDx1QE2dcSrwv/Wv/gBRYEcz1Fv7EgqipCrQXukRtDUYuvop+p7v3dTaSb4fge6Ne0sL4GUETtLGVMff7JweaqKqAA==',
  },
  {
    ad: 'surum 10 (181 bayt)',
    girdi:
      'wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4w',
    surum: 10,
    boyut: 57,
    matris:
      '/le7xwh/P8E7QViSqpButZxzFC/Lt1k+pr8sJdurlTvtnhLsFP/fHfBRB/qqqqqqqv4BhAzHo2sAvn9jfgoCPlTu9k+umsBAj9EEBNDay78zMlFZyWru2l7XIVRNCiSE3C5Ovk04rzTIq5Vj7dURoVsem0KSU09zZRS9Le/K1GFL9g0nW/H/0hvpK3DvWdXv5mZnqmUCTVatFr8u/zimFx7DDJBRRYyeyTN8kiZZJh5TIARu21eOtkPL5uyPj+U/XxZd1HQcsd6rNNKnw+qRx+G9EWNkVj9mA/tJa/1L41xpsV7GViHo+WtwXCJ17pGMEFP0yu+fu7mUrb6wr7wTbctvVWY3w0HGYZqegKtIDj+f3I3pWRUTBYEpgHN9755naT1AiTpyFdPINGrC7yk9r0P3DQkjAAK5Ztw/7xbYgWSMZnVlBCWVFp7uVZfbV1Xwru03h+72AvQYPx5A/QB/wdFqOET/kiDawoDq0FBHpFm7Efuo+FvxAV/F1WunWCqAUuv8t0nazlEEqJU/hzQ8/rrzQHxg6QA=',
  },
  {
    ad: 'surum 11 (214 bayt)',
    girdi:
      '8ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29uf',
    surum: 11,
    boyut: 61,
    matris:
      '/ly+Vkl5G/wT8BAdfLrQbrkN3bQrDrt1Y7ubOuPV26gaI/0b1y7BfC5sRrRxB/qqqqqqqq/gHRePEl8PAL5BaM/9QcvmpzWlfCsINjySeEuOw/gvywiRLot6Tyb5YVRf5ymHqi2beM4SIxIstys5/U2Q/6HOSNmoW1J7OmTUEJ0fY28VcTQtQjuztkoaXbfaEhEGQk4hXBEBeQWHUsVZ85jshsFA2KNQ7p0R3JkuwfousUFm+Wnan9im3uoXzTlq5LlJPpa6sd2wHhZpb0/JAhLG6bClkvid9Pz1G/u8bYFUbvTkU2qxaOrOSat3EkrZGpOLE2/leU+YJ6/ibvWVIOdoywzVcjS50J6XA6UtpvjnWDy6dLTg9gsa6g6r8M46yT0KrJxfrAuKSD7iWMJ1JZGb4U+f2Be57iH81kBhpmimgjn+75Dt5okyJZCjWpAZth+B6ccb/+xulfjkloKrqsWA9hWGe/s+JwIoEYAqA1P3VB41v78nljdWS44ZD4X7lo2Vr8fQ49wn4RwJvzGrNfr3H/qARad0QvTsQ/kHkCuoK6vwW2nxEewRGLruSV+2/w+t1tEt1C9AfG6qrhl8ttzTBF3jcYU6Dh/oTg4TxytTgA==',
  },
  {
    ad: 'surum 12 (252 bayt)',
    girdi:
      'qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3',
    surum: 12,
    boyut: 65,
    matris:
      '/jIJJtg1gT/BA+e0RrBqUG6+pogEL8Krt1axfzFK+uXbqyCQPl5JSuwUPktxkJ/xB/qqqqqqqqr+AXVwzGF+EQC+E+vb6lfXPgJrJZBC8ksSTdFjWnyE/1THpxsM0hfhAD8lHJ2QpX174GSRaQAvJLDF2xetochP851gdbDNIX4QA7asWdkKV9e4ZMKLUALySw9vrQlaHIT/OEYB+PzSF+EAt2glhZClfXvgTFn9AC8ksMb6lpGhyE/znWAMvs0hfhALlprIWQpX175cxd9QAvJLDFetSVochP852ALZ7NIX4QC2aCUcEKV9e+VMlXGQLySwxT7y84/IT/P7sR+N7F6F6xpqglHKsp8or1xJVxET5T5EV+8vJPwvQv/bkfjYDBuF7LYgJRjp01hgZSSVchij7vnF7/ry2ApJgnnZkwUAwbheym8mEc69NYYH0qlkMbo+75xf1z+9iKSYB5wp/FQIG4XcpqRHXvHTWHX9KoVwEKPu/HXc++PcCkmHaVEThYBBuF4e61N3z501hsHWyt4Rij7vnE2nw6XApJg3FYjCJCQbheWi8rrC+dNYbD9MNJcYo+75xNhcPlwKSYNxIr4wQkG4XlprMqQr/TWG+4BHgfMaPu/Ef4GFxKikmGsQWdIkRBuF0aurO9M/01hvvdQ4E2yj7v4K6l5YbApJgPUErxFSMGsHuv6zvSstYNYqAA==',
  },
  {
    ad: 'surum 13 (288 bayt)',
    girdi:
      'qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3',
    surum: 13,
    boyut: 69,
    matris:
      '/mayDTV1n3v8Ej0Q89iHxhBuq7YTSr4D+Lt1Xd0ehMsGFduqRM0PxplirsFbkjZFLXJRB/qqqqqqqqqv4BiaZrE1iDwAvnuT/vpz8BPnQxroAgHCGG31oJmKF5u9H4Go4csHKda3V3eooNXvEVgnBHQjejLy+CkUBZ3TIh/7H7M5wZpTEyI1Y+wfO+/XO/wQ5BRXB7bwIodueMJ1kg5Y/2DNCWUbquDonnDbOa45bW7rr3gAcpIRmUKI9GoO11r6Eq86TIns3hEn1uCTjXMeduuSzi1HxndBZ7a8hC+IVMX+jCt+rse5L9yoXZLOC4rTw/fhKT6+QZs1ICqAbxPS1HskRk+VF9L/flSZih3aDyE95Rl+r5NcVfhztx+ExWCLXGuI+ke+rCv/6sX+KrExwc4ZFfUf0e79FKZ/pnA1+DCVyij2NQsGHVpn4pHJdZKRHCaLfps1iz71Btc/npoz4A1HZmjgCcPCGGXhiTuaB4O/HWB7SxMG2ZanNXR4RW/lkVikTF49lNJW6C0FBd0PNp0an7KXx7L8ozO1Y/vPphXZe1YQ5QvWKC3pIKdudkN+528IuODNRBwLNMgq/3DcLOPjvoTpJ3g4iNCIpNK/NGtKFMu4KalETJehxw64Kv+DjXL2or3Tbs1HxmbmY5ZPjeOIVBnrnrqeBMe5qf0CuPKMm5qT4vmik0j/wRs0+ABF45BG0GssT/g9LVa/f9SrkFd1vzE+4RkduobSnPhj1x+V1QfcHCuI+ocuuyt66sH2K9EEtK4dBfYfwc/pUigzpmg08QA=',
  },
  {
    ad: 'surum 14 (332 bayt)',
    girdi:
      'ohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc29ufx18ydz07tslm6rakn5epjb4wohv3qigc',
    surum: 14,
    boyut: 73,
    matris:
      '/jepjwD4iXq/wT8fDF+hu1EQbr/Uk+SqW00Lt1gYomkCr4Vl267bH+kL/Pha7BUszGl6xcdxB/qqqqqqqqqq/gE+sxencZYqAL56q/g6b9JAvn6iIrPIVUix1JGWKs4blFGpun4iF/v49EWuugopHc7xgnVkjviID158qVUfnEjsALxx7UG+HrYBbRjlg3gDZqIC2WAXHG7WCPvyN4zB5F0E4aWR9Wldw3k7IRt0tKh3je7BfvIV7+DBXynzYM5ghc/HdA8VVwvgrrxTR9tj8pfukfFe5UeaF7cDz+qq/zof0Az7rFfrR4JcTGVGLqUD6lrWty3q9RlXEXrTFWsxpv50P5Hg/wafuISSIpRrONPQSxqr49XoSXa6uniaDJOBsWDS8BOjwnt8U96hQ9TXjzXu8Jg822ikquNIgZUJqHiQ1Xr8N507pzo8MW+1pwns/WhiWvjyx3jfmor/5qSy+Elan7PAraDFwRpTuFA+V6bFfXCaSFLOUxw/qPKYPaqA+WHMT5ag0aOxIsGpVhGVvwcC/Swf9IP5pu/yRxc0fAvEW5RKK9VqpfkrFN6jcUuZF+3R0zMTj/DW+jxPssL7Un9ma0Q7SaFoqISW6l+X3e3IuwNafLb6Qa6xGLji8pehWYwS6Qzt3SHyiRaGmcjtrC1kt7Y/6+n9sUK4YAdnMyJYTyBtEjrhroBxmlmuMpzkareo+fUKw1sNSHMd68++HkV62D9xJgClpnOMvuQElsr0C9RDhqNdrRgm+FnWnt4xyyBj50dTuYuKzbf8GB/cRfoAR5vHihRY7ce/nZxqf/K5C6twUCQxPnEXUpGbr64fgcP8Ml+l1FttcGPoT4FG665kgIkNNJ9TBCvZR6cbXynx/r/Y1hxqGsgDgA==',
  },
];

/**
 * Hata düzeltme seviyesi M için 8 geçerli biçim bilgisi dizesi (maske 0–7).
 * Referans uygulamanın çıktısından okundu, ezberden yazılmadı.
 */
const GECERLI_BICIM_DEGERLERI = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
] as const;

/**
 * Biçim bilgisinin BİRİNCİ kopyasını standarttaki konumlardan okur:
 * bitler sütun 8 boyunca yukarıdan aşağı, sonra satır 8 boyunca sağdan sola.
 */
function bicimKopya1(matris: boolean[][]): number {
  const bit = (r: number, c: number) => (matris[r]![c] ? 1 : 0);
  let deger = 0;

  for (let i = 0; i <= 5; i += 1) deger |= bit(i, 8) << i;
  deger |= bit(7, 8) << 6;
  deger |= bit(8, 8) << 7;
  deger |= bit(8, 7) << 8;
  for (let i = 9; i < 15; i += 1) deger |= bit(8, 14 - i) << i;

  return deger;
}

/** İKİNCİ kopya: düşük bitler satır 8'in sağ ucunda, yüksek bitler sütun 8'in altında. */
function bicimKopya2(matris: boolean[][]): number {
  const n = matris.length;
  const bit = (r: number, c: number) => (matris[r]![c] ? 1 : 0);
  let deger = 0;

  for (let i = 0; i < 8; i += 1) deger |= bit(8, n - 1 - i) << i;
  for (let i = 8; i < 15; i += 1) deger |= bit(n - 15 + i, 8) << i;

  return deger;
}

describe('encodeQr — altın vektörler (referans uygulamayla birebir)', () => {
  for (const vektor of ALTIN_VEKTORLER) {
    it(`sürüm ${vektor.surum} · ${vektor.ad}`, () => {
      const uretilen = encodeQr(vektor.girdi);
      const beklenen = acMatris(vektor.matris, vektor.boyut);

      expect(uretilen.length).toBe(vektor.boyut);
      expect(vektor.boyut).toBe(vektor.surum * 4 + 17);

      // Farkı elle bildiriyoruz: `toEqual` 2500 elemanlı iç içe dizi için
      // okunamaz bir çıktı üretiyor.
      expect(ilkFark(beklenen, uretilen)).toBeNull();
    });
  }

  it('sürüm 1–14 aralığının tamamını kapsar', () => {
    const surumler = new Set(ALTIN_VEKTORLER.map((v) => v.surum));
    for (let surum = 1; surum <= 14; surum += 1) {
      expect(surumler.has(surum), `sürüm ${surum} için altın vektör yok`).toBe(true);
    }
  });
});

/**
 * REGRESYON (a) — biçim bilgisi konumu.
 *
 * Birinci kopya yanlışlıkla satır 8'e yazılırsa standarttaki konumlardan okunan
 * değer geçerli 8 diziden hiçbiri olmaz ve iki kopya birbirini tutmaz.
 * Altın vektörler bunu zaten yakalar; bu blok ARIZAYI ADIYLA bildirir.
 */
describe('encodeQr — biçim bilgisi (regresyon: satır/sütun karışması)', () => {
  const girdiler = ALTIN_VEKTORLER.map((v) => v.girdi);

  it('her iki kopya da geçerli bir seviye-M biçim dizesi taşır', () => {
    for (const girdi of girdiler) {
      const matris = encodeQr(girdi);
      const kopya1 = bicimKopya1(matris);
      const kopya2 = bicimKopya2(matris);

      expect(
        GECERLI_BICIM_DEGERLERI,
        `kopya 1 geçersiz: 0x${kopya1.toString(16)} (girdi: ${girdi.slice(0, 24)}…)`,
      ).toContain(kopya1);

      expect(
        GECERLI_BICIM_DEGERLERI,
        `kopya 2 geçersiz: 0x${kopya2.toString(16)} (girdi: ${girdi.slice(0, 24)}…)`,
      ).toContain(kopya2);

      expect(kopya1, 'iki biçim kopyası birbirini tutmuyor').toBe(kopya2);
    }
  });

  it('dark module her zaman koyudur', () => {
    for (const girdi of girdiler) {
      const matris = encodeQr(girdi);
      expect(matris[matris.length - 8]![8]).toBe(true);
    }
  });
});

/**
 * REGRESYON (b) — Reed–Solomon katsayı sırası.
 *
 * Üreteç polinomu ters sırada üretilirse yalnızca EC kod sözcükleri bozulur;
 * veri bölgesi doğru kalır ve matris "neredeyse doğru" görünür. Aşağıdaki
 * vektörlerde EC payı yüksek olduğu için hata büyük ve kesin biçimde yakalanır.
 *
 * Sürüm 1'de 26 kod sözcüğünün 10'u EC'dir ve girdi tek karakter olduğundan
 * matrisin ezici çoğunluğu dolgu + EC'dir.
 */
describe('encodeQr — hata düzeltme kod sözcükleri (regresyon: RS katsayı sırası)', () => {
  const rsVektorleri = ALTIN_VEKTORLER.filter((v) => [1, 4, 9, 12].includes(v.surum));

  it('EC ağırlıklı vektörler referansla birebir eşleşir', () => {
    expect(rsVektorleri.length).toBeGreaterThanOrEqual(4);

    for (const vektor of rsVektorleri) {
      const uretilen = encodeQr(vektor.girdi);
      const beklenen = acMatris(vektor.matris, vektor.boyut);
      expect(ilkFark(beklenen, uretilen), `sürüm ${vektor.surum} · ${vektor.ad}`).toBeNull();
    }
  });
});

describe('encodeQr — yapısal değişmezler', () => {
  const girdiler = ['x', 'HELLO', 'a'.repeat(80), 'ç'.repeat(60), 'q'.repeat(250)];

  it('üç köşede finder pattern bulunur', () => {
    const finder = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ];

    for (const girdi of girdiler) {
      const matris = encodeQr(girdi);
      const n = matris.length;

      for (const [ustSatir, solSutun] of [
        [0, 0],
        [0, n - 7],
        [n - 7, 0],
      ] as const) {
        for (let r = 0; r < 7; r += 1) {
          for (let c = 0; c < 7; c += 1) {
            expect(
              matris[ustSatir + r]![solSutun + c],
              `finder (${ustSatir},${solSutun}) bozuk`,
            ).toBe(finder[r]![c] === 1);
          }
        }
      }
    }
  });

  it('timing pattern satır 6 ve sütun 6 boyunca değişimlidir', () => {
    for (const girdi of girdiler) {
      const matris = encodeQr(girdi);
      const n = matris.length;

      for (let i = 8; i < n - 8; i += 1) {
        expect(matris[6]![i], `satır 6 timing sütun ${i}`).toBe(i % 2 === 0);
        expect(matris[i]![6], `sütun 6 timing satır ${i}`).toBe(i % 2 === 0);
      }
    }
  });

  it('matris boyutu 4·sürüm + 17 kuralına uyar ve kare kalır', () => {
    for (const girdi of girdiler) {
      const matris = encodeQr(girdi);
      const n = matris.length;

      expect((n - 17) % 4).toBe(0);
      for (const satir of matris) {
        expect(satir.length).toBe(n);
      }
    }
  });

  it('girdi büyüdükçe seçilen sürüm küçülmez', () => {
    let oncekiBoyut = 0;
    for (let uzunluk = 1; uzunluk <= 300; uzunluk += 17) {
      const boyut = encodeQr('a'.repeat(uzunluk)).length;
      expect(boyut).toBeGreaterThanOrEqual(oncekiBoyut);
      oncekiBoyut = boyut;
    }
  });

  it('kapasite aşılınca sessizce kırpmak yerine hata fırlatır', () => {
    // Sürüm 14 / seviye M sınırının üstü. Sessiz kırpma, kullanıcının ancak
    // telefonuyla okumayı deneyince fark edeceği bozuk bir QR üretirdi.
    expect(() => encodeQr('a'.repeat(400))).toThrow(/kapasite/i);
  });

  it('UTF-8 çok baytlı karakterleri bayt uzunluğuna göre ölçer', () => {
    // 'ç' iki bayt: 100 karakter = 200 bayt. Karakter sayısıyla ölçülseydi
    // daha küçük bir sürüm seçilir ve kapasite sessizce aşılırdı.
    const turkce = encodeQr('ç'.repeat(100));
    const ascii = encodeQr('c'.repeat(200));
    expect(turkce.length).toBe(ascii.length);
  });
});
