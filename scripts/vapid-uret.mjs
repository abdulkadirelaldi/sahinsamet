// Bildirim (web push) VAPID anahtarlarını üretir ve `.env` satırları olarak
// STANDART ÇIKTIYA yazar — doğrudan dosyaya eklemek için:
//
//   docker compose exec -T araclar node scripts/vapid-uret.mjs >> .env
//   docker compose up -d uygulama
//
// Gizli anahtar ekrana basılmaz (çıktı dosyaya yönlenir). Var olan anahtar
// varken YENİDEN ÜRETMEYİN: tüm cihaz abonelikleri geçersiz kalır.
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
process.stdout.write(
  `\n# Bildirimler (web push) — ${new Date().toISOString().slice(0, 10)}\n` +
    `VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\n` +
    `VAPID_SUBJECT=mailto:bildirim@sahinsamet.com\n`,
);
