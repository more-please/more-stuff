import { version as glslangVersion } from "./build/glslang-wasm.ts";
import { check, type RawVariable } from "./src/module.ts";
import {
  driverLimits,
  isVersion100,
  LIMITS,
  type Limits,
  packs,
  reservedIdentifiers,
  type Target,
  VERSIONS,
} from "./src/webgl.ts";

export { LIMITS, type Limits, type Target };

// The version of glslang this package is built from.
export const version = glslangVersion;

export type Stage = "vertex" | "fragment";

export type Shader = {
  // Used in diagnostics; its extension gives the stage if `stage` is not set:
  // .vert or .vs for a vertex shader, .frag or .fs for a fragment shader.
  name: string;
  source: string;
  stage?: Stage;
};

export type Options = {
  // Which WebGL to check against: "webgl2" by default.
  target?: Target;
  // Any limits to check against in place of the target's minimums.
  limits?: Partial<Limits>;
};

export type Diagnostic = {
  severity: "error" | "warning";
  // The shader it is in, and the line, unless it is about the program.
  name?: string;
  line?: number;
  message: string;
};

export type Variable = {
  name: string;
  // Its type, or its elements' if it is an array.
  type: string;
  // The array size, or 1.
  size: number;
  stages: Stage[];
};

export type Block = {
  name: string;
  bytes: number;
  stages: Stage[];
};

export type Result = {
  ok: boolean;
  diagnostics: Diagnostic[];
  // What the linked program uses, if the shaders compile and link.
  program?: {
    uniforms: Variable[];
    uniformBlocks: Block[];
    attributes: Variable[];
  };
};

const STAGES: Record<Stage, number> = { vertex: 0, fragment: 4 };

export function stageOf(name: string): Stage | undefined {
  if (/\.(vert|vs)$/.test(name)) {
    return "vertex";
  }
  if (/\.(frag|fs)$/.test(name)) {
    return "fragment";
  }
  return undefined;
}

// Validates shaders as a WebGL program: compiles each, and if they all
// compile, links them -- at most one shader for each stage -- and checks
// the program against the target's limits.
export function validate(shaders: Shader[], options: Options = {}): Result {
  const target = options.target ?? "webgl2";
  const limits = { ...LIMITS[target], ...options.limits };
  const diagnostics: Diagnostic[] = [];
  const error = (message: string, name?: string, line?: number) =>
    diagnostics.push({ severity: "error", name, line, message });

  const staged = shaders.map((shader) => {
    const stage = shader.stage ?? stageOf(shader.name);
    if (!stage) {
      throw new Error(
        `${shader.name}: no stage given, and none from its extension`,
      );
    }
    return { ...shader, stage };
  });
  for (const stage of Object.keys(STAGES) as Stage[]) {
    const extra = staged.filter((s) => s.stage === stage).slice(1);
    for (const shader of extra) {
      error(`a program has only one ${stage} shader`, shader.name);
    }
  }
  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  const raw = check(
    staged.map((s) => ({
      stage: STAGES[s.stage],
      name: s.name,
      source: s.source,
      restricted: isVersion100(s.source),
    })),
    driverLimits(limits),
  );
  for (const [i, shader] of raw.shaders.entries()) {
    const { name, source } = staged[i]!;
    diagnostics.push(...parseLog(shader.log));
    if (shader.version !== undefined) {
      if (!shader.es || !VERSIONS[target].includes(shader.version)) {
        const es = shader.es ? " es" : "";
        error(
          `'#version ${shader.version}${es}' : ${target} accepts ${VERSIONS[target].map((v) => (v === 100 ? "100" : `${v} es`)).join(" or ")}`,
          name,
        );
      }
    }
    for (const { line, message } of reservedIdentifiers(
      source,
      limits.maxIdentifierLength,
    )) {
      error(message, name, line);
    }
  }
  if (raw.linkLog) {
    diagnostics.push(...parseLog(raw.linkLog));
  }

  let program: Result["program"];
  if (raw.linked && raw.uniforms && raw.uniformBlocks && raw.attributes) {
    const { uniforms, uniformBlocks } = raw;
    // The program's inputs are the first stage's: attributes only if that
    // is a vertex shader, and not its built-in inputs.
    const attributes = staged.some((s) => s.stage === "vertex")
      ? raw.attributes.filter((a) => !a.name.startsWith("gl_"))
      : [];
    for (const message of programLimits(
      uniforms,
      uniformBlocks,
      attributes,
      limits,
    )) {
      error(message);
    }
    program = {
      uniforms: uniforms.map(variable),
      uniformBlocks: uniformBlocks.map((b) => ({
        name: b.name,
        bytes: b.size,
        stages: stagesOf(b.stages),
      })),
      attributes: attributes.map(variable),
    };
  }
  return {
    ok: !diagnostics.some((d) => d.severity === "error"),
    diagnostics,
    program,
  };
}

