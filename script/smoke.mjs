import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document

const Icon = () => null
const primitives = {
  Button: () => null,
  Checkbox: () => null,
  Modal: () => null,
  Tag: () => null,
  IconChecklistOutlineRegular: Icon,
  IconLinkOutlineRegular: Icon,
  IconPaperclipOutlineRegular: Icon,
  IconSkillOutlineRegular: Icon,
  fileSizeText: (bytes) => String(bytes),
}
const react = {
  createElement: () => null,
  useState: () => [undefined, () => {}],
  useMemo: (factory) => factory(),
  Fragment: {},
}
const jsxRuntime = { jsx: () => null, jsxs: () => null, Fragment: {} }
const clientStore = {
  createSnapshotStore: (init) => ({
    getSnapshot: () => init,
    subscribe: () => () => undefined,
    set: () => undefined,
    update: () => undefined,
  }),
}
const requireStub = (name) => {
  if (name === 'react') return react
  if (name === 'react/jsx-runtime') return jsxRuntime
  if (name === '@deepseek-ai/dsh-client-ui-primitives') return primitives
  if (name === '@deepseek-ai/dsh-client-store') return clientStore
  throw new Error(`unexpected require: ${name}`)
}

let loaded
dom.window.__ModuleLoader__ = {
  load: (module) => { loaded = module.factory(requireStub) },
}
vm.runInThisContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'))

if (loaded === undefined) throw new Error('module loader did not run')
if (typeof loaded.apply !== 'function') throw new Error('apply is missing')
if (!Array.isArray(loaded.inject) || loaded.inject.join(',') !== 'slots,locale,uiConversation,sessions') {
  throw new Error('inject is wrong')
}
console.log('bundle smoke ok:', Object.keys(loaded).join(','))
