// What WebGL guarantees, and the checks it makes that glslang does not.

export type Target = "webgl1" | "webgl2";

// The least each limit can be on any conforming implementation, so a
// program within them runs everywhere.
export type Limits = {
  maxVertexAttribs: number;
  maxVertexUniformVectors: number;
  maxVaryingVectors: number;
  maxVertexTextureImageUnits: number;
  maxCombinedTextureImageUnits: number;
  maxTextureImageUnits: number;
  maxFragmentUniformVectors: number;
  maxDrawBuffers: number;
  maxVertexOutputVectors: number;
  maxFragmentInputVectors: number;
  minProgramTexelOffset: number;
  maxProgramTexelOffset: number;
  maxVertexUniformBlocks: number;
  maxFragmentUniformBlocks: number;
  maxCombinedUniformBlocks: number;
  maxIdentifierLength: number;
};

export const LIMITS: Record<Target, Limits> = {
  webgl1: {
    maxVertexAttribs: 8,
    maxVertexUniformVectors: 128,
    maxVaryingVectors: 8,
    maxVertexTextureImageUnits: 0,
    maxCombinedTextureImageUnits: 8,
    maxTextureImageUnits: 8,
    maxFragmentUniformVectors: 16,
    maxDrawBuffers: 1,
    maxVertexOutputVectors: 16,
    maxFragmentInputVectors: 15,
    minProgramTexelOffset: -8,
    maxProgramTexelOffset: 7,
    maxVertexUniformBlocks: 0,
    maxFragmentUniformBlocks: 0,
    maxCombinedUniformBlocks: 0,
    maxIdentifierLength: 256,
  },
  webgl2: {
    maxVertexAttribs: 16,
    maxVertexUniformVectors: 256,
    maxVaryingVectors: 15,
    maxVertexTextureImageUnits: 16,
    maxCombinedTextureImageUnits: 32,
    maxTextureImageUnits: 16,
    maxFragmentUniformVectors: 224,
    maxDrawBuffers: 4,
    maxVertexOutputVectors: 16,
    maxFragmentInputVectors: 15,
    minProgramTexelOffset: -8,
    maxProgramTexelOffset: 7,
    maxVertexUniformBlocks: 12,
    maxFragmentUniformBlocks: 12,
    maxCombinedUniformBlocks: 24,
    maxIdentifierLength: 1024,
  },
};

// The GLSL versions each target compiles: GLSL ES 1.00, and for WebGL 2, 3.00.
export const VERSIONS: Record<Target, number[]> = {
  webgl1: [100],
  webgl2: [100, 300],
};

// The limits in the order src/driver.cpp reads them.
export function driverLimits(limits: Limits): number[] {
  return [
    limits.maxVertexAttribs,
    limits.maxVertexUniformVectors,
    limits.maxVaryingVectors,
    limits.maxVertexTextureImageUnits,
    limits.maxCombinedTextureImageUnits,
    limits.maxTextureImageUnits,
    limits.maxFragmentUniformVectors,
    limits.maxDrawBuffers,
    limits.maxVertexOutputVectors,
    limits.maxFragmentInputVectors,
    limits.minProgramTexelOffset,
    limits.maxProgramTexelOffset,
  ];
}

// Whether a shader is GLSL ES 1.00, whose loops and indexing WebGL
// restricts as its Appendix A allows: one with no #version, or #version 100.
export function isVersion100(source: string): boolean {
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " ");
  const m = /^\s*#\s*version\s+(\d+)/.exec(code);
  return !m || m[1] === "100";
}

// Whether variables of `rows` x `columns` each, arrays counted out, fit in
// `maxRows` vectors as GLSL ES 1.00's Appendix A.7 packs them: the 4-column
// variables from the top, then the 3-column ones beside the space a 1-column
// variable can take, then the 2-column ones in two columns either side, and
// last the 1-column ones each into the smallest gap that holds them.
export function packs(
  variables: { rows: number; columns: number }[],
  maxRows: number,
): boolean {
  const sorted = [...variables].sort(
    (a, b) => b.columns - a.columns || b.rows - a.rows,
  );
  const width = (n: number) => sorted.filter((v) => v.columns === n);
  const rowsOf = (vs: { rows: number }[]) =>
    vs.reduce((sum, v) => sum + v.rows, 0);
  const used = new Uint8Array(maxRows);
  const fill = (top: number, rows: number, column: number, n: number) => {
    for (let r = top; r < top + rows; r++) {
      used[r]! |= ((1 << n) - 1) << column;
    }
  };

  let top = rowsOf(width(4));
  if (top > maxRows) {
    return false;
  }
  fill(0, top, 0, 4);
  const threes = rowsOf(width(3));
  if (top + threes > maxRows) {
    return false;
  }
  fill(top, threes, 0, 3);
  top += threes;

  const available = maxRows - top;
  let left = available;
  let right = available;
  for (const v of width(2)) {
    if (v.rows <= left) {
      left -= v.rows;
    } else if (v.rows <= right) {
      right -= v.rows;
    } else {
      return false;
    }
  }
  fill(top, available - left, 0, 2);
  fill(maxRows - (available - right), available - right, 2, 2);

  for (const v of width(1)) {
    let best: { row: number; size: number; column: number } | undefined;
    for (let column = 0; column < 4; column++) {
      let start = -1;
      for (let row = 0; row <= maxRows; row++) {
        const free = row < maxRows && (used[row]! & (1 << column)) === 0;
        if (free && start < 0) {
          start = row;
        } else if (!free && start >= 0) {
          const size = row - start;
          if (size >= v.rows && (!best || size < best.size)) {
            best = { row: start, size, column };
          }
          start = -1;
        }
      }
    }
    if (!best) {
      return false;
    }
    fill(best.row, v.rows, best.column, 1);
  }
  return true;
}

// Each identifier in a shader that WebGL reserves, with its line: those
// beginning `webgl_` or `_webgl_`, and those longer than the target allows.
export function reservedIdentifiers(
  source: string,
  maxLength: number,
): { line: number; message: string }[] {
  const found: { line: number; message: string }[] = [];
  // Comments become spaces, keeping their newlines, so lines still count.
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
  const lines = code.split("\n");
  for (const [i, text] of lines.entries()) {
    for (const [name] of text.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
      if (/^_?webgl_/.test(name)) {
        found.push({
          line: i + 1,
          message: `'${name}' : identifiers beginning "webgl_" or "_webgl_" are reserved by WebGL`,
        });
      } else if (name.length > maxLength) {
        found.push({
          line: i + 1,
          message: `'${name.slice(0, 32)}...' : identifier is longer than WebGL's ${maxLength} characters`,
        });
      }
    }
  }
  return found;
}
