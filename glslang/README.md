# glslang

Validate GLSL ES shaders for WebGL with Khronos's reference compiler, glslang, compiled to WebAssembly: no native binaries, and nothing to install but the package.

It checks what a browser would reject, before a browser sees it: each shader as the GLSL ES spec has it, the vertex and fragment shaders linked as a program, and the program against the limits every WebGL implementation guarantees.

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
  * [From the command line](#from-the-command-line)
  * [From JavaScript](#from-javascript)
- [What it checks](#what-it-checks)
- [Versions](#versions)
- [Building](#building)
- [License](#license)

<!-- tocstop -->

## Installation

```sh
npm add -D @moreplease/glslang
```

## Usage

### From the command line

```sh
npx glslang shaders/*.vert shaders/*.frag
npx glslang --target webgl1 sprite.vert sprite.frag
```

Each file's stage is its extension's: `.vert` or `.vs` for a vertex shader, `.frag` or `.fs` for a fragment shader. Files with the same name but for the extension are linked as one program. Errors are printed as `file:line: error: message`, and the exit status is 1 if there are any.

### From JavaScript

```ts
import { formatDiagnostic, validate } from "@moreplease/glslang";

const result = await validate(
  [
    { name: "sprite.vert", source: vertexSource },
    { name: "sprite.frag", source: fragmentSource },
  ],
  { target: "webgl2" },
);
if (!result.ok) {
  throw new Error(result.diagnostics.map(formatDiagnostic).join("\n"));
}
```

`validate` works in Node and in browsers, and returns a promise. It compiles the WebAssembly module the first time it is called, asynchronously, in under half a second; after that, a program takes a few milliseconds, or tens for one of thousands of lines.

| Export | Description |
| --- | --- |
| `validate(shaders, options?)` | Validates up to one vertex and one fragment shader as a program, resolving to the result. Each shader is `{ name, source, stage? }`, the stage from the name's extension if not given. Options are the `target`, `"webgl2"` (the default) or `"webgl1"`, and any `limits` to check against in place of its minimums. |
| `formatDiagnostic(diagnostic)` | A diagnostic as `name:line: error: message`. |
| `stageOf(name)` | The stage a file name's extension gives, if any. |
| `LIMITS` | Each target's minimum limits. |
| `version` | The version of glslang the package is built from. |

The result is `{ ok, diagnostics, program? }`. Each diagnostic has a `severity`, `"error"` or `"warning"`, a `message`, and the shader's `name` and the `line`, unless it is about the program as a whole. If the shaders compile and link, `program` lists the uniforms, uniform blocks and vertex attributes the program uses: each one's name, type and array size, and the stages that use it.

## What it checks

- **Each shader**, by glslang's GLSL ES front end: syntax, types, built-in functions and variables, precision, and the version, which must be `#version 300 es` or `100` for WebGL 2, and `100` for WebGL 1. GLSL ES 1.00 shaders are held to the restrictions on loops and indexing in the spec's Appendix A, which WebGL requires.
- **The program**, by glslang's linker: that the stages agree on the variables they share, including the precision of each uniform.
- **WebGL's own rules**: identifiers beginning `webgl_` or `_webgl_` are reserved, and none may be longer than 256 characters in WebGL 1, or 1024 in WebGL 2.
- **The program's use of the limits**, counting only what it uses, as WebGL does: texture units in each stage and in all, uniform vectors in each stage, packed as GLSL ES 1.00's Appendix A.7 packs them, uniform blocks, and vertex attribute locations.

The limits are the least any implementation of the target has, so a program within them works on every device. Pass `limits` to check against a particular device's instead.

Not checked yet: the vectors used by the varyings between the stages.

## Versions

The package version is glslang's version plus a packaging revision: `@moreplease/glslang@16.6.0-1` is built from glslang 16.6.0, and the revision only changes for a fix to the packaging.

## Building

```sh
pnpm build
```

`build.ts` clones the pinned glslang release into `node_modules/.cache`, checks it against its commit, and compiles its GLSL front end with `src/driver.cpp` to `wasm32-wasi`, using the Zig toolchain from [@moreplease/zig](https://www.npmjs.com/package/@moreplease/zig). The module is written to `build/glslang.wasm`, and as base64 to `build/glslang-wasm.ts`, which the package imports: a module of its own, which loads the same way everywhere, with no bundler configuration. The first build takes a minute or two; Zig's cache makes later ones take a few seconds.

The module needs only a handful of WASI calls, which the package provides itself, so it does not depend on Node's `node:wasi`.

## License

The package's own code is under the 0BSD license (see [LICENSE](LICENSE)). glslang is under its own licenses: see [LICENSE.glslang.txt](LICENSE.glslang.txt).
