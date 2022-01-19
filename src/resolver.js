// https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/node/index.js
// https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers
// https://github.com/olalonde/eslint-import-resolver-babel-root-import

import { createLogger } from "@jsenv/logger"
import {
  assertAndNormalizeDirectoryUrl,
  ensureWindowsDriveLetter,
  urlToFileSystemPath,
  fileSystemPathToUrl,
  getRealFileSystemUrlSync,
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
        caseSensitive,
      })
    }
    if (importUrl.startsWith("https://") || importUrl.startsWith("http://")) {
      logger.debug(`-> consider found because of http(s) scheme ${importUrl}`)
      return handleHttpUrl(importUrl)
    }
    if (importUrl.startsWith("node:")) {
      logger.warn(
        `Warning: ${file} is using "node" scheme but "node" parameter is not enabled (importing "${source}")`,
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

const handleFileUrl = (fileUrl, { logger, caseSensitive }) => {
  fileUrl = `file://${new URL(fileUrl).pathname}` // remove query params from url
  const realFileUrl = getRealFileSystemUrlSync(fileUrl, {
    // we don't follow link because we care only about the theoric file location
    // without this realFileUrl and fileUrl can be different
    // and we would log the warning about case sensitivity
    followLink: false,
  })
  const filePath = urlToFileSystemPath(fileUrl)
  if (!realFileUrl) {
    logger.debug(`-> file not found at ${fileUrl}`)
    return {
      found: false,
      path: filePath,
    }
  }
  const realFilePath = urlToFileSystemPath(realFileUrl)
  if (caseSensitive && realFileUrl !== fileUrl) {
    logger.warn(
      `WARNING: file found for ${filePath} but would not be found on a case sensitive filesystem.
The real file path is ${realFilePath}.
You can choose to disable this warning by disabling case sensitivity.
If you do so keep in mind windows users would not find that file.`,
    )
    return {
      found: false,
      path: realFilePath,
    }
  }
  logger.debug(`-> found file at ${realFilePath}`)
  return {
    found: true,
    path: realFilePath,
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
