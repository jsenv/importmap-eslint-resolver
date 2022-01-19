'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const url = require('url');
const node_fs = require('fs');
const fs = require('fs');
require('crypto');
require('path');
const util = require('util');

const LOG_LEVEL_OFF = "off";
const LOG_LEVEL_DEBUG = "debug";
const LOG_LEVEL_INFO = "info";
const LOG_LEVEL_WARN = "warn";
const LOG_LEVEL_ERROR = "error";

const createLogger = ({
  logLevel = LOG_LEVEL_INFO
} = {}) => {
  if (logLevel === LOG_LEVEL_DEBUG) {
    return {
      debug,
      info,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_INFO) {
    return {
      debug: debugDisabled,
      info,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_WARN) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn,
      error
    };
  }

  if (logLevel === LOG_LEVEL_ERROR) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn: warnDisabled,
      error
    };
  }

  if (logLevel === LOG_LEVEL_OFF) {
    return {
      debug: debugDisabled,
      info: infoDisabled,
      warn: warnDisabled,
      error: errorDisabled
    };
  }

  throw new Error(`unexpected logLevel.
--- logLevel ---
${logLevel}
--- allowed log levels ---
${LOG_LEVEL_OFF}
${LOG_LEVEL_ERROR}
${LOG_LEVEL_WARN}
${LOG_LEVEL_INFO}
${LOG_LEVEL_DEBUG}`);
};
const debug = console.debug;

const debugDisabled = () => {};

const info = console.info;

const infoDisabled = () => {};

const warn = console.warn;

const warnDisabled = () => {};

const error = console.error;

const errorDisabled = () => {};

const createDetailedMessage = (message, details = {}) => {
  let string = `${message}`;
  Object.keys(details).forEach(key => {
    const value = details[key];
    string += `
--- ${key} ---
${Array.isArray(value) ? value.join(`
`) : value}`;
  });
  return string;
};

const ensureUrlTrailingSlash = url => {
  return url.endsWith("/") ? url : `${url}/`;
};

const isFileSystemPath = value => {
  if (typeof value !== "string") {
    throw new TypeError(`isFileSystemPath first arg must be a string, got ${value}`);
  }

  if (value[0] === "/") {
    return true;
  }

  return startsWithWindowsDriveLetter(value);
};

const startsWithWindowsDriveLetter = string => {
  const firstChar = string[0];
  if (!/[a-zA-Z]/.test(firstChar)) return false;
  const secondChar = string[1];
  if (secondChar !== ":") return false;
  return true;
};

const fileSystemPathToUrl = value => {
  if (!isFileSystemPath(value)) {
    throw new Error(`received an invalid value for fileSystemPath: ${value}`);
  }

  return String(url.pathToFileURL(value));
};

const assertAndNormalizeDirectoryUrl = value => {
  let urlString;

  if (value instanceof URL) {
    urlString = value.href;
  } else if (typeof value === "string") {
    if (isFileSystemPath(value)) {
      urlString = fileSystemPathToUrl(value);
    } else {
      try {
        urlString = String(new URL(value));
      } catch (e) {
        throw new TypeError(`directoryUrl must be a valid url, received ${value}`);
      }
    }
  } else {
    throw new TypeError(`directoryUrl must be a string or an url, received ${value}`);
  }

  if (!urlString.startsWith("file://")) {
    throw new Error(`directoryUrl must starts with file://, received ${value}`);
  }

  return ensureUrlTrailingSlash(urlString);
};

const urlToFileSystemPath = url$1 => {
  let urlString = String(url$1);

  if (urlString[urlString.length - 1] === "/") {
    // remove trailing / so that nodejs path becomes predictable otherwise it logs
    // the trailing slash on linux but does not on windows
    urlString = urlString.slice(0, -1);
  }

  const fileSystemPath = url.fileURLToPath(urlString);
  return fileSystemPath;
};

/*
 * - stats object documentation on Node.js
 *   https://nodejs.org/docs/latest-v13.x/api/fs.html#fs_class_fs_stats
 */
process.platform === "win32";

