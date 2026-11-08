/**
 * Asgari QR kodu kodlayıcı — yalnızca bayt kipi, hata düzeltme seviyesi M.
 *
 * NEDEN KENDİ KODUMUZ: T-036 yeni bağımlılık kurmayı yasaklıyor (ADR-004) ve
 * QR bu ekranın ana gereksinimi. Kapsam bilinçli olarak dar tutuldu — otpauth
 * URI'leri ASCII ve ~90–160 bayt; alfasayısal/kanji kipleri, L/Q/H seviyeleri
 * ve v15+ YOKTUR. Genel amaçlı bir QR kütüphanesi değildir, olmaya çalışmaz.
 *
 * DOĞRULAMA: çıktı matrisi, referans `qrcode` paketininkiyle bit-bit
 * karşılaştırılarak sınandı (T-036 raporu / Testler). Bu dosya elle
 * değiştirilirse aynı karşılaştırma tekrarlanmalıdır.
 *
 * Kaynak: ISO/IEC 18004. Terimler İngilizce bırakıldı (finder, timing, mask) —
 * standardın dili bu ve karşılıkları belirsiz.
 */

/** Hata düzeltme seviyesi M için blok başına EC kod sözcüğü sayısı (sürüm 1–14). */
const EC_CODEWORDS_PER_BLOCK_M = [
  0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24,
] as const;

/** Hata düzeltme seviyesi M için blok sayısı (sürüm 1–14). */
const EC_BLOCKS_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9] as const;

const MAX_VERSION = 14;

/** Galois alanı GF(256), üreteç polinomu 0x11D. */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

/**
 * Reed–Solomon üreteç polinomu.
 *
 * KATSAYI SIRASI: en YÜKSEK dereceden başlar ve baştaki 1 katsayısı saklanmaz.
 * İlk sürümde polinom ters sırada (sabit terim önce) üretiliyordu; bölme döngüsü
 * yanlış katsayıyı okuyor ve EC kod sözcükleri sessizce bozuluyordu. Veri
 * kısmı doğru göründüğü için QR "neredeyse doğru" çıkıyordu — bu sınıf hata
 * ancak referans matrisle karşılaştırınca görünür.
 */
function buildGeneratorPolynomial(degree: number): Uint8Array {
  const coefficients = new Uint8Array(degree);
  coefficients[degree - 1] = 1;

  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      coefficients[j] = gfMultiply(coefficients[j]!, root);
      if (j + 1 < degree) {
        coefficients[j] = coefficients[j]! ^ coefficients[j + 1]!;
      }
    }
    root = gfMultiply(root, 2);
  }

  return coefficients;
}

function computeEcc(data: Uint8Array, ecLength: number): Uint8Array {
  const generator = buildGeneratorPolynomial(ecLength);
  const remainder = new Uint8Array(ecLength);

  for (const byte of data) {
    const factor = byte ^ remainder[0]!;
    remainder.copyWithin(0, 1);
    remainder[ecLength - 1] = 0;

    for (let i = 0; i < ecLength; i += 1) {
      remainder[i] = remainder[i]! ^ gfMultiply(generator[i]!, factor);
    }
  }

  return remainder;
}

const size = (version: number) => version * 4 + 17;

/**
 * Alignment pattern merkez koordinatları. Sürüm tablosu yerine standardın
 * türetme kuralı kullanılır — tablo yazım hatası riski ortadan kalkar.
 */
function alignmentPositions(version: number): number[] {
  if (version === 1) {
    return [];
  }

  const count = Math.floor(version / 7) + 2;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const positions = [6];

  for (let pos = size(version) - 7; positions.length < count; pos -= step) {
    positions.unshift(pos);
  }

  return positions;
}

type Grid = { modules: (boolean | null)[][]; reserved: boolean[][] };

function createGrid(version: number): Grid {
  const n = size(version);
  const modules: (boolean | null)[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => null),
  );
  const reserved: boolean[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => false),
  );
  return { modules, reserved };
}

function setModule(grid: Grid, row: number, col: number, dark: boolean): void {
  grid.modules[row]![col] = dark;
  grid.reserved[row]![col] = true;
}

