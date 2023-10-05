export type ResultOK<T> = {
  ok: true;
  value: T;
};

export type ResultErr = {
  ok: false;
  err: string;
};

export type Result<T> = ResultOK<T> | ResultErr;

export function ok<T>(value: T): ResultOK<T> {
  return { ok: true, value };
}

export function err(message: string): ResultErr {
  return { ok: false, err: message };
}

export function fatal<T>(message: string): NonNullable<T> & never {
  throw new Error(message);
}

export function unwrap<T>(result: Result<T>): T {
  return result.ok ? result.value : fatal(result.err);
}

export function isOK<T>(result: Result<T>): ResultOK<T> | undefined {
  return result.ok ? result : undefined;
}

export function isErr<T>(result: Result<T>): ResultErr | undefined {
  return result.ok ? undefined : result;
}
