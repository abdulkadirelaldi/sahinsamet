import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Yalnızca `component` projesi (jsdom, `*.test.tsx`) bu dosyayı yükler.
 * `node` projesi yüklemez — `@testing-library/react` içe aktarıldığı anda
 * `document` bekler.
 *
 * `cleanup()` her testten sonra DOM'u boşaltır. Vitest'te `globals: false`
 * olduğu için Testing Library bunu kendiliğinden yapmaz; yapılmazsa testler
 * birbirinin DOM'unu görür ve `getByRole` "birden fazla eşleşme" hatası verir.
 */
afterEach(() => {
  cleanup();
});
