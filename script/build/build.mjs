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
    "./main.js": "./jsenv_importmap_eslint_resolver.prod.cjs",
  },
  babelPluginMap: getBabelPluginMapForNode(),
  buildDirectoryClean: true,
})