/** Finder, separator, timing, alignment, dark module ve biçim alanları. */
function drawFunctionPatterns(grid: Grid, version: number): void {
  const n = size(version);

  const drawFinder = (top: number, left: number) => {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const row = top + r;
        const col = left + c;
        if (row < 0 || row >= n || col < 0 || col >= n) {
          continue;
        }
        const inRing = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark =
          inRing &&
          (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        setModule(grid, row, col, dark);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i += 1) {
    const dark = i % 2 === 0;
    setModule(grid, 6, i, dark);
    setModule(grid, i, 6, dark);
  }

  // Alignment patterns — finder'larla çakışanlar atlanır
  const positions = alignmentPositions(version);
  for (const row of positions) {
    for (const col of positions) {
      const nearFinder =
        (row === 6 && col === 6) || (row === 6 && col === n - 7) || (row === n - 7 && col === 6);
      if (nearFinder) {
        continue;
      }
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
          setModule(grid, row + r, col + c, dark);
        }
      }
    }
  }

  // Biçim bilgisi alanları rezerve edilir (değerleri maske seçildikten sonra yazılır)
  for (let i = 0; i < 9; i += 1) {
    if (!grid.reserved[8]![i]) {
      setModule(grid, 8, i, false);
    }
    if (!grid.reserved[i]![8]) {
      setModule(grid, i, 8, false);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    setModule(grid, 8, n - 1 - i, false);
    setModule(grid, n - 1 - i, 8, false);
  }

  // Dark module — her zaman koyu
  setModule(grid, n - 8, 8, true);

  // Sürüm bilgisi alanları (v7+)
  if (version >= 7) {
    const bits = versionInfoBits(version);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + n - 11;
      setModule(grid, a, b, dark);
      setModule(grid, b, a, dark);
    }
  }
}

