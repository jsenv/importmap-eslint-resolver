import { resolveImport } from "@jsenv/importmap"

import { readImportMapFromFile } from "./readImportMapFromFile.js"

export const applyImportMapResolution = (
  specifier,
  {
    logger,
    projectDirectoryUrl,
    importMapFileRelativeUrl,
    importDefaultExtension,
    importer,
  },
) => {
  const importMap = readImportMapFromFile({
    logger,
    projectDirectoryUrl,
    importMapFileRelativeUrl,
  })
  try {
    return resolveImport({
      specifier,
      importer,
      // by passing importMap to null resolveImport behaves
      // almost like new URL(specifier, importer)
      // we want to force the importmap resolution
      // so that bare specifiers are considered unhandled
      // even if there is no importmap file
      importMap: importMap || {},
      defaultExtension: importDefaultExtension,
    })
  } catch (e) {
    if (e.message.includes("bare specifier")) {
      // this is an expected error and the file cannot be found
      logger.debug("unmapped bare specifier")
      return null
    }
    // this is an unexpected error
    throw e
  }
}
