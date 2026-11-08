import { register } from 'node:module';

/** `node --import ./prisma/seed-register.mjs prisma/seed.ts` ile yüklenir. */
register('./seed-resolver.mjs', import.meta.url);
