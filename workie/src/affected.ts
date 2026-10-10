// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub Actions ${{ ... }} expressions are intentional string literals.
import type {
  Affected,
  AffectedOptions,
  TaskRoot,
  WorkflowStep,
} from "./types.ts";

export const AFFECTED_STEP_ID = "workie";

const OUTPUTS = `steps.${AFFECTED_STEP_ID}.outputs`;

/** Build the `affected` helpers handed to a template for the given roots. */
export function affected(roots: TaskRoot[]): Affected {
  return {
    step: (options = {}) => affectedStep(roots, options),
    filter: `\${{ ${OUTPUTS}.filter }}`,
    if: (subset) => (subset ? affectedIf(subset) : `${OUTPUTS}.filter != ''`),
  };
}

function affectedIf(roots: TaskRoot[]): string {
  if (roots.length === 0) {
    return "false";
  }
  return roots
    .map(
      (r) => `contains(format(' {0} ', ${OUTPUTS}.roots), ' ${r.pkg.name} ')`,
    )
    .join(" || ");
}

/**
 * The step that works out which roots the change set touches. A root is
 * affected when a changed file matches one of its paths or one of the
 * `always` globs. A manual run (or any event other than `push` and
 * `pull_request`) affects every root.
 *
 * For a pull request, the change set is the diff between the merge commit
 * GitHub tests and its first parent, the base branch. For a push, it's the
 * diff between `before` and the pushed commit. Missing commits are fetched,
 * so any checkout depth works; if they can't be fetched, every root runs.
 */
function affectedStep(
  roots: TaskRoot[],
  { always = [] }: AffectedOptions,
): WorkflowStep {
  const lines = [
    "changes() {",
    '  case "$GITHUB_EVENT_NAME" in',
    "    pull_request)",
    '      git cat-file -e "$GITHUB_SHA^1" 2>/dev/null ||',
    '        git fetch --quiet --no-tags --depth=2 origin "$GITHUB_SHA" || return',
    '      git diff --name-only "$GITHUB_SHA^1" "$GITHUB_SHA" ;;',
    "    push)",
    '      [[ ! "$BEFORE" =~ ^0*$ ]] || return',
    '      { git cat-file -e "$BEFORE^{commit}" && git cat-file -e "$GITHUB_SHA^{commit}"; } 2>/dev/null ||',
    '        git fetch --quiet --no-tags --depth=1 origin "$BEFORE" "$GITHUB_SHA" || return',
    '      git diff --name-only "$BEFORE" "$GITHUB_SHA" ;;',
    "    *) return 1 ;;",
    "  esac",
    "}",
    always.length > 0
      ? `if files=$(changes) && ! grep -qE ${shellQuote(pathsRegExp(always))} <<< "$files"; then`
      : "if files=$(changes); then",
    '  hit() { grep -qE -- "$1" <<< "$files"; }',
    "else",
    '  echo "Running every package ($GITHUB_EVENT_NAME)"',
    "  hit() { true; }",
    "fi",
    'roots=""',
    'filter=""',
    ...roots.map((r) => {
      const name = shellQuote(` ${r.pkg.name}`);
      const flag = shellQuote(` --filter=${r.pkg.name}`);
      return `if hit ${shellQuote(pathsRegExp(r.paths))}; then roots+=${name}; filter+=${flag}; fi`;
    }),
    'echo "Affected:${roots:- none}"',
    'echo "roots=${roots# }" >> "$GITHUB_OUTPUT"',
    'echo "filter=${filter# }" >> "$GITHUB_OUTPUT"',
  ];
  return {
    name: "workie affected",
    id: AFFECTED_STEP_ID,
    shell: "bash",
    env: { BEFORE: "${{ github.event.before }}" },
    run: `${lines.join("\n")}\n`,
  };
}

/** An extended regexp matching any of the given GitHub Actions path globs. */
export function pathsRegExp(globs: string[]): string {
  return `^(${globs.map(globToRegExp).join("|")})$`;
}

/**
 * Translate a GitHub Actions path glob to an extended regexp (unanchored).
 * Supports `*`, `**` and `?`; negated (`!`) patterns aren't supported.
 */
export function globToRegExp(glob: string): string {
  if (glob.startsWith("!")) {
    throw new Error(`workie: negated path globs aren't supported: ${glob}`);
  }
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i] as string;
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        re += "(.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") {
      re += "[^/]*";
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^$()|[\]{}\\]/, "\\$&");
    }
  }
  return re;
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
