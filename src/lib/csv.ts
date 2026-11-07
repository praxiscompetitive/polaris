/** Numeric CSV rows, skipping comments and headers. Missing values ('***', '-99.99', '') become NaN. */
export function rows(text: string, missing = ['***', '-99.99', '-9.99']) {
  return text.split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(',').map((c) => c.trim()))
    .filter((c) => /^-?\d/.test(c[0]))
    .map((c) => c.map((v) => (v === '' || missing.includes(v) ? NaN : Number(v))))
}
