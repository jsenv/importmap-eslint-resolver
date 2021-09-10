import { createRequire } from "node:module"
import { existsSync, readFileSync } from "node:fs"

import {
  urlToFileSystemPath,
  fileSystemPathToUrl,
  urlToExtension,
  resolveUrl,
  urlToRelativeUrl,
} from "@jsenv/filesystem"

export const applyNodeModuleResolution = (
  specifier,
  { logger, projectDirectoryUrl, importer },
) => {
  const moduleSystem = determineModuleSystem(importer, projectDirectoryUrl)
  if (moduleSystem === "cjs") {
    return applyCommonJsModuleResolution(specifier, { importer })
  }

  logger.warn(`Cannot resolve specifier: ESM node module resolution algorithm is not implemented.
--- specifier ---
${specifier}
--- importer ---
${importer}
--- suggestion ---
Use importResolutionMethod: 'importmap'`)
  return null
}

// https://nodejs.org/dist/latest-v16.x/docs/api/packages.html#packages_determining_module_system)
const determineModuleSystem = (url, projectDirectoryUrl) => {
  const inputTypeArgv = process.execArgv.find((argv) =>
    argv.startsWith("--input-type="),
  )

  if (inputTypeArgv) {
    const value = inputTypeArgv.slice("--input-type=".length)
    if (value === "module") {
      return "esm"
    }
    if (value === "commonjs") {
      return "cjs"
    }
  }

  const extension = urlToExtension(url)
  if (extension === ".cjs") {
    return "cjs"
  }
  if (extension === ".mjs") {
    return "esm"
  }

  const packageCandidates = getPackageCandidates(url, projectDirectoryUrl)
  const firstPackageFound = packageCandidates.find((packageRelativeUrl) => {
    const packageUrl = resolveUrl(packageRelativeUrl, projectDirectoryUrl)
    return existsSync(urlToFileSystemPath(packageUrl))
  })
  if (!firstPackageFound) {
    return undefined
  }

  const packageUrl = resolveUrl(firstPackageFound, projectDirectoryUrl)
  const packageContent = readFileSync(urlToFileSystemPath(packageUrl))
  const packageData = JSON.parse(packageContent)
  if (packageData.type === "module") {
    return "esm"
  }
  return "cjs"
}

const getPackageCandidates = (fileUrl, projectDirectoryUrl) => {
  const fileDirectoryUrl = resolveUrl("./", fileUrl)

  if (fileDirectoryUrl === projectDirectoryUrl) {
    return [`package.json`]
  }

  const fileDirectoryRelativeUrl = urlToRelativeUrl(
    fileDirectoryUrl,
    projectDirectoryUrl,
  )
  const candidates = []
  const relativeDirectoryArray = fileDirectoryRelativeUrl.split("/")
  // remove the first empty string
  relativeDirectoryArray.shift()

  let i = relativeDirectoryArray.length
  while (i--) {
    candidates.push(
      `${relativeDirectoryArray.slice(0, i + 1).join("/")}/package.json`,
    )
  }

  return [...candidates, "package.json"]
}

// https://nodejs.org/dist/latest-v16.x/docs/api/esm.html#esm_customizing_esm_specifier_resolution_algorithm
const applyCommonJsModuleResolution = (specifier, { importer }) => {
  const importerPath = urlToFileSystemPath(importer)
  const require = createRequire(importerPath)
  let specifierPath
  try {
    specifierPath = require.resolve(specifier)
  } catch (e) {
    if (e && e.code === "MODULE_NOT_FOUND") {
      return null
    }
    throw e
  }
  const specifierUrl = fileSystemPathToUrl(specifierPath)
  return specifierUrl
}
