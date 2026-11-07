// node --test src/lib  (Node 22.6+ strips types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, serialize } from './deeplink.ts'

test('round-trips a full link', () => {
  const h = '#app/monitor?l=ndvi,labels&t=2016-01-01&cmp=2026-01-01&c=80.700,7.600,900000,0.00,-1.57&o=0.6&r=sri-lanka'
  assert.equal(serialize(parse(h)!), h)
})
test('rejects unknown views and junk values', () => {
  assert.equal(parse('#app/nope'), null)
  assert.equal(parse('#explorer'), null)
  const k = parse('#app/explorer?t=yesterday&c=1,999,5&o=7&l=a,<b>')!
  assert.deepEqual([k.t, k.c, k.o, k.l], [undefined, undefined, undefined, ['a']])
})
test('bare view', () => assert.deepEqual(parse('#app/events'), { view: 'events', l: [], t: undefined, cmp: undefined, c: undefined, o: undefined, r: undefined }))