// A diagnostic as compilers print one: `name:line: error: message`.
export function formatDiagnostic(d: Diagnostic): string {
  const where = d.name
    ? `${d.name}${d.line === undefined ? "" : `:${d.line}`}: `
    : "";
  return `${where}${d.severity}: ${d.message}`;
}

// glslang's info log: `ERROR: name:line: message` or `WARNING: ...`, with a
// linking error's details on the indented lines after it, and a count of
// the errors at the end, which is left out.
function parseLog(log: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const text of log.split("\n")) {
    const m = /^(ERROR|WARNING): (?:(.+?):(\d+): )?(.*?)\s*$/.exec(text);
    if (m) {
      const message = m[4]!;
      if (
        /^\d+ compilation errors?\./.test(message) ||
        message === "'' : compilation terminated"
      ) {
        continue;
      }
      diagnostics.push({
        severity: m[1] === "ERROR" ? "error" : "warning",
        ...(m[2] === undefined ? {} : { name: m[2], line: Number(m[3]) }),
        message,
      });
    } else if (/^\s+\S/.test(text) && diagnostics.length > 0) {
      diagnostics[diagnostics.length - 1]!.message += `\n${text.trimEnd()}`;
    }
  }
  return diagnostics;
}

function stagesOf(mask: number): Stage[] {
  return (Object.keys(STAGES) as Stage[]).filter(
    (s) => (mask & (1 << STAGES[s])) !== 0,
  );
}

// glslang's type as GLSL has it: mat4 rather than mat4x4, and without the
// array size, which is the variable's size.
function variable(v: RawVariable): Variable {
  return {
    name: v.name,
    type: (v.type ?? "")
      .trim()
      .replace(/^mat(\d)x\1$/, "mat$1")
      .replace(/(\[\d*\])+$/, ""),
    size: v.size,
    stages: stagesOf(v.stages),
  };
}

// What the program uses of each stage's limits, counting only what it uses,
// as WebGL does.
function programLimits(
  uniforms: RawVariable[],
  blocks: RawVariable[],
  attributes: RawVariable[],
  limits: Limits,
): string[] {
  const errors: string[] = [];
  const over = (what: string, used: number, max: number) => {
    if (used > max) {
      errors.push(`${what}: ${used} used, ${max} available`);
    }
  };
  const inStage = (vs: RawVariable[], stage: Stage) =>
    vs.filter((v) => (v.stages & (1 << STAGES[stage])) !== 0);
  const count = (vs: RawVariable[]) => vs.reduce((n, v) => n + v.size, 0);

  const samplers = uniforms.filter((u) => u.sampler);
  over(
    "vertex shader texture units",
    count(inStage(samplers, "vertex")),
    limits.maxVertexTextureImageUnits,
  );
  over(
    "fragment shader texture units",
    count(inStage(samplers, "fragment")),
    limits.maxTextureImageUnits,
  );
  over(
    "combined texture units",
    count(samplers),
    limits.maxCombinedTextureImageUnits,
  );

  const loose = uniforms.filter((u) => !u.sampler && u.index < 0);
  const vectors: [Stage, number][] = [
    ["vertex", limits.maxVertexUniformVectors],
    ["fragment", limits.maxFragmentUniformVectors],
  ];
  for (const [stage, max] of vectors) {
    const used = inStage(loose, stage).map((u) => ({
      rows: u.rows * u.size,
      columns: u.columns,
    }));
    if (used.length > 0 && !packs(used, max)) {
      const rows = used.reduce((n, u) => n + u.rows, 0);
      errors.push(
        `${stage} shader uniforms do not fit in ${max} vectors (${rows} rows to pack)`,
      );
    }
  }

  over(
    "vertex shader uniform blocks",
    inStage(blocks, "vertex").length,
    limits.maxVertexUniformBlocks,
  );
  over(
    "fragment shader uniform blocks",
    inStage(blocks, "fragment").length,
    limits.maxFragmentUniformBlocks,
  );
  over(
    "combined uniform blocks",
    blocks.length,
    limits.maxCombinedUniformBlocks,
  );

  over(
    "vertex attribute locations",
    attributes.reduce((n, a) => n + a.rows * a.size, 0),
    limits.maxVertexAttribs,
  );
  return errors;
}
