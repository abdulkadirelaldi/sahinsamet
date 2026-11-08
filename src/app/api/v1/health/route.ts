import { statfs } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { NextResponse } from 'next/server';

import { pingDatabase } from '@/server/db';
import type { ApiResponse } from '@/types';
import { guvenliHata } from '@/lib/security/guvenli-log';
import { nabizDurumu, type NabizDurumu } from '@/lib/zamanlayici-nabiz';

/**
 * GET /api/v1/health — PROGRAM.md §13.6
 *
 * Coolify sağlık kontrolü ve Uptime Kuma (§13.7) bu ucu yoklar.
 * İki şeyi doğrular: veritabanı bağlantısı ve disk doluluğu.
 *
 * §7.2 zarfına birebir uyar. §8.20 gereği hata gövdesinde yığın izi (stack trace),
 * bağlantı dizesi, host adı veya kullanıcı adı ASLA bulunmaz — ayrıntı yalnızca
 * sunucu loguna yazılır.
 */

// Asla önbelleğe alınmaz; her istekte gerçek durum ölçülür.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/** Disk bu eşiğin altına düşerse servis riskli sayılır ve 503 döner. */
const DISK_CRITICAL_FREE_RATIO = 0.05;
/** Bu eşiğin altı "az" olarak raporlanır ama servis ayakta sayılır. */
const DISK_LOW_FREE_RATIO = 0.1;

/** DB yoklaması bu süreyi aşarsa başarısız sayılır — uç asılı kalmamalı. */
const DB_PROBE_TIMEOUT_MS = 5_000;

type DiskStatus = 'ok' | 'low' | 'critical' | 'unknown';

interface HealthData {
  db: 'up';
  uptime: number;
  disk: DiskStatus;
  /** Bildirim zamanlayıcısı dönüyor mu; dış izleme `gecikmis`te alarm verir. */
  zamanlayici: NabizDurumu;
  timestamp: string;
}

/**
 * Veritabanı yoklaması — `pingDatabase()` havuzdan gerçek bir bağlantı alıp bırakır.
 *
 * Tablo taranmaz, `HealthCheck` modeline dokunulmaz (T-010'da kaldırılacak) ve
 * ham SQL çalıştırılmaz (§8.10). Gerekçenin tamamı `src/server/db.ts` içinde.
 */
async function probeDatabase(): Promise<void> {
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Veritabanı yoklaması ${DB_PROBE_TIMEOUT_MS}ms içinde yanıt vermedi`)),
      DB_PROBE_TIMEOUT_MS,
    );
  });

  try {
    await Promise.race([pingDatabase(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Disk doluluğu — uygulama kök dizininin bulunduğu birim. */
async function probeDisk(): Promise<DiskStatus> {
  try {
    const stats = await statfs(path.resolve(process.cwd()));
    const total = Number(stats.blocks) * Number(stats.bsize);
    const free = Number(stats.bavail) * Number(stats.bsize);

    if (!Number.isFinite(total) || total <= 0) return 'unknown';

    const freeRatio = free / total;
    if (freeRatio < DISK_CRITICAL_FREE_RATIO) return 'critical';
    if (freeRatio < DISK_LOW_FREE_RATIO) return 'low';
    return 'ok';
  } catch {
    // Disk okunamıyorsa servisi düşürme; bilinmiyor olarak raporla.
    return 'unknown';
  }
}

function failure(logDetail: unknown, reason: string): NextResponse<ApiResponse<HealthData>> {
  // §8.20 — ayrıntı YALNIZCA sunucu loguna.
  guvenliHata(
    `[health] kontrol başarısız (${reason}):`,
    logDetail instanceof Error ? logDetail.message : logDetail,
  );

  return NextResponse.json<ApiResponse<HealthData>>(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        // Genel ve eyleme dönük; altyapı ayrıntısı sızdırmaz.
        message: 'Servis şu anda kullanılamıyor.',
      },
    },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        // §8.7 — sağlık ucu arama motorlarında görünmesin.
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}

export async function GET(): Promise<NextResponse<ApiResponse<HealthData>>> {
  const disk = await probeDisk();

  try {
    await probeDatabase();
  } catch (error) {
    return failure(error, 'db');
  }

  if (disk === 'critical') {
    return failure(
      `disk doluluk eşiği aşıldı (boş alan < %${DISK_CRITICAL_FREE_RATIO * 100})`,
      'disk',
    );
  }

  return NextResponse.json<ApiResponse<HealthData>>(
    {
      ok: true,
      data: {
        db: 'up',
        uptime: Math.round(process.uptime() * 1000) / 1000,
        zamanlayici: nabizDurumu(
          process.env.NODE_ENV === 'production' &&
            Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
          process.uptime(),
        ),
        disk,
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}
