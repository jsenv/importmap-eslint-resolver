import { readFileSync } from "node:fs"

import { normalizeImportMap } from "@jsenv/importmap"
import {
  resolveUrl,
  urlIsInsideOf,
  urlToFileSystemPath,
  ensureWindowsDriveLetter,
} from "@jsenv/filesystem"

export const readImportMapFromFile = ({
  logger,
  projectDirectoryUrl,
  importMapFileRelativeUrl,
}) => {
  if (typeof importMapFileRelativeUrl === "undefined") {
    return null
  }
  if (typeof importMapFileRelativeUrl !== "string") {
    throw new TypeError(
      `importMapFileRelativeUrl must be a string, got ${importMapFileRelativeUrl}`,
    )
  }
  const importMapFileUrl = applyUrlResolution(
    importMapFileRelativeUrl,
    projectDirectoryUrl,
  )
  if (!urlIsInsideOf(importMapFileUrl, projectDirectoryUrl)) {
    logger.warn(`import map file is outside project.
--- import map file ---
${urlToFileSystemPath(importMapFileUrl)}
--- project directory ---
${urlToFileSystemPath(projectDirectoryUrl)}`)
  }
  let importMapFileBuffer
  const importMapFilePath = urlToFileSystemPath(importMapFileUrl)
  try {
    importMapFileBuffer = readFileSync(importMapFilePath)
  } catch (e) {
    if (e && e.code === "ENOENT") {
      logger.error(`importmap file not found at ${importMapFilePath}`)
      return null
    }
    throw e
  }
  let importMap
  try {
    const importMapFileString = String(importMapFileBuffer)
    importMap = JSON.parse(importMapFileString)
  } catch (e) {
    if (e && e.code === "SyntaxError") {
      logger.error(`syntax error in importmap file
--- error stack ---
${e.stack}
--- importmap file ---
${importMapFilePath}`)
      return null
    }
    throw e
  }
  return normalizeImportMap(importMap, importMapFileUrl)
}

const applyUrlResolution = (specifier, importer) => {
  const url = resolveUrl(specifier, importer)
  return ensureWindowsDriveLetter(url, importer)
}
