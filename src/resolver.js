// https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/node/index.js
// https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers
// https://github.com/olalonde/eslint-import-resolver-babel-root-import

import { statSync, realpathSync } from "node:fs"
import { createLogger } from "@jsenv/logger"
import {
  assertAndNormalizeDirectoryUrl,
  ensureWindowsDriveLetter,
  urlIsInsideOf,
  urlToFileSystemPath,
  fileSystemPathToUrl,
} from "@jsenv/filesystem"
import { isSpecifierForNodeCoreModule } from "@jsenv/importmap/src/isSpecifierForNodeCoreModule.js"

import { applyImportMapResolution } from "./internal/importmap_resolution.js"

export const interfaceVersion = 2

export const resolve = (
  source,
  file,
  {
    logLevel,
    projectDirectoryUrl,
    importMapFileRelativeUrl,
    caseSensitive = true,
    ignoreOutside = false,
    importDefaultExtension = false,
    node = false,
  },
) => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl)

  const logger = createLogger({ logLevel })

  logger.debug(`
resolve import for project.
--- specifier ---
${source}
--- importer ---
${file}
--- project directory path ---
${urlToFileSystemPath(projectDirectoryUrl)}`)

  if (node && isSpecifierForNodeCoreModule(source)) {
    logger.debug(`-> native node module`)
    return {
      found: true,
      path: null,
    }
  }

  const specifier = source
  const importer = String(fileSystemPathToUrl(file))

  try {
    let importUrl = applyImportMapResolution(specifier, {
      logger,
      projectDirectoryUrl,
      importMapFileRelativeUrl,
      importDefaultExtension,
      importer,
    })
    if (!importUrl) {
      return {
        found: false,
        path: null,
      }
    }

    importUrl = ensureWindowsDriveLetter(importUrl, importer)

    if (importUrl.startsWith("file://")) {
      return handleFileUrl(importUrl, {
        logger,
        projectDirectoryUrl,
        ignoreOutside,
        caseSensitive,
      })
    }

    if (importUrl.startsWith("https://") || importUrl.startsWith("http://")) {
      logger.debug(`-> consider found because of http(s) scheme ${importUrl}`)
      return handleHttpUrl(importUrl)
    }

    if (importUrl.startsWith("node:")) {
      logger.warn(
        `-> ${source} uses node scheme and node parameter is disabled`,
      )
    }

    logger.debug(`-> consider not found because of scheme ${importUrl}`)
    return handleRemainingUrl(importUrl)
  } catch (e) {
    logger.error(e.stack)
    return {
      found: false,
      path: null,
    }
  }
}

const handleFileUrl = (
  importUrl,
  { logger, projectDirectoryUrl, ignoreOutside, caseSensitive },
) => {
  const importFilePath = urlToFileSystemPath(importUrl)

  if (ignoreOutside && !urlIsInsideOf(importUrl, projectDirectoryUrl)) {
    logger.warn(`ignoring import outside project
--- import file ---
${importFilePath}
--- project directory ---
${urlToFileSystemPath(projectDirectoryUrl)}
`)
    return {
      found: false,
      path: importFilePath,
    }
  }

  if (!pathLeadsToFile(importFilePath)) {
    logger.debug(`-> file not found at ${importUrl}`)
    return {
      found: false,
      path: importFilePath,
    }
  }

  if (caseSensitive) {
    const importFileRealPath = realpathSync.native(importFilePath)
    if (importFileRealPath !== importFilePath) {
      logger.warn(
        `WARNING: file found at ${importFilePath} but would not be found on a case sensitive filesystem.
The real file path is ${importFileRealPath}.
You can choose to disable this warning by disabling case sensitivity.
If you do so keep in mind windows users would not find that file.`,
      )
      return {
        found: false,
        path: importFilePath,
      }
    }
  }

  logger.debug(`-> found file at ${importUrl}`)
  return {
    found: true,
    path: importFilePath,
  }
}

const handleHttpUrl = () => {
  // this api is synchronous we cannot check
  // if a remote http/https file is available
  return {
    found: true,
    path: null,
  }
}

const handleRemainingUrl = () => {
  return {
    found: false,
    path: null,
  }
}

const pathLeadsToFile = (path) => {
  try {
    const stats = statSync(path)
    return stats.isFile()
  } catch (e) {
    if (e && e.code === "ENOENT") {
      return false
    }
    throw e
  }
}
