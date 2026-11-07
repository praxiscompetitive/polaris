import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rows } from './csv.ts'

test('skips comments and headers, maps missing to NaN', () => {
  const r = rows('# note\nLand-Ocean: Global Means\nYear,Jan\n1880,-.19,***\n2026,1.10,\n')
  assert.equal(r.length, 2)
  assert.deepEqual(r[0].slice(0, 2), [1880, -0.19])
  assert.ok(Number.isNaN(r[0][2]) && Number.isNaN(r[1][2]))
})