const resolveUrl$1 = (specifier, baseUrl) => {
  if (typeof baseUrl === "undefined") {
    throw new TypeError(`baseUrl missing to resolve ${specifier}`);
  }

  return String(new URL(specifier, baseUrl));
};

const isWindows = process.platform === "win32";
const baseUrlFallback = fileSystemPathToUrl(process.cwd());
/**
 * Some url might be resolved or remapped to url without the windows drive letter.
 * For instance
 * new URL('/foo.js', 'file:///C:/dir/file.js')
 * resolves to
 * 'file:///foo.js'
 *
 * But on windows it becomes a problem because we need the drive letter otherwise
 * url cannot be converted to a filesystem path.
 *
 * ensureWindowsDriveLetter ensure a resolved url still contains the drive letter.
 */

const ensureWindowsDriveLetter = (url, baseUrl) => {
  try {
    url = String(new URL(url));
  } catch (e) {
    throw new Error(`absolute url expected but got ${url}`);
  }

  if (!isWindows) {
    return url;
  }

  try {
    baseUrl = String(new URL(baseUrl));
  } catch (e) {
    throw new Error(`absolute baseUrl expected but got ${baseUrl} to ensure windows drive letter on ${url}`);
  }

  if (!url.startsWith("file://")) {
    return url;
  }

  const afterProtocol = url.slice("file://".length); // we still have the windows drive letter

  if (extractDriveLetter(afterProtocol)) {
    return url;
  } // drive letter was lost, restore it


  const baseUrlOrFallback = baseUrl.startsWith("file://") ? baseUrl : baseUrlFallback;
  const driveLetter = extractDriveLetter(baseUrlOrFallback.slice("file://".length));

  if (!driveLetter) {
    throw new Error(`drive letter expected on baseUrl but got ${baseUrl} to ensure windows drive letter on ${url}`);
  }

  return `file:///${driveLetter}:${afterProtocol}`;
};

const extractDriveLetter = ressource => {
  // we still have the windows drive letter
  if (/[a-zA-Z]/.test(ressource[1]) && ressource[2] === ":") {
    return ressource[1];
  }

  return null;
};

process.platform === "win32";

const urlIsInsideOf = (url, otherUrl) => {
  const urlObject = new URL(url);
  const otherUrlObject = new URL(otherUrl);

  if (urlObject.origin !== otherUrlObject.origin) {
    return false;
  }

  const urlPathname = urlObject.pathname;
  const otherUrlPathname = otherUrlObject.pathname;

  if (urlPathname === otherUrlPathname) {
    return false;
  }

  const isInside = urlPathname.startsWith(otherUrlPathname);
  return isInside;
};

const getRealFileSystemUrlSync = (fileUrl, {
  followLink = true
} = {}) => {
  const pathname = new URL(fileUrl).pathname;
  const parts = pathname.slice(1).split("/");
  let reconstructedFileUrl = `file:///`;

  if (process.platform === "win32") {
    const windowsDriveLetter = parts.shift();
    reconstructedFileUrl += `${windowsDriveLetter}/`;
  }

  let i = 0; // eslint-disable-next-line no-constant-condition

  while (true) {
    const name = parts[i];
    i++;
    let namesOnFileSystem;

    try {
      namesOnFileSystem = node_fs.readdirSync( // When Node.js receives "C:/" on windows it returns
      // the process.cwd() directory content...
      // This can be fixed by passing "file:///C:/" directly but as a url object
      new URL(reconstructedFileUrl));
    } catch (e) {
      if (e && e.code === "ENOENT") {
        return null;
      }

      throw e;
    }

    const foundOnFilesystem = namesOnFileSystem.includes(name);

    if (foundOnFilesystem) {
      reconstructedFileUrl += name;
    } else {
      const nameOnFileSystem = namesOnFileSystem.find(nameCandidate => nameCandidate.toLowerCase() === name.toLowerCase());

      if (!nameOnFileSystem) {
        return null;
      }

      reconstructedFileUrl += nameOnFileSystem;
    }

    if (i === parts.length) {
      if (followLink) {
        const realPath = node_fs.realpathSync.native(urlToFileSystemPath(reconstructedFileUrl));
        return fileSystemPathToUrl(realPath);
      }

      return reconstructedFileUrl;
    }

    reconstructedFileUrl += "/";
  }
};

