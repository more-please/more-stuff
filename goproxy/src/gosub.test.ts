import { describe, expect, test } from "vitest";
import { gosub, gosubDecode, gosubEncode } from "./gosub.ts";

import type { GoproxyConfig } from "./goproxy.ts";

const TESTS: Record<string, GoproxyConfig> = {
  "/github.com/more-please/gosub;": {
    repo: "https://github.com/more-please/gosub",
  },
  "/github.com/more-please/gosub;ignore/everything/after/;": {
    repo: "https://github.com/more-please/gosub",
  },
  "/test/base/github.com/more-please/gosub;": {
    base: "/test/base",
    repo: "https://github.com/more-please/gosub",
  },
  "/github.com/more-please/gosub:d=goproxy;ignored": {
    repo: "https://github.com/more-please/gosub",
    directory: "goproxy",
  },
  "/github.com/more-please/gosub:p=test-&s=-test;": {
    repo: "https://github.com/more-please/gosub",
    tagPrefix: "test-",
    tagSuffix: "-test",
  },
};

describe("encode", () => {
  for (const [dest, src] of Object.entries(TESTS)) {
    test(dest, () => {
      const expectedDest = dest.split(";")[0] + ";";
      const actualDest = gosubEncode(src);
      expect(actualDest).toEqual(expectedDest);
    });
  }
});

describe("decode", () => {
  for (const [dest, src] of Object.entries(TESTS)) {
    test(dest, () => {
      const actualSrc = gosubDecode(dest, src.base);
      expect(actualSrc).toEqual(src);
    });
  }
});

describe("gosub", async () => {
  for (const [dest, src] of Object.entries(TESTS)) {
    test(dest, async () => {
      const badRequest = new Request(
        `https://foo.bar/wrong${dest}so/ignore/it`,
      );
      const goodRequest = new Request(
        `https://foo.bar${dest}extra/goproxy/args`,
      );
      const goodResponse = new Response();
      const mockProxy = (config: GoproxyConfig) => {
        expect(config).toEqual(src);
        return async (request: Request) => {
          expect(request).toBe(goodRequest);
          return goodResponse;
        };
      };
      const handler = gosub({
        base: src.base,
        goproxy: mockProxy,
      });
      expect(await handler(goodRequest)).toBe(goodResponse);
      expect(await handler(badRequest)).toBeUndefined();
    });
  }
});
