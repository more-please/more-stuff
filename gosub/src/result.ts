export type ResultOK<T> = {
  ok: true;
  value: T;
};

export type ResultErr = {
  ok: false;
  message: string;
};

export type Result<T> = ResultOK<T> | ResultErr;

export function ok<T>(value: T): ResultOK<T> {
  return { ok: true, value };
}

export function err(cause: any): ResultErr {
  const message = cause instanceof Error ? cause.message : `${cause}`;
  return { ok: false, message };
}

export function fatal<T>(message: string): NonNullable<T> & never {
  throw new Error(message);
}

export function unwrap(result: undefined): undefined;
export function unwrap<T>(result: Result<T>): T;
export function unwrap<T>(result: Result<T> | undefined): T | undefined {
  if (!result) {
    return undefined;
  }
  if (!result.ok) {
    fatal(result.message);
  }
  return result.value;
}

export function isOK<T>(
  result: Result<T> | undefined,
): ResultOK<T> | undefined {
  return result?.ok ? result : undefined;
}

export function isErr<T>(result: Result<T> | undefined): ResultErr | undefined {
  return result?.ok ? undefined : result;
}