util.promisify(fs.readFile);

process.platform === "win32";

/* eslint-disable import/max-dependencies */
process.platform === "linux"; // linux does not support recursive option

// https://github.com/browserify/resolve/blob/a09a2e7f16273970be4639313c83b913daea15d7/lib/core.json#L1
// https://nodejs.org/api/modules.html#modules_module_builtinmodules
// https://stackoverflow.com/a/35825896
// https://github.com/browserify/resolve/blob/master/lib/core.json#L1
const isSpecifierForNodeCoreModule = specifier => {
  return specifier.startsWith("node:") || NODE_CORE_MODULE_SPECIFIERS.includes(specifier);
};
const NODE_CORE_MODULE_SPECIFIERS = ["assert", "assert/strict", "async_hooks", "buffer_ieee754", "buffer", "child_process", "cluster", "console", "constants", "crypto", "_debugger", "dgram", "dns", "domain", "events", "freelist", "fs", "fs/promises", "_http_agent", "_http_client", "_http_common", "_http_incoming", "_http_outgoing", "_http_server", "http", "http2", "https", "inspector", "_linklist", "module", "net", "node-inspect/lib/_inspect", "node-inspect/lib/internal/inspect_client", "node-inspect/lib/internal/inspect_repl", "os", "path", "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "smalloc", "_stream_duplex", "_stream_transform", "_stream_wrap", "_stream_passthrough", "_stream_readable", "_stream_writable", "stream", "stream/promises", "string_decoder", "sys", "timers", "_tls_common", "_tls_legacy", "_tls_wrap", "tls", "trace_events", "tty", "url", "util", "v8/tools/arguments", "v8/tools/codemap", "v8/tools/consarray", "v8/tools/csvparser", "v8/tools/logreader", "v8/tools/profile_view", "v8/tools/splaytree", "v8", "vm", "worker_threads", "zlib", // global is special
"global"];

const assertImportMap = value => {
  if (value === null) {
    throw new TypeError(`an importMap must be an object, got null`);
  }

  const type = typeof value;

  if (type !== "object") {
    throw new TypeError(`an importMap must be an object, received ${value}`);
  }

  if (Array.isArray(value)) {
    throw new TypeError(`an importMap must be an object, received array ${value}`);
  }
};

const hasScheme = string => {
  return /^[a-zA-Z]{2,}:/.test(string);
};

const urlToScheme = urlString => {
  const colonIndex = urlString.indexOf(":");
  if (colonIndex === -1) return "";
  return urlString.slice(0, colonIndex);
};

const urlToPathname = urlString => {
  return ressourceToPathname(urlToRessource(urlString));
};

const urlToRessource = urlString => {
  const scheme = urlToScheme(urlString);

  if (scheme === "file") {
    return urlString.slice("file://".length);
  }

  if (scheme === "https" || scheme === "http") {
    // remove origin
    const afterProtocol = urlString.slice(scheme.length + "://".length);
    const pathnameSlashIndex = afterProtocol.indexOf("/", "://".length);
    return afterProtocol.slice(pathnameSlashIndex);
  }

  return urlString.slice(scheme.length + 1);
};

const ressourceToPathname = ressource => {
  const searchSeparatorIndex = ressource.indexOf("?");
  return searchSeparatorIndex === -1 ? ressource : ressource.slice(0, searchSeparatorIndex);
};

const urlToOrigin = urlString => {
  const scheme = urlToScheme(urlString);

  if (scheme === "file") {
    return "file://";
  }

  if (scheme === "http" || scheme === "https") {
    const secondProtocolSlashIndex = scheme.length + "://".length;
    const pathnameSlashIndex = urlString.indexOf("/", secondProtocolSlashIndex);
    if (pathnameSlashIndex === -1) return urlString;
    return urlString.slice(0, pathnameSlashIndex);
  }

  return urlString.slice(0, scheme.length + 1);
};

