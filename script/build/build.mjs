/*
 * This file uses "@jsenv/core" to convert source files into commonjs format
 * and write them into "./dist/" directory.
 *
 * Read more at https://github.com/jsenv/jsenv-core/blob/master/docs/building/readme.md#node-package-build
 */

import { buildProject, getBabelPluginMapForNode } from "@jsenv/core"

import * as jsenvConfig from "../../jsenv.config.mjs"

await buildProject({
  ...jsenvConfig,
  buildDirectoryRelativeUrl: "./dist/",
  format: "commonjs",
  entryPointMap: {
    "./main.js": "./jsenv_importmap_eslint_resolver.cjs",
  },
  babelPluginMap: getBabelPluginMapForNode(),
  externalImportUrlPatterns: {
    "node_modules/": true,
    // ensure this specific file is inlined
    // otherhwise a .js would be required when would throw
    // 'require() of ES modules is not supported'
    "node_modules/@jsenv/import-map/src/isSpecifierForNodeCoreModule.js": false,
  },
  buildDirectoryClean: true,
})
