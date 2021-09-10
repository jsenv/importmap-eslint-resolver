'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var node_fs = require('fs');
var logger = require('@jsenv/logger');
var filesystem = require('@jsenv/filesystem');
var isSpecifierForNodeCoreModule_js = require('@jsenv/importmap/src/isSpecifierForNodeCoreModule.js');
var importmap = require('@jsenv/importmap');

const readImportMapFromFile = ({
  logger,
  projectDirectoryUrl,
  importMapFileRelativeUrl
}) => {
  if (typeof importMapFileRelativeUrl === "undefined") {
    return null;
  }

  if (typeof importMapFileRelativeUrl !== "string") {
    throw new TypeError(`importMapFileRelativeUrl must be a string, got ${importMapFileRelativeUrl}`);
  }

  const importMapFileUrl = applyUrlResolution(importMapFileRelativeUrl, projectDirectoryUrl);

  if (!filesystem.urlIsInsideOf(importMapFileUrl, projectDirectoryUrl)) {
    logger.warn(`import map file is outside project.
--- import map file ---
${filesystem.urlToFileSystemPath(importMapFileUrl)}
--- project directory ---
${filesystem.urlToFileSystemPath(projectDirectoryUrl)}`);
  }

  let importMapFileBuffer;
  const importMapFilePath = filesystem.urlToFileSystemPath(importMapFileUrl);

  try {
    importMapFileBuffer = node_fs.readFileSync(importMapFilePath);
  } catch (e) {
    if (e && e.code === "ENOENT") {
      logger.error(`importmap file not found at ${importMapFilePath}`);
      return null;
    }

    throw e;
  }

  let importMap;

  try {
    const importMapFileString = String(importMapFileBuffer);
    importMap = JSON.parse(importMapFileString);
  } catch (e) {
    if (e && e.code === "SyntaxError") {
      logger.error(`syntax error in importmap file
--- error stack ---
${e.stack}
--- importmap file ---
${importMapFilePath}`);
      return null;
    }

    throw e;
  }

  return importmap.normalizeImportMap(importMap, projectDirectoryUrl);
};

const applyUrlResolution = (specifier, importer) => {
  const url = filesystem.resolveUrl(specifier, importer);
  return filesystem.ensureWindowsDriveLetter(url, importer);
};

const applyImportMapResolution = (specifier, {
  logger,
  projectDirectoryUrl,
  importMapFileRelativeUrl,
  importDefaultExtension,
  importer
}) => {
  const importMap = readImportMapFromFile({
    logger,
    projectDirectoryUrl,
    importMapFileRelativeUrl
  });

  try {
    return importmap.resolveImport({
      specifier,
      importer,
      // by passing importMap to null resolveImport behaves
      // almost like new URL(specifier, importer)
      // we want to force the importmap resolution
      // so that bare specifiers are considered unhandled
      // even if there is no importmap file
      importMap: importMap || {},
      defaultExtension: importDefaultExtension
    });
  } catch (e) {
    if (e.message.includes("bare specifier")) {
      // this is an expected error and the file cannot be found
      logger.debug("unmapped bare specifier");
      return null;
    } // this is an unexpected error


    throw e;
  }
};

// https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/node/index.js
const interfaceVersion = 2;
const resolve = (source, file, {
  logLevel,
  projectDirectoryUrl,
  importMapFileRelativeUrl,
  caseSensitive = true,
  ignoreOutside = false,
  importDefaultExtension = false,
  node = false
}) => {
  projectDirectoryUrl = filesystem.assertAndNormalizeDirectoryUrl(projectDirectoryUrl);
  const logger$1 = logger.createLogger({
    logLevel
  });
  logger$1.debug(`
resolve import for project.
--- specifier ---
${source}
--- importer ---
${file}
--- project directory path ---
${filesystem.urlToFileSystemPath(projectDirectoryUrl)}`);

  if (node && isSpecifierForNodeCoreModule_js.isSpecifierForNodeCoreModule(source)) {
    logger$1.debug(`-> native node module`);
    return {
      found: true,
      path: null
    };
  }

  const specifier = source;
  const importer = String(filesystem.fileSystemPathToUrl(file));

  try {
    let importUrl = applyImportMapResolution(specifier, {
      logger: logger$1,
      projectDirectoryUrl,
      importMapFileRelativeUrl,
      importDefaultExtension,
      importer
    });

    if (!importUrl) {
      return {
        found: false,
        path: null
      };
    }

    importUrl = filesystem.ensureWindowsDriveLetter(importUrl, importer);

    if (importUrl.startsWith("file://")) {
      return handleFileUrl(importUrl, {
        logger: logger$1,
        projectDirectoryUrl,
        ignoreOutside,
        caseSensitive
      });
    }

    if (importUrl.startsWith("https://") || importUrl.startsWith("http://")) {
      logger$1.debug(`-> consider found because of http(s) scheme ${importUrl}`);
      return handleHttpUrl(importUrl);
    }

    if (importUrl.startsWith("node:")) {
      logger$1.warn(`-> ${source} uses node scheme and node parameter is disabled`);
    }

    logger$1.debug(`-> consider not found because of scheme ${importUrl}`);
    return handleRemainingUrl(importUrl);
  } catch (e) {
    logger$1.error(e.stack);
    return {
      found: false,
      path: null
    };
  }
};

const handleFileUrl = (importUrl, {
  logger,
  projectDirectoryUrl,
  ignoreOutside,
  caseSensitive
}) => {
  const importFilePath = filesystem.urlToFileSystemPath(importUrl);

  if (ignoreOutside && !filesystem.urlIsInsideOf(importUrl, projectDirectoryUrl)) {
    logger.warn(`ignoring import outside project
--- import file ---
${importFilePath}
--- project directory ---
${filesystem.urlToFileSystemPath(projectDirectoryUrl)}
`);
    return {
      found: false,
      path: importFilePath
    };
  }

  if (!pathLeadsToFile(importFilePath)) {
    logger.debug(`-> file not found at ${importUrl}`);
    return {
      found: false,
      path: importFilePath
    };
  }

  if (caseSensitive) {
    const importFileRealPath = node_fs.realpathSync.native(importFilePath);

    if (importFileRealPath !== importFilePath) {
      logger.warn(`WARNING: file found at ${importFilePath} but would not be found on a case sensitive filesystem.
The real file path is ${importFileRealPath}.
You can choose to disable this warning by disabling case sensitivity.
If you do so keep in mind windows users would not find that file.`);
      return {
        found: false,
        path: importFilePath
      };
    }
  }

  logger.debug(`-> found file at ${importUrl}`);
  return {
    found: true,
    path: importFilePath
  };
};

const handleHttpUrl = () => {
  // this api is synchronous we cannot check
  // if a remote http/https file is available
  return {
    found: true,
    path: null
  };
};

const handleRemainingUrl = () => {
  return {
    found: false,
    path: null
  };
};

const pathLeadsToFile = path => {
  try {
    const stats = node_fs.statSync(path);
    return stats.isFile();
  } catch (e) {
    if (e && e.code === "ENOENT") {
      return false;
    }

    throw e;
  }
};

exports.interfaceVersion = interfaceVersion;
exports.resolve = resolve;

//# sourceMappingURL=jsenv_importmap_eslint_resolver.cjs.map