const pathnameToParentPathname = pathname => {
  const slashLastIndex = pathname.lastIndexOf("/");

  if (slashLastIndex === -1) {
    return "/";
  }

  return pathname.slice(0, slashLastIndex + 1);
};

// could be useful: https://url.spec.whatwg.org/#url-miscellaneous
const resolveUrl = (specifier, baseUrl) => {
  if (baseUrl) {
    if (typeof baseUrl !== "string") {
      throw new TypeError(writeBaseUrlMustBeAString({
        baseUrl,
        specifier
      }));
    }

    if (!hasScheme(baseUrl)) {
      throw new Error(writeBaseUrlMustBeAbsolute({
        baseUrl,
        specifier
      }));
    }
  }

  if (hasScheme(specifier)) {
    return specifier;
  }

  if (!baseUrl) {
    throw new Error(writeBaseUrlRequired({
      baseUrl,
      specifier
    }));
  } // scheme relative


  if (specifier.slice(0, 2) === "//") {
    return `${urlToScheme(baseUrl)}:${specifier}`;
  } // origin relative


  if (specifier[0] === "/") {
    return `${urlToOrigin(baseUrl)}${specifier}`;
  }

  const baseOrigin = urlToOrigin(baseUrl);
  const basePathname = urlToPathname(baseUrl);

  if (specifier === ".") {
    const baseDirectoryPathname = pathnameToParentPathname(basePathname);
    return `${baseOrigin}${baseDirectoryPathname}`;
  } // pathname relative inside


  if (specifier.slice(0, 2) === "./") {
    const baseDirectoryPathname = pathnameToParentPathname(basePathname);
    return `${baseOrigin}${baseDirectoryPathname}${specifier.slice(2)}`;
  } // pathname relative outside


  if (specifier.slice(0, 3) === "../") {
    let unresolvedPathname = specifier;
    const importerFolders = basePathname.split("/");
    importerFolders.pop();

    while (unresolvedPathname.slice(0, 3) === "../") {
      unresolvedPathname = unresolvedPathname.slice(3); // when there is no folder left to resolved
      // we just ignore '../'

      if (importerFolders.length) {
        importerFolders.pop();
      }
    }

    const resolvedPathname = `${importerFolders.join("/")}/${unresolvedPathname}`;
    return `${baseOrigin}${resolvedPathname}`;
  } // bare


  if (basePathname === "") {
    return `${baseOrigin}/${specifier}`;
  }

  if (basePathname[basePathname.length] === "/") {
    return `${baseOrigin}${basePathname}${specifier}`;
  }

  return `${baseOrigin}${pathnameToParentPathname(basePathname)}${specifier}`;
};

const writeBaseUrlMustBeAString = ({
  baseUrl,
  specifier
}) => `baseUrl must be a string.
--- base url ---
${baseUrl}
--- specifier ---
${specifier}`;

const writeBaseUrlMustBeAbsolute = ({
  baseUrl,
  specifier
}) => `baseUrl must be absolute.
--- base url ---
${baseUrl}
--- specifier ---
${specifier}`;

const writeBaseUrlRequired = ({
  baseUrl,
  specifier
}) => `baseUrl required to resolve relative specifier.
--- base url ---
${baseUrl}
--- specifier ---
${specifier}`;

const tryUrlResolution = (string, url) => {
  const result = resolveUrl(string, url);
  return hasScheme(result) ? result : null;
};

const resolveSpecifier = (specifier, importer) => {
  if (specifier === "." || specifier[0] === "/" || specifier.startsWith("./") || specifier.startsWith("../")) {
    return resolveUrl(specifier, importer);
  }

  if (hasScheme(specifier)) {
    return specifier;
  }

  return null;
};

