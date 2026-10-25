// @ts-check
import { defineConfig } from 'astro/config';

// Static SSG. Data is fetched at build time (see src/lib/cv.ts) so the output
// is fully static and there is no browser CORS dependency on the WP endpoint.
export default defineConfig({
  site: 'https://cv.silentrecorders.io',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
});
