import { register } from 'node:module';

/** `node --import ./tests/e2e/_helpers/db-register.mjs <betik>.ts` ile yüklenir. */
register('./db-resolver.mjs', import.meta.url);
