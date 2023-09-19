export function removePrefix(
  prefix: string,
  from?: string,
): string | undefined {
  return from?.startsWith(prefix) ? from.substring(prefix.length) : undefined;
}

export function removeOptionalPrefix(prefix: string): undefined;
export function removeOptionalPrefix(prefix: string, from: string): string;
export function removeOptionalPrefix(
  prefix: string,
  from?: string,
): string | undefined {
  return from?.startsWith(prefix) ? from.substring(prefix.length) : from;
}

export function removeSuffix(
  suffix: string,
  from?: string,
): string | undefined {
  return from?.endsWith(suffix)
    ? from.substring(0, from.length - suffix.length)
    : undefined;
}
