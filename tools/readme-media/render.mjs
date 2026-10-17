// Renders every composition to a GIF for the README (docs/media).
import { execFileSync } from 'node:child_process'

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['overview', 'image-analysis', 'matching', 'routes']
for (const id of ids) {
  execFileSync(
    'npx',
    [
      'remotion', 'render', 'src/index.ts', id, `../../docs/media/${id}.gif`,
      '--codec=gif', '--every-nth-frame=2', '--scale=1', '--log=error',
    ],
    { stdio: 'inherit' },
  )
}
