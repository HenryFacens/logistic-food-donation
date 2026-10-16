import { readFile, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'

const webRoot = resolve(import.meta.dirname, '..')
const sourceRoot = join(webRoot, 'src')
const extensions = new Set(['.ts', '.tsx'])
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s*)?['"]([^'"]+)['"]/g

const files = []
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path)
    else if (extensions.has(extname(entry.name))) files.push(path)
  }
}

const normalize = (value) => value.split(sep).join('/')
const areaFor = (path) => {
  const relativePath = normalize(relative(sourceRoot, path))
  if (relativePath.startsWith('app/')) return { area: 'app', relativePath }
  if (relativePath.startsWith('shared/')) return { area: 'shared', relativePath }
  const match = relativePath.match(/^features\/([^/]+)\//)
  if (match) return { area: 'feature', feature: match[1], relativePath }
  return { area: 'other', relativePath }
}

const resolveImport = (file, specifier) => {
  if (specifier.startsWith('@/')) return join(sourceRoot, specifier.slice(2))
  if (specifier.startsWith('.')) return resolve(dirname(file), specifier)
  return null
}

await walk(sourceRoot)
const violations = []

for (const file of files) {
  const importer = areaFor(file)
  const source = await readFile(file, 'utf8')
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1]
    const targetPath = resolveImport(file, specifier)
    if (!targetPath) continue
    const target = areaFor(targetPath)

    if (
      importer.area === 'shared' &&
      (target.area === 'app' || target.area === 'feature')
    ) {
      violations.push(`${importer.relativePath}: shared cannot import ${specifier}`)
    }
    if (importer.area === 'feature' && target.area === 'app') {
      violations.push(`${importer.relativePath}: feature cannot import ${specifier}`)
    }
    if (
      importer.area === 'feature' &&
      target.area === 'feature' &&
      importer.feature !== target.feature
    ) {
      const normalizedSpecifier = specifier.replace(/\/index(?:\.tsx?)?$/, '')
      const targetRoot = `features/${target.feature}`
      const resolvedRelative = normalize(relative(sourceRoot, targetPath))
      if (
        normalizedSpecifier.includes('/') &&
        resolvedRelative !== targetRoot &&
        resolvedRelative !== `${targetRoot}/index`
      ) {
        violations.push(
          `${importer.relativePath}: cross-feature import must use ${targetRoot}/index.ts`,
        )
      }
    }
    if (importer.area === 'app' && target.area === 'feature') {
      const targetRoot = `features/${target.feature}`
      const resolvedRelative = normalize(relative(sourceRoot, targetPath))
      if (
        resolvedRelative !== targetRoot &&
        resolvedRelative !== `${targetRoot}/index`
      ) {
        violations.push(
          `${importer.relativePath}: app import must use ${targetRoot}/index.ts`,
        )
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Boundary check passed for ${files.length} source files.`)
}

