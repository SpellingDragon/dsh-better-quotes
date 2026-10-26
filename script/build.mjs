import { build } from 'esbuild'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'lib')
const clientTmp = resolve(out, '.client.cjs')

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

await build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(out, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  logLevel: 'info',
})

await build({
  entryPoints: [resolve(root, 'src/client/index.ts')],
  outfile: clientTmp,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', '@deepseek-ai/dsh-client-ui-primitives'],
  logLevel: 'info',
})

const body = await readFile(clientTmp, 'utf8')
const wrapped = `window.__ModuleLoader__.load({\n  id: "dsh-better-quotes",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n${body}\n    return module.exports;\n  }\n});\n`
await writeFile(resolve(out, 'client.js'), wrapped)
await rm(clientTmp)