const applyImportMap = ({
  importMap,
  specifier,
  importer,
  createBareSpecifierError = ({
    specifier,
    importer
  }) => {
    return new Error(createDetailedMessage(`Unmapped bare specifier.`, {
      specifier,
      importer
    }));
  },
  onImportMapping = () => {}
}) => {
  assertImportMap(importMap);

  if (typeof specifier !== "string") {
    throw new TypeError(createDetailedMessage("specifier must be a string.", {
      specifier,
      importer
    }));
  }

  if (importer) {
    if (typeof importer !== "string") {
      throw new TypeError(createDetailedMessage("importer must be a string.", {
        importer,
        specifier
      }));
    }

    if (!hasScheme(importer)) {
      throw new Error(createDetailedMessage(`importer must be an absolute url.`, {
        importer,
        specifier
      }));
    }
  }

  const specifierUrl = resolveSpecifier(specifier, importer);
  const specifierNormalized = specifierUrl || specifier;
  const {
    scopes
  } = importMap;

  if (scopes && importer) {
    const scopeSpecifierMatching = Object.keys(scopes).find(scopeSpecifier => {
      return scopeSpecifier === importer || specifierIsPrefixOf(scopeSpecifier, importer);
    });

    if (scopeSpecifierMatching) {
      const scopeMappings = scopes[scopeSpecifierMatching];
      const mappingFromScopes = applyMappings(scopeMappings, specifierNormalized, scopeSpecifierMatching, onImportMapping);

      if (mappingFromScopes !== null) {
        return mappingFromScopes;
      }
    }
  }

  const {
    imports
  } = importMap;

  if (imports) {
    const mappingFromImports = applyMappings(imports, specifierNormalized, undefined, onImportMapping);

    if (mappingFromImports !== null) {
      return mappingFromImports;
    }
  }

  if (specifierUrl) {
    return specifierUrl;
  }

  throw createBareSpecifierError({
    specifier,
    importer
  });
};

const applyMappings = (mappings, specifierNormalized, scope, onImportMapping) => {
  const specifierCandidates = Object.keys(mappings);
  let i = 0;

  while (i < specifierCandidates.length) {
    const specifierCandidate = specifierCandidates[i];
    i++;

    if (specifierCandidate === specifierNormalized) {
      const address = mappings[specifierCandidate];
      onImportMapping({
        scope,
        from: specifierCandidate,
        to: address,
        before: specifierNormalized,
        after: address
      });
      return address;
    }

    if (specifierIsPrefixOf(specifierCandidate, specifierNormalized)) {
      const address = mappings[specifierCandidate];
      const afterSpecifier = specifierNormalized.slice(specifierCandidate.length);
      const addressFinal = tryUrlResolution(afterSpecifier, address);
      onImportMapping({
        scope,
        from: specifierCandidate,
        to: address,
        before: specifierNormalized,
        after: addressFinal
      });
      return addressFinal;
    }
  }

  return null;
};

const specifierIsPrefixOf = (specifierHref, href) => {
  return specifierHref[specifierHref.length - 1] === "/" && href.startsWith(specifierHref);
};

const sortImports = imports => {
  const mappingsSorted = {};
  Object.keys(imports).sort(compareLengthOrLocaleCompare).forEach(name => {
    mappingsSorted[name] = imports[name];
  });
  return mappingsSorted;
};
const sortScopes = scopes => {
  const scopesSorted = {};
  Object.keys(scopes).sort(compareLengthOrLocaleCompare).forEach(scopeSpecifier => {
    scopesSorted[scopeSpecifier] = sortImports(scopes[scopeSpecifier]);
  });
  return scopesSorted;
};

const compareLengthOrLocaleCompare = (a, b) => {
  return b.length - a.length || a.localeCompare(b);
};

const normalizeImportMap = (importMap, baseUrl) => {
  assertImportMap(importMap);

  if (!isStringOrUrl(baseUrl)) {
    throw new TypeError(formulateBaseUrlMustBeStringOrUrl({
      baseUrl
    }));
  }

  const {
    imports,
    scopes
  } = importMap;
  return {
    imports: imports ? normalizeMappings(imports, baseUrl) : undefined,
    scopes: scopes ? normalizeScopes(scopes, baseUrl) : undefined
  };
};

