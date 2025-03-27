import type { GoproxyConsole } from "gosub-goproxy/types.ts";
import { goproxyConsole } from "gosub-goproxy/logging.ts";
import { describe, expect, test } from "vitest";

function snoopLog(): { console: GoproxyConsole; count: () => number } {
  let n = 0;
  return {
    count: () => n,
    console: {
      info: () => ++n,
      log: () => ++n,
      warn: () => ++n,
      error: () => ++n,
    },
  };
}

describe("logging", () => {
  test("default is quiet", async () => {
    const { console, count } = snoopLog();
    const gconsole = goproxyConsole({}, { console });
    gconsole.info({ message: "hey" });
    gconsole.log({ message: "yo" });
    expect(count()).toBe(0);
    gconsole.warn({ message: "hey!" });
    expect(count()).toBe(1);
    gconsole.error({ message: "yo!" });
    expect(count()).toBe(2);
  });

  test("verbose logging via options.verbose", async () => {
    const { console, count } = snoopLog();
    const gconsole = goproxyConsole({}, { console, verbose: true });
    gconsole.info({ message: "hey" });
    expect(count()).toBe(1);
    gconsole.log({ message: "yo" });
    expect(count()).toBe(2);
    gconsole.warn({ message: "hey!" });
    expect(count()).toBe(3);
    gconsole.error({ message: "yo!" });
    expect(count()).toBe(4);
  });

  test("verbose logging via env.GOSUB_VERBOSE", async () => {
    const { console, count } = snoopLog();
    const gconsole = goproxyConsole({ GOSUB_VERBOSE: "1" }, { console });
    gconsole.info({ message: "hey" });
    expect(count()).toBe(1);
    gconsole.log({ message: "yo" });
    expect(count()).toBe(2);
    gconsole.warn({ message: "hey!" });
    expect(count()).toBe(3);
    gconsole.error({ message: "yo!" });
    expect(count()).toBe(4);
  });

  test("GOSUB_VERBOSE=0 means not verbose", async () => {
    const { console, count } = snoopLog();
    const gconsole = goproxyConsole({ GOSUB_VERBOSE: "0" }, { console });
    gconsole.info({ message: "hey" });
    gconsole.log({ message: "yo" });
    expect(count()).toBe(0);
    gconsole.warn({ message: "hey!" });
    expect(count()).toBe(1);
    gconsole.error({ message: "yo!" });
    expect(count()).toBe(2);
  });

  test("options overrides env", async () => {
    const { console, count } = snoopLog();
    const gconsole = goproxyConsole(
      { GOSUB_VERBOSE: "1" },
      { console, verbose: false },
    );
    gconsole.info({ message: "hey" });
    gconsole.log({ message: "yo" });
    expect(count()).toBe(0);
    gconsole.warn({ message: "hey!" });
    expect(count()).toBe(1);
    gconsole.error({ message: "yo!" });
    expect(count()).toBe(2);
  });
});
