# importmap ESLint resolver [![npm package](https://img.shields.io/npm/v/@jsenv/importmap-eslint-resolver.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/importmap-eslint-resolver) [![github main](https://github.com/jsenv/importmap-eslint-resolver/workflows/main/badge.svg)](https://github.com/jsenv/importmap-eslint-resolver/actions?workflow=main) [![codecov coverage](https://codecov.io/gh/jsenv/importmap-eslint-resolver/branch/master/graph/badge.svg)](https://codecov.io/gh/jsenv/importmap-eslint-resolver)

Import maps are used to remap import to somewhere else. For instance the following importmap allows to remap `"foo"` to `"./foo.js"`.

```json
{
  "imports": {
    "foo": "./foo.js"
  }
}
```

By providing this importmap to the browser or Node.js, js imports resolution becomes aware of the importmap file remappings. You can write the following js file and it would search for file at `"./foo.js"`.

```js
import { value } from "foo"

console.log(value)
```

If you use `import/no-unresolved` rule from `eslint-plugin-import` these imports are reported as not resolved as shown in images below.

![screenshot import not resolved in vscode](./docs/vscode-import-not-resolved.png)</br >
![screenshot eslint error in vscode](./docs/eslint-error-in-vscode.png)

This is why `@jsenv/importmap-eslint-resolver` exists: to make `import/no-unresolved` compatible with importmap file.

