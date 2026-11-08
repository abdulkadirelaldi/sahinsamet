import type { Metadata } from 'next';

import { miktarBicim } from '@/components/panel/cuzdan-bicim';
import { TransferFormu, TransferGeriAl } from '@/components/panel/cuzdan-formlari';
import { gunAyYil } from '@/components/panel/hayat-bicim';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';
import { fetchSecilebilirHesaplar, fetchSonTransferler } from '@/server/services/cuzdan';

export const metadata: Metadata = {
  title: 'Transfer',
  robots: { index: false, follow: false, nocache: true },
};

/** `/panel/cuzdan/transfer` — hesaplar arası aktarım: net varlığı değiştirmez (2026-11-01). */
export default async function TransferPage() {
  const [hesaplar, transferler] = await Promise.all([
    fetchSecilebilirHesaplar(),
    fetchSonTransferler(),
  ]);

  return (
    <>
      <Topbar title="Transfer" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {hesaplar.length < 2 ? (
            <p className="rounded-card border-line bg-surface text-muted border p-6 text-center text-sm">
              Transfer için en az iki hesap gerekir.
            </p>
          ) : (
            <TransferFormu hesaplar={hesaplar} bugun={appToday()} />
          )}

          {transferler.length > 0 && (
            <section className="rounded-card border-line bg-surface flex flex-col gap-1 border p-4">
              <h2 className="text-primary text-base font-semibold">Son transferler</h2>
              <ul className="divide-line flex flex-col divide-y">
                {transferler.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-primary truncate font-medium">
                        {t.kaynak} → {t.hedef}
                      </span>
                      <span className="tabular text-muted text-xs">
                        {miktarBicim(t.amount, t.unit)} · {gunAyYil(t.gun)}
                      </span>
                    </span>
                    <TransferGeriAl transferId={t.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