function versionInfoBits(version: number): number {
  let remainder = version;
  for (let i = 0; i < 12; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  return ((version << 12) | remainder) & 0x3ffff;
}

function formatInfoBits(maskId: number): number {
  // Seviye M -> 0b00
  const data = (0b00 << 3) | maskId;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  return (((data << 10) | remainder) ^ 0x5412) & 0x7fff;
}

/**
 * Biçim bilgisinin iki kopyasını yazar.
 *
 * DİKKAT — buradaki sıra kolayca ters yazılır: BİRİNCİ kopya sütun 8 boyunca
 * (en düşük anlamlı bit ÜSTTE), İKİNCİ kopya satır 8 boyunca SAĞDAN sola gider.
 * İlk denemede birinci kopya satır 8'e yazılmıştı; QR yapısı neredeyse simetrik
 * olduğu için çıktı gözle "geçerli bir QR" gibi görünüyordu ama hiçbir okuyucu
 * çözemezdi. Referans matrisle karşılaştırma olmasa fark edilmezdi.
 */
function drawFormatInfo(grid: Grid, version: number, maskId: number): void {
  const n = size(version);
  const bits = formatInfoBits(maskId);
  const bitAt = (i: number) => ((bits >> i) & 1) === 1;

  // Birinci kopya — sol üst finder'ın çevresi
  for (let i = 0; i <= 5; i += 1) {
    grid.modules[i]![8] = bitAt(i);
  }
  grid.modules[7]![8] = bitAt(6);
  grid.modules[8]![8] = bitAt(7);
  grid.modules[8]![7] = bitAt(8);
  for (let i = 9; i < 15; i += 1) {
    grid.modules[8]![14 - i] = bitAt(i);
  }

  // İkinci kopya — düşük bitler satır 8'in SAĞ ucunda, yüksek bitler sütun 8'in ALT ucunda
  for (let i = 0; i < 8; i += 1) {
    grid.modules[8]![n - 1 - i] = bitAt(i);
  }
  for (let i = 8; i < 15; i += 1) {
    grid.modules[n - 15 + i]![8] = bitAt(i);
  }
}

function maskAt(maskId: number, row: number, col: number): boolean {
  switch (maskId) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

/** Veri bitlerini sağ alttan başlayan zikzak düzeninde yerleştirir. */
function placeData(grid: Grid, version: number, codewords: Uint8Array): void {
  const n = size(version);
  let bitIndex = 0;
  let upward = true;

  for (let right = n - 1; right >= 1; right -= 2) {
    const rightCol = right <= 6 ? right - 1 : right;

    for (let i = 0; i < n; i += 1) {
      const row = upward ? n - 1 - i : i;

      for (const col of [rightCol, rightCol - 1]) {
        if (grid.reserved[row]![col]) {
          continue;
        }
        const byte = codewords[bitIndex >>> 3] ?? 0;
        const bit = (byte >> (7 - (bitIndex & 7))) & 1;
        grid.modules[row]![col] = bit === 1;
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function penalty(matrix: boolean[][]): number {
  const n = matrix.length;
  let score = 0;

  // Kural 1 — aynı renkten 5+ ardışık modül
  for (const axis of [0, 1]) {
    for (let a = 0; a < n; a += 1) {
      let run = 1;
      for (let b = 1; b < n; b += 1) {
        const current = axis === 0 ? matrix[a]![b]! : matrix[b]![a]!;
        const previous = axis === 0 ? matrix[a]![b - 1]! : matrix[b - 1]![a]!;
        if (current === previous) {
          run += 1;
        } else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }

  // Kural 2 — 2x2 tek renk bloklar
  for (let r = 0; r < n - 1; r += 1) {
    for (let c = 0; c < n - 1; c += 1) {
      const v = matrix[r]![c]!;
      if (v === matrix[r]![c + 1] && v === matrix[r + 1]![c] && v === matrix[r + 1]![c + 1]) {
        score += 3;
      }
    }
  }

  // Kural 3 — finder benzeri desen
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (get: (i: number) => boolean, start: number, pattern: boolean[]) =>
    pattern.every((value, i) => get(start + i) === value);

  for (let a = 0; a < n; a += 1) {
    for (let b = 0; b + 11 <= n; b += 1) {
      const row = (i: number) => matrix[a]![i]!;
      const col = (i: number) => matrix[i]![a]!;
      if (matches(row, b, p1) || matches(row, b, p2)) score += 40;
      if (matches(col, b, p1) || matches(col, b, p2)) score += 40;
    }
  }

  // Kural 4 — koyu modül oranının %50'den sapması
  let dark = 0;
  for (const row of matrix) {
    for (const value of row) {
      if (value) dark += 1;
    }
  }
  const percent = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/** Fonksiyon desenleri dışındaki serbest modül sayısından toplam kod sözcüğü. */
function totalCodewords(version: number): number {
  const grid = createGrid(version);
  drawFunctionPatterns(grid, version);

  let free = 0;
  for (const row of grid.reserved) {
    for (const isReserved of row) {
      if (!isReserved) free += 1;
    }
  }
  return Math.floor(free / 8);
}

function dataCodewords(version: number): number {
  return totalCodewords(version) - EC_CODEWORDS_PER_BLOCK_M[version]! * EC_BLOCKS_M[version]!;
}

/**
 * Metni QR matrisine çevirir. `true` = koyu modül.
 *
 * Girdi kapasiteyi aşarsa hata fırlatır — sessizce kırpmak bozuk bir QR üretir
 * ve kullanıcı bunu ancak telefonuyla okumayı deneyince fark ederdi.
 */
export function encodeQr(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);

  let version = 0;
  for (let candidate = 1; candidate <= MAX_VERSION; candidate += 1) {
    const countBits = candidate < 10 ? 8 : 16;
    const capacityBits = dataCodewords(candidate) * 8 - 4 - countBits;
    if (bytes.length * 8 <= capacityBits) {
      version = candidate;
      break;
    }
  }

  if (version === 0) {
    throw new Error(`QR kapasitesi aşıldı: ${bytes.length} bayt (üst sınır sürüm ${MAX_VERSION}).`);
  }

  // --- bit akışı ---
  const bits: number[] = [];
  const pushBits = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) {
      bits.push((value >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // bayt kipi
  pushBits(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) {
    pushBits(byte, 8);
  }

  const capacityBits = dataCodewords(version) * 8;
  pushBits(0, Math.min(4, capacityBits - bits.length)); // sonlandırıcı
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const data = new Uint8Array(dataCodewords(version));
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) {
      byte = (byte << 1) | bits[i + j]!;
    }
    data[i / 8] = byte;
  }
  for (let i = bits.length / 8, pad = 0; i < data.length; i += 1, pad += 1) {
    data[i] = pad % 2 === 0 ? 0xec : 0x11;
  }

  // --- bloklara böl, EC hesapla, araya serpiştir ---
  const blockCount = EC_BLOCKS_M[version]!;
  const ecLength = EC_CODEWORDS_PER_BLOCK_M[version]!;
  const shortLength = Math.floor(data.length / blockCount);
  const longCount = data.length % blockCount;

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < blockCount; i += 1) {
    const length = shortLength + (i >= blockCount - longCount ? 1 : 0);
    const block = data.slice(offset, offset + length);
    offset += length;
    dataBlocks.push(block);
    ecBlocks.push(computeEcc(block, ecLength));
  }

  const interleaved = new Uint8Array(totalCodewords(version));
  let index = 0;

  for (let i = 0; i <= shortLength; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) {
        interleaved[index] = block[i]!;
        index += 1;
      }
    }
  }
  for (let i = 0; i < ecLength; i += 1) {
    for (const block of ecBlocks) {
      interleaved[index] = block[i]!;
      index += 1;
    }
  }

  // --- matris, maske seçimi ---
  const n = size(version);
  let best: boolean[][] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let maskId = 0; maskId < 8; maskId += 1) {
    const grid = createGrid(version);
    drawFunctionPatterns(grid, version);
    placeData(grid, version, interleaved);

    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (!grid.reserved[row]![col] && maskAt(maskId, row, col)) {
          grid.modules[row]![col] = !grid.modules[row]![col];
        }
      }
    }

    drawFormatInfo(grid, version, maskId);

    const matrix = grid.modules.map((row) => row.map((value) => value === true));
    const score = penalty(matrix);
    if (score < bestScore) {
      bestScore = score;
      best = matrix;
    }
  }

  return best!;
}
