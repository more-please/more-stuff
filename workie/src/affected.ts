// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub Actions ${{ ... }} expressions are intentional string literals.

/**
 * Arguments that limit `turbo run` to the packages the triggering change
 * affects: `--affected` on a pull request or push. Any other event, such as
 * a manual run, runs the task everywhere.
 */
export const AFFECTED_ARGS =
  "${{ (github.event_name == 'pull_request' || github.event_name == 'push') && '--affected' || '' }}";

/**
 * Env for the step that runs turbo. `--affected` compares against `main` by
 * default, which doesn't resolve in a pull request's checkout, so compare
 * against the merge commit's first parent: the base branch. On a push, turbo
 * reads `before` from the event payload instead, and the empty override is
 * ignored.
 */
export const AFFECTED_ENV = {
  TURBO_SCM_BASE:
    "${{ github.event_name == 'pull_request' && 'HEAD^1' || '' }}",
};
