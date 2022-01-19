/*
 * This file uses "@jsenv/core" to convert source files into commonjs format
 * and write them into "./dist/" directory.
 *
 * Read more at https://github.com/jsenv/jsenv-core/blob/master/docs/building/readme.md#node-package-build
 */

import { buildProject } from "@jsenv/core"

import { projectDirectoryUrl } from "../../jsenv.config.mjs"

await buildProject({
  projectDirectoryUrl,
  buildDirectoryRelativeUrl: "./dist/",
  format: "commonjs",
  entryPoints: {
    "./main.js": "jsenv_importmap_eslint_resolver.cjs",
  },
  preservedUrls: {
    // ensure this specific file is inlined
    // otherhwise a .js would be required when would throw
    // 'require() of ES modules is not supported'
    "./node_modules/@jsenv/importmap/src/isSpecifierForNodeCoreModule.js": false,
  },
  runtimeSupport: {
    node: "14.7.0",
  },
  buildDirectoryClean: true,
})