const isStringOrUrl = value => {
  if (typeof value === "string") {
    return true;
  }

  if (typeof URL === "function" && value instanceof URL) {
    return true;
  }

  return false;
};

const normalizeMappings = (mappings, baseUrl) => {
  const mappingsNormalized = {};
  Object.keys(mappings).forEach(specifier => {
    const address = mappings[specifier];

    if (typeof address !== "string") {
      console.warn(formulateAddressMustBeAString({
        address,
        specifier
      }));
      return;
    }

    const specifierResolved = resolveSpecifier(specifier, baseUrl) || specifier;
    const addressUrl = tryUrlResolution(address, baseUrl);

    if (addressUrl === null) {
      console.warn(formulateAdressResolutionFailed({
        address,
        baseUrl,
        specifier
      }));
      return;
    }

    if (specifier.endsWith("/") && !addressUrl.endsWith("/")) {
      console.warn(formulateAddressUrlRequiresTrailingSlash({
        addressUrl,
        address,
        specifier
      }));
      return;
    }

    mappingsNormalized[specifierResolved] = addressUrl;
  });
  return sortImports(mappingsNormalized);
};

const normalizeScopes = (scopes, baseUrl) => {
  const scopesNormalized = {};
  Object.keys(scopes).forEach(scopeSpecifier => {
    const scopeMappings = scopes[scopeSpecifier];
    const scopeUrl = tryUrlResolution(scopeSpecifier, baseUrl);

    if (scopeUrl === null) {
      console.warn(formulateScopeResolutionFailed({
        scope: scopeSpecifier,
        baseUrl
      }));
      return;
    }

    const scopeValueNormalized = normalizeMappings(scopeMappings, baseUrl);
    scopesNormalized[scopeUrl] = scopeValueNormalized;
  });
  return sortScopes(scopesNormalized);
};

const formulateBaseUrlMustBeStringOrUrl = ({
  baseUrl
}) => `baseUrl must be a string or an url.
--- base url ---
${baseUrl}`;

const formulateAddressMustBeAString = ({
  specifier,
  address
}) => `Address must be a string.
--- address ---
${address}
--- specifier ---
${specifier}`;

const formulateAdressResolutionFailed = ({
  address,
  baseUrl,
  specifier
}) => `Address url resolution failed.
--- address ---
${address}
--- base url ---
${baseUrl}
--- specifier ---
${specifier}`;

const formulateAddressUrlRequiresTrailingSlash = ({
  addressURL,
  address,
  specifier
}) => `Address must end with /.
--- address url ---
${addressURL}
--- address ---
${address}
--- specifier ---
${specifier}`;

const formulateScopeResolutionFailed = ({
  scope,
  baseUrl
}) => `Scope url resolution failed.
--- scope ---
${scope}
--- base url ---
${baseUrl}`;

const pathnameToExtension = pathname => {
  const slashLastIndex = pathname.lastIndexOf("/");

  if (slashLastIndex !== -1) {
    pathname = pathname.slice(slashLastIndex + 1);
  }

  const dotLastIndex = pathname.lastIndexOf(".");
  if (dotLastIndex === -1) return ""; // if (dotLastIndex === pathname.length - 1) return ""

  return pathname.slice(dotLastIndex);
};

const resolveImport = ({
  specifier,
  importer,
  importMap,
  defaultExtension = false,
  createBareSpecifierError,
  onImportMapping = () => {}
}) => {
  let url;

  if (importMap) {
    url = applyImportMap({
      importMap,
      specifier,
      importer,
      createBareSpecifierError,
      onImportMapping
    });
  } else {
    url = resolveUrl(specifier, importer);
  }

  if (defaultExtension) {
    url = applyDefaultExtension({
      url,
      importer,
      defaultExtension
    });
  }

  return url;
};

