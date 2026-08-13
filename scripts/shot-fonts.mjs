// Screenshot support only. fonts.googleapis.com is unreachable from the cloud
// sandbox, so a headless page renders the fallback stack and every line wrap,
// card height, and column measure comes out wrong. This builds a CSS blob of
// @font-face rules with the real families inlined as data URIs from local
// @fontsource copies, for page.addStyleTag.
//
// It is not part of the app build. Nothing in src imports it.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function face(family, pkg, file, weight, extra = '') {
  const path = join(root, 'node_modules', '@fontsource', pkg, 'files', file)
  if (!existsSync(path))
    throw new Error(
      `missing font file: ${path}\n` +
        'The screenshot scripts are not covered by the app dependencies. Install them with:\n' +
        '  npm i -D playwright @fontsource/fraunces @fontsource/space-grotesk ' +
        '@fontsource/hanken-grotesk @fontsource/jetbrains-mono'
    )
  const b64 = readFileSync(path).toString('base64')
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');${extra}}`
}

export function fontCss() {
  return [
    // Fraunces ships variable; the static instances are what the app asks for.
    face('Fraunces', 'fraunces', 'fraunces-latin-500-normal.woff2', 500),
    face('Fraunces', 'fraunces', 'fraunces-latin-600-normal.woff2', 600),
    face('Fraunces', 'fraunces', 'fraunces-latin-700-normal.woff2', 700),
    face('Space Grotesk', 'space-grotesk', 'space-grotesk-latin-400-normal.woff2', 400),
    face('Space Grotesk', 'space-grotesk', 'space-grotesk-latin-500-normal.woff2', 500),
    face('Space Grotesk', 'space-grotesk', 'space-grotesk-latin-700-normal.woff2', 700),
    face('Hanken Grotesk', 'hanken-grotesk', 'hanken-grotesk-latin-400-normal.woff2', 400),
    face('Hanken Grotesk', 'hanken-grotesk', 'hanken-grotesk-latin-500-normal.woff2', 500),
    face('JetBrains Mono', 'jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2', 400),
    face('JetBrains Mono', 'jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff2', 700),
    // 'Grotesk Amp' is the one glyph ampersand subset. In production it loads
    // from fonts.gstatic.com; here it is the full Space Grotesk face scoped to
    // U+26, which renders the same glyph at the same metrics.
    face('Grotesk Amp', 'space-grotesk', 'space-grotesk-latin-700-normal.woff2', '100 900', 'unicode-range:U+26;'),
  ].join('\n')
}
