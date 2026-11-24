// Construit l'application sans backend (mode découverte) avec esbuild, pour les tests E2E
// dans un environnement sans accès à npm. En production, utilisez « pnpm build » (Vite).
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');
const out = process.argv[2] ?? resolve(web, 'dist-e2e');
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [resolve(web, 'src/main.tsx')],
  bundle: true,
  outfile: resolve(out, 'app.js'),
  format: 'esm',
  jsx: 'automatic',
  loader: { '.json': 'json', '.css': 'css' },
  alias: {
    '@coran/core': resolve(web, '../../packages/core/src/index.ts'),
    '@supabase/supabase-js': resolve(here, 'stubs/supabase-js.ts'),
  },
  nodePaths: [resolve(web, '../../node_modules')],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '""',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
    'import.meta.env.BASE_URL': '"/"',
    'import.meta.env.VITE_OAUTH_PROVIDERS': '""',
    'import.meta.env.PROD': 'false',
    'process.env.NODE_ENV': '"production"',
  },
  minify: true,
  logLevel: 'warning',
});
cpSync(resolve(web, 'public'), out, { recursive: true });
const html = readFileSync(resolve(web, 'index.html'), 'utf8')
  .replace('<script type="module" src="./src/main.tsx"></script>', '<link rel="stylesheet" href="./app.css" /><script type="module" src="./app.js"></script>');
writeFileSync(resolve(out, 'index.html'), html);
console.log('build e2e ->', out);