const applyDefaultExtension = ({
  url,
  importer,
  defaultExtension
}) => {
  if (urlToPathname(url).endsWith("/")) {
    return url;
  }

  if (typeof defaultExtension === "string") {
    const extension = pathnameToExtension(url);

    if (extension === "") {
      return `${url}${defaultExtension}`;
    }

    return url;
  }

  if (defaultExtension === true) {
    const extension = pathnameToExtension(url);

    if (extension === "" && importer) {
      const importerPathname = urlToPathname(importer);
      const importerExtension = pathnameToExtension(importerPathname);
      return `${url}${importerExtension}`;
    }
  }

  return url;
};

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

  if (!urlIsInsideOf(importMapFileUrl, projectDirectoryUrl)) {
    logger.warn(`import map file is outside project.
--- import map file ---
${urlToFileSystemPath(importMapFileUrl)}
--- project directory ---
${urlToFileSystemPath(projectDirectoryUrl)}`);
  }

  let importMapFileBuffer;
  const importMapFilePath = urlToFileSystemPath(importMapFileUrl);

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

  return normalizeImportMap(importMap, importMapFileUrl);
};

const applyUrlResolution = (specifier, importer) => {
  const url = resolveUrl$1(specifier, importer);
  return ensureWindowsDriveLetter(url, importer);
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
    return resolveImport({
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
  importDefaultExtension = false,
  node = false
}) => {
  projectDirectoryUrl = assertAndNormalizeDirectoryUrl(projectDirectoryUrl);
  const logger = createLogger({
    logLevel
  });
  logger.debug(`
resolve import for project.
--- specifier ---
${source}
--- importer ---
${file}
--- project directory path ---
${urlToFileSystemPath(projectDirectoryUrl)}`);

  if (node && isSpecifierForNodeCoreModule(source)) {
    logger.debug(`-> native node module`);
    return {
      found: true,
      path: null
    };
  }

  const specifier = source;
  const importer = String(fileSystemPathToUrl(file));

  try {
    let importUrl = applyImportMapResolution(specifier, {
      logger,
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

    importUrl = ensureWindowsDriveLetter(importUrl, importer);

    if (importUrl.startsWith("file://")) {
      return handleFileUrl(importUrl, {
        logger,
        projectDirectoryUrl,
        caseSensitive
      });
    }

    if (importUrl.startsWith("https://") || importUrl.startsWith("http://")) {
      logger.debug(`-> consider found because of http(s) scheme ${importUrl}`);
      return handleHttpUrl(importUrl);
    }

    if (importUrl.startsWith("node:")) {
      logger.warn(`Warning: ${file} is using "node" scheme but "node" parameter is not enabled (importing "${source}")`);
    }

    logger.debug(`-> consider not found because of scheme ${importUrl}`);
    return handleRemainingUrl(importUrl);
  } catch (e) {
    logger.error(e.stack);
    return {
      found: false,
      path: null
    };
  }
};

const handleFileUrl = (fileUrl, {
  logger,
  caseSensitive
}) => {
  fileUrl = `file://${new URL(fileUrl).pathname}`; // remove query params from url

  const realFileUrl = getRealFileSystemUrlSync(fileUrl, {
    // we don't follow link because we care only about the theoric file location
    // without this realFileUrl and fileUrl can be different
    // and we would log the warning about case sensitivity
    followLink: false
  });
  const filePath = urlToFileSystemPath(fileUrl);

  if (!realFileUrl) {
    logger.debug(`-> file not found at ${fileUrl}`);
    return {
      found: false,
      path: filePath
    };
  }

  const realFilePath = urlToFileSystemPath(realFileUrl);

  if (caseSensitive && realFileUrl !== fileUrl) {
    logger.warn(`WARNING: file found for ${filePath} but would not be found on a case sensitive filesystem.
The real file path is ${realFilePath}.
You can choose to disable this warning by disabling case sensitivity.
If you do so keep in mind windows users would not find that file.`);
    return {
      found: false,
      path: realFilePath
    };
  }

  logger.debug(`-> found file at ${realFilePath}`);
  return {
    found: true,
    path: realFilePath
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

exports.interfaceVersion = interfaceVersion;
exports.resolve = resolve;

//# sourceMappingURL=jsenv_importmap_eslint_resolver.cjs.map