— see [ESLint website](https://eslint.org)<br />
— see [eslint-plugin-import on github](https://github.com/benmosher/eslint-plugin-import)<br />
— see [importmap spec on github](https://github.com/WICG/import-maps)<br />

# Installation

Follow the steps below to enable importmap resolution for ESLint.

1 - Install _eslint-plugin-import_

```console
npm install --save-dev eslint-plugin-import
```

2 - Install _@jsenv/importmap-eslint-resolver_

```console
npm install --save-dev @jsenv/importmap-eslint-resolver
```

3 - Configure ESLint

Your ESLint config must:

- enable `"import"` in `plugins`
- configure `"import/resolver"` to use `@jsenv/importmap-eslint-resolver` as resolver
- configure `projectDirectoryUrl` and `importMapFileRelativeUrl`

The minimal `.eslintrc.cjs` file look like this:

```js
module.exports = {
  plugins: ["import"],
  settings: {
    "import/resolver": {
      "@jsenv/importmap-eslint-resolver": {
        projectDirectoryUrl: __dirname,
        importMapFileRelativeUrl: "./project.importmap",
      },
    },
  },
}
```

# Configuration

**By default** the resolution is:

- case sensitive
- browser like
  - consider node core modules (fs, url) as not found
  - do not implement node module resolution
  - do not understand path without extension (does not try to auto add extension)

This resolution **default** behaviour is documented in this section and **can be configured to your convenience**.

## importMapFileRelativeUrl

_importMapFileRelativeUrl_ parameter is a string leading to an importmap file.
This parameter is optional and `undefined` by default.

```js
module.exports = {
  plugins: ["import"],
  settings: {
    "import/resolver": {
      "@jsenv/importmap-eslint-resolver": {
        projectDirectoryUrl: __dirname,
        importMapFileRelativeUrl: "./project.importmap",
      },
    },
  },
}
```

## caseSensitive

_caseSensitive_ parameter is a boolean indicating if the file path will be case sensitive. This parameter is optional and enabled by default. See [Case sensitivity](#Case-sensitivity).

```js
module.exports = {
  plugins: ["import"],
  settings: {
    "import/resolver": {
      "@jsenv/importmap-eslint-resolver": {
        projectDirectoryUrl: __dirname,
        importMapFileRelativeUrl: "./project.importmap",
        caseSensitive: false,
      },
    },
  },
}
```

## importDefaultExtension

_importDefaultExtension_ parameter is a boolean indicating if a default extension will be automatically added to import without file extension.
This parameter is optional and disabled by default.
See [Extensionless import](#Extensionless-import)

When enabled the following import

```js
import { value } from "./file"
```

Will search for a file with an extension. The extension is "inherited" from the file where the import is written:

If written in `whatever.js`, searches at `file.js`.<br />
If written in `whatever.ts`, searches at `file.ts`.

## node

_node_ parameter is a boolean indicating if the file are written for Node.js. This parameter is optional and disabled by default. See [Node module resolution](#Node-module-resolution)

When enabled node core modules (path, fs, url, etc) will be considered as found.

```js
module.exports = {
  plugins: ["import"],
  settings: {
    "import/resolver": {
      "@jsenv/importmap-eslint-resolver": {
        projectDirectoryUrl: __dirname,
        node: true,
      },
    },
  },
}
```

# Advanced configuration example

In a project mixing files written for the browser AND for Node.js you should tell ESLint which are which. This is possible thanks to `overrides` documented on ESLint in [Configuration Based on Glob Patterns](https://eslint.org/docs/user-guide/configuring/configuration-files#configuration-based-on-glob-patterns).

`.eslintrc.cjs`

```js
const eslintConfig = {
  plugins: ["import"],
  overrides: [],
}

// by default consider files as written for browsers
Object.assign(eslintConfig, {
  env: {
    es6: true,
    browser: true,
    node: false,
  },
  settings: {
    "import/resolver": {
      "@jsenv/importmap-eslint-resolver": {
        projectDirectoryUrl: __dirname,
        importMapFileRelativeUrl: "./project.importmap",
      },
    },
  },
})

// but consider files inside script/ as written for Node.js
eslintConfig.overrides.push({
  files: ["script/**/*.js"],
  env: {
    es6: true,
    browser: false,
    node: true,
  },
  settings: {
    "import/resolver": {
      "@jsenv/importmap-eslint-resolver": {
        node: true,
      },
    },
  },
})

// and any file ending with .cjs as written for Node.js with commonjs module resolution
eslintConfig.overrides.push({
  files: ["**/*.cjs"],
  env: {
    es6: true,
    browser: false,
    node: true,
  },
  settings: {
    "import/resolver": {
      node: true,
    },
  },
})

module.exports = eslintConfig
```

# About

## Case sensitivity

This resolver is case sensitive by default: An import is found only if the import path and actual file on the filesystem have same case.

```js
import { getUser } from "./getUser.js"
```

The import above is found only if there is a file `getUser.js`. It won't be found if file is named `getuser.js`, even if the filesystem is case insensitive.

This ensure two things:

- Project is compatible with Windows or other operating system where filesystem is case sensitive.
- import paths are consistent with what is actually on the filesystem

Case sensitivity can be disabled using [caseSensitive parameter](#Configuration)

## Node module resolution

As mentionned previously this resolver behaves by default like a browser. It must be configured to be compatible node module resolution.

If your file is written for node, please inform the resolver using [node parameter](#Configuration) so that it consider node core modules as found.

Before seing how to get node module resolution, please note there is two distinct resolution:

- `Commonjs module resolution`
- `ES module resolution`

### Node esm resolution

The importmap file must contain all the mappings corresponding to the [node esm resolution algorithm](https://nodejs.org/dist/latest-v16.x/docs/api/esm.html#esm_resolution_algorithm). You can do this by using [@jsenv/importmap-node-module](https://github.com/jsenv/importmap-node-module) to generate your importmap file.

### Node commonjs resolution

Configure the resolver to use node as in [Advanced configuration example](#Advanced-configuration-example)

## Extensionless import

Extensionless import means an import where the specifier omits the file extension.

```js
import { value } from "./file"
```

But these type of specifier are problematic: you don't know where to look at for the corresponding file.

- Is it `./file` ?
- Is it `./file.js` ?
- Is it `./file.ts` ?

The best solution to avoid configuring your brain and your browser is to keep the extension on the specifier.

```diff
- import { value } from './file'
+ import { value } from './file.js'
```

But if for some reason this is problematic you can allow extensionless specifiers using [defaultExtension parameter](#Configuration)

## Bare specifier

A specifier is what is written after the from keyword in an import statement.

```js
import value from "specifier"
```

If there is no mapping of `"specifier"` to `"./specifier.js"` the imported file will not be found.
This is because import map consider `"specifier"` as a special kind of specifier called bare specifier.
And every bare specifier must have a mapping or it cannot be resolved.
To fix this either add a mapping or put explicitely `"./specifier.js"`.

Please note that `"specifier.js"` is also a bare specifier. You should write `"./specifier.js"` instead.
