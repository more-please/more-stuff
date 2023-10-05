import { describe, expect, test } from "vitest";
import { gosub, gosubDecode, gosubEncode } from "gosub-goproxy/gosub.ts";

import type { GoproxyConfig } from "gosub-goproxy/goproxy.ts";
import { unwrap } from "gosub-goproxy/result";

type Test = {
  encoded: string;
  config: GoproxyConfig;
};
const TESTS: Test[] = [
  {
    encoded: "github.com/more-please/gosub;",
    config: {
      url: "https://github.com/more-please/gosub",
    },
  },
  {
    encoded: "github.com/more-please/gosub:m=scooby;",
    config: {
      url: "https://github.com/more-please/gosub",
      module: "scooby",
    },
  },
  {
    encoded: "github.com/more-please/gosub:d=goproxy;",
    config: {
      url: "https://github.com/more-please/gosub",
      directory: "goproxy",
    },
  },
  {
    encoded: "github.com/more-please/gosub:d=foo%2Fbar;",
    config: {
      url: "https://github.com/more-please/gosub",
      directory: "foo/bar",
    },
  },
  {
    encoded: "github.com/more-please/gosub:p=pre-&s=-post;",
    config: {
      url: "https://github.com/more-please/gosub",
      tagPrefix: "pre-",
      tagSuffix: "-post",
    },
  },
  {
    encoded: "github.com/more-please/gosub:p=;",
    config: {
      url: "https://github.com/more-please/gosub",
      tagPrefix: "",
    },
  },
];

describe("encode", () => {
  for (const { config, encoded } of TESTS) {
    test(encoded, () => {
      const actualEncoded = gosubEncode(config);
      expect(unwrap(actualEncoded)).toEqual(encoded);
    });
  }
});

describe("decode", () => {
  for (let { config, encoded } of TESTS) {
    for (const extra of ["", "ignore;", "/extra/stuff/"]) {
      test(encoded + extra, () => {
        const decode = gosubDecode(encoded + extra);
        expect(decode?.used).toEqual(encoded);
        expect(decode?.config).toEqual(config);
      });
    }
  }
});

describe("gosub", async () => {
  for (const base of ["/", "/base/"]) {
    for (const extra of ["", "ignore;", "/extra/stuff/"]) {
      for (let { config, encoded } of TESTS) {
        encoded = `${base}${encoded}`;
        test(encoded, async () => {
          const badRequest = new Request(
            `https://foo.bar/wrong${encoded}${extra}so/ignore/it`,
          );
          const goodRequest = new Request(`https://foo.bar${encoded}${extra}`);
          const goodResponse = new Response();
          const mockProxy = (proxyBase: string, proxyConfig: GoproxyConfig) => {
            expect(proxyBase).toEqual(encoded + "/");
            expect(proxyConfig).toEqual(config);
            return async (request: Request) => {
              expect(request).toBe(goodRequest);
              return goodResponse;
            };
          };
          const handler = gosub(base, { goproxy: mockProxy });
          expect(await handler(goodRequest)).toBe(goodResponse);
          expect(await handler(badRequest)).toBeUndefined();
        });
      }
    }
  }
});
