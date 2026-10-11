import { wasm } from "../build/glslang-wasm.ts";

// What the module reports for a set of shaders (src/driver.cpp).
export type RawVariable = {
  name: string;
  type?: string;
  size: number;
  index: number;
  stages: number;
  rows: number;
  columns: number;
  sampler: boolean;
};

export type RawResult = {
  shaders: { ok: boolean; log: string; version?: number; es?: boolean }[];
  linked?: boolean;
  linkLog?: string;
  uniforms?: RawVariable[];
  uniformBlocks?: RawVariable[];
  attributes?: RawVariable[];
};

type Exports = {
  memory: WebAssembly.Memory;
  _initialize(): void;
  alloc(size: number): number;
  release(pointer: number): void;
  check(
    count: number,
    stages: number,
    names: number,
    sources: number,
    restricted: number,
    limits: number,
  ): number;
};

// The module is built for WASI, but glslang never touches a file or the
// environment, so these few calls are all it needs: anything it writes to
// stdout or stderr goes to the console.
function wasiImports(memory: () => WebAssembly.Memory) {
  const EBADF = 8;
  const decoder = new TextDecoder();
  return {
    environ_sizes_get(count: number, size: number) {
      const view = new DataView(memory().buffer);
      view.setUint32(count, 0, true);
      view.setUint32(size, 0, true);
      return 0;
    },
    environ_get: () => 0,
    fd_write(_fd: number, iovs: number, iovsLength: number, written: number) {
      const view = new DataView(memory().buffer);
      let text = "";
      let total = 0;
      for (let i = 0; i < iovsLength; i++) {
        const pointer = view.getUint32(iovs + i * 8, true);
        const length = view.getUint32(iovs + i * 8 + 4, true);
        text += decoder.decode(
          new Uint8Array(memory().buffer, pointer, length),
        );
        total += length;
      }
      view.setUint32(written, total, true);
      console.error(text.trimEnd());
      return 0;
    },
    fd_close: () => EBADF,
    fd_seek: () => EBADF,
    fd_fdstat_get: () => EBADF,
    proc_exit(code: number): never {
      throw new Error(`glslang exited with code ${code}`);
    },
  };
}

let loaded: Exports | undefined;

function load(): Exports {
  if (!loaded) {
    const bytes = Uint8Array.from(atob(wasm), (c) => c.charCodeAt(0));
    const module = new WebAssembly.Module(bytes);
    const instance = new WebAssembly.Instance(module, {
      wasi_snapshot_preview1: wasiImports(() => exports.memory),
    });
    const exports = instance.exports as unknown as Exports;
    exports._initialize();
    loaded = exports;
  }
  return loaded;
}

// Compiles each shader, links them as a program if they all compile, and
// reflects the program: `stage` is glslang's (0 vertex, 4 fragment),
// `restricted` whether GLSL ES 1.00's Appendix A applies, and `limits` in
// the order src/driver.cpp reads them.
export function check(
  shaders: {
    stage: number;
    name: string;
    source: string;
    restricted: boolean;
  }[],
  limits: number[],
): RawResult {
  const m = load();
  const encoder = new TextEncoder();
  const allocated: number[] = [];
  const alloc = (size: number) => {
    const pointer = m.alloc(size);
    allocated.push(pointer);
    return pointer;
  };
  const string = (s: string) => {
    const bytes = encoder.encode(s);
    const pointer = alloc(bytes.length + 1);
    const memory = new Uint8Array(m.memory.buffer);
    memory.set(bytes, pointer);
    memory[pointer + bytes.length] = 0;
    return pointer;
  };
  const ints = (values: number[]) => {
    const pointer = alloc(values.length * 4);
    new Int32Array(m.memory.buffer, pointer, values.length).set(values);
    return pointer;
  };
  try {
    const names = shaders.map((s) => string(s.name));
    const sources = shaders.map((s) => string(s.source));
    const result = m.check(
      shaders.length,
      ints(shaders.map((s) => s.stage)),
      ints(names),
      ints(sources),
      ints(shaders.map((s) => (s.restricted ? 1 : 0))),
      ints(limits),
    );
    const memory = new Uint8Array(m.memory.buffer);
    const end = memory.indexOf(0, result);
    return JSON.parse(new TextDecoder().decode(memory.subarray(result, end)));
  } finally {
    for (const pointer of allocated) {
      m.release(pointer);
    }
  }
}
