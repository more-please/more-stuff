import { describe, expect, test } from "vitest";
import { formatDiagnostic, type Result, validate } from "./glslang.ts";
import { packs } from "./src/webgl.ts";

const VERTEX = `#version 300 es
in vec2 a_corner;
uniform mat4 u_viewProjection;
out vec2 v_uv;
void main() {
  v_uv = a_corner * 0.5 + 0.5;
  gl_Position = u_viewProjection * vec4(a_corner, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_image;
out vec4 color;
void main() {
  color = texture(u_image, v_uv);
}
`;

const messages = (result: Result) => result.diagnostics.map(formatDiagnostic);

describe("validate", () => {
  test("a program that compiles and links, and what it uses", async () => {
    const result = await validate([
      { name: "quad.vert", source: VERTEX },
      { name: "quad.frag", source: FRAGMENT },
    ]);
    expect(messages(result)).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.program).toEqual({
      uniforms: [
        {
          name: "u_viewProjection",
          type: "mat4",
          size: 1,
          stages: ["vertex"],
        },
        {
          name: "u_image",
          type: "sampler2D",
          size: 1,
          stages: ["fragment"],
        },
      ],
      uniformBlocks: [],
      attributes: [
        { name: "a_corner", type: "vec2", size: 1, stages: ["vertex"] },
      ],
    });
  });

  test("a compile error, where it is", async () => {
    const result = await validate([
      { name: "bad.frag", source: FRAGMENT.replace("v_uv)", "v_xy)") },
    ]);
    expect(result.ok).toBe(false);
    expect(messages(result)[0]).toBe(
      "bad.frag:7: error: 'v_xy' : undeclared identifier",
    );
  });

  test("a mismatch between the stages", async () => {
    const fragment = FRAGMENT.replace("in vec2 v_uv;", "in vec3 v_uv;").replace(
      "v_uv)",
      "v_uv.xy)",
    );
    const result = await validate([
      { name: "quad.vert", source: VERTEX },
      { name: "quad.frag", source: fragment },
    ]);
    expect(result.ok).toBe(false);
    expect(messages(result).join("\n")).toContain("v_uv");
  });

  test("the version each target accepts", async () => {
    const result = await validate([{ name: "quad.frag", source: FRAGMENT }], {
      target: "webgl1",
    });
    expect(messages(result)).toEqual([
      "quad.frag: error: '#version 300 es' : webgl1 accepts 100",
    ]);
  });

  test("GLSL ES 1.00's loops and indexing are restricted", async () => {
    const source = `precision mediump float;
uniform int u_count;
void main() {
  float sum = 0.0;
  for (int i = 0; i < u_count; i++) {
    sum += 1.0;
  }
  gl_FragColor = vec4(sum);
}
`;
    const result = await validate([{ name: "loop.frag", source }]);
    expect(result.ok).toBe(false);
    expect(messages(result)[0]).toMatch(/^loop\.frag:5: error: 'limitations'/);
    const v300 = `#version 300 es\nprecision mediump float;\nout vec4 color;\n${source.replace("precision mediump float;\n", "").replace("gl_FragColor", "color")}`;
    expect(
      messages(await validate([{ name: "loop.frag", source: v300 }])),
    ).toEqual([]);
  });

  test("identifiers WebGL reserves", async () => {
    const source = FRAGMENT.replaceAll("v_uv", "webgl_uv");
    const result = await validate([{ name: "quad.frag", source }]);
    expect(messages(result)).toContain(
      `quad.frag:3: error: 'webgl_uv' : identifiers beginning "webgl_" or "_webgl_" are reserved by WebGL`,
    );
  });

  test("texture units", async () => {
    const samplers = Array.from({ length: 17 }, (_, i) => `u_s${i}`);
    const source = `#version 300 es
precision highp float;
uniform sampler2D ${samplers.join(", ")};
out vec4 color;
void main() {
  color = ${samplers.map((s) => `texture(${s}, vec2(0.0))`).join(" + ")};
}
`;
    const result = await validate([{ name: "many.frag", source }]);
    expect(messages(result)).toEqual([
      "error: fragment shader texture units: 17 used, 16 available",
    ]);
  });

  test("uniform vectors", async () => {
    const source = (n: number) => `#version 300 es
precision highp float;
uniform vec4 u_v[${n}];
uniform int u_i;
out vec4 color;
void main() {
  color = u_v[u_i];
}
`;
    expect(
      (await validate([{ name: "fits.frag", source: source(223) }])).ok,
    ).toBe(true);
    expect(
      messages(await validate([{ name: "over.frag", source: source(224) }])),
    ).toEqual([
      "error: fragment shader uniforms do not fit in 224 vectors (225 rows to pack)",
    ]);
  });

  test("a stage from the extension, or given", async () => {
    await expect(
      validate([{ name: "shader.glsl", source: FRAGMENT }]),
    ).rejects.toThrow(/no stage/);
    expect(
      (
        await validate([
          { name: "shader.glsl", source: FRAGMENT, stage: "fragment" },
        ])
      ).ok,
    ).toBe(true);
  });
});

describe("packs", () => {
  test("columns share rows as Appendix A.7 has them", () => {
    // Four floats fit in one row, and a vec3 and a float share one.
    expect(packs(new Array(4).fill({ rows: 1, columns: 1 }), 1)).toBe(true);
    expect(
      packs(
        [
          { rows: 1, columns: 3 },
          { rows: 1, columns: 1 },
        ],
        1,
      ),
    ).toBe(true);
    expect(
      packs(
        [
          { rows: 1, columns: 3 },
          { rows: 1, columns: 2 },
        ],
        1,
      ),
    ).toBe(false);
    // Two vec2s side by side; a mat4 takes four whole rows.
    expect(packs(new Array(2).fill({ rows: 1, columns: 2 }), 1)).toBe(true);
    expect(packs([{ rows: 4, columns: 4 }], 3)).toBe(false);
  });
});
