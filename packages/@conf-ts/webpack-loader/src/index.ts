import { compile } from '@conf-ts/compiler'
import { LoaderContext } from 'webpack'
import path from 'path'
import fs from 'fs' // Import the fs module

interface LoaderOptions {
  name?: string
  format?: 'json' | 'yaml'
  extensionToRemove?: string
}

export default function (this: LoaderContext<LoaderOptions>, source: string) {
  this.cacheable && this.cacheable()

  const options = this.getOptions() as LoaderOptions
  const format = options.format || 'json'
  const extToRemove = options.extensionToRemove || '';

  try {
    const result = compile(this.resourcePath, format, false)
    const baseName = path.basename(this.resourcePath, extToRemove);
    const fileName = path.join(
      path.dirname(this.resourcePath),
      options.name || `${baseName}.generated.${format}`
    )
    fs.writeFileSync(fileName, result)
  } catch (error) {
    this.emitError(error as Error)
  } finally {
    return source;
  }
}
