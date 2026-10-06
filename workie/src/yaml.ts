import { stringify } from "yaml";

/**
 * Serialize a workflow object as YAML. Uses 2-space indentation, double-quoted
 * strings, and preserves key order (the `yaml` package walks object keys in
 * insertion order by default).
 */
export function yaml(workflow: object): string {
  return stringify(workflow, {
    indent: 2,
    // Quote strings that contain special characters or look like other types.
    // Plain strings without special chars stay unquoted.
    defaultStringType: "PLAIN",
    defaultKeyType: "PLAIN",
    // Use double quotes if quoting is needed.
    singleQuote: false,
    lineWidth: 0,
    // Workflows sometimes reuse the same env object across steps; expand the
    // second use inline rather than emitting a YAML anchor + alias.
    aliasDuplicateObjects: false,
  });
}
