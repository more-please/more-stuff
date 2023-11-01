import { GoproxyConfig, goproxy } from "gosub-goproxy/goproxy.ts";
import { describe, expect, test } from "vitest";

import { fatal } from "gosub-goproxy/result.ts";
import { unzip } from "unzipit";

type Test = {
  config: GoproxyConfig;
  error?: Record<string, number | undefined>;
  text?: Record<string, string>;
  json?: Record<string, any>;
  zip?: Record<string, Record<string, string>>;
};

const TAGS = [
  "v0.0.11\n",
  "nested-0.0.1\n",
  "example-0.0.2\n",
  "example-0.0.1\n",
].join("");

const TESTS: Test[] = [
  {
    config: {
      url: "https://github.com/more-please/no-such-repo",
      githubToken: process.env["GITHUB_TOKEN"],
    },
    error: {
      "invalid-path": undefined,
      "example/@gosub/tags": 404,
      "example/@v/list": 404,
      "example/@v/v1.2.3.info": 404,
      "example/@v/v1.2.3.mod": 404,
      "example/@v/v1.2.3.zip": 404,
    },
  },
  {
    config: {
      url: "https://github.com/more-please/gosub-goproxy",
      module: "example",
      directory: "test/example",
      tagPrefix: "example-",
      githubToken: process.env["GITHUB_TOKEN"],
    },
    error: {
      "invalid-path": undefined,
      "example/@v/v1.2.3.info": 404,
      "example/@v/v1.2.3.mod": 404,
      "example/@v/v1.2.3.zip": 404,
      "example/@v/v0.0.11.mod": 404,
      "example/@v/v0.0.11.zip": 404,
    },
    text: {
      "example/@gosub/tags": TAGS,
      "example/@v/list": "v0.0.2\nv0.0.1\n",
      "example/@v/v0.0.1.mod": "module example\n\ngo 1.21.1\n",
      "example/@v/v0.0.2.mod": "module example\n\ngo 1.21.1\n",
    },
    json: {
      "example/@v/v0.0.1.info": {
        Time: "2023-09-27T17:23:33Z",
        Version: "v0.0.1",
      },
      "example/@v/v0.0.2.info": {
        Version: "v0.0.2",
        Time: "2023-09-28T10:42:43Z",
      },
    },
    zip: {
      "example/@v/v0.0.1.zip": {
        "example@v0.0.1/example.go": `package main

import "fmt"

func main() {
	fmt.Println("Trivial example to test gosub-goproxy")
}
`,
        "example@v0.0.1/go.mod": "module example\n\ngo 1.21.1\n",
      },
      "example/@v/v0.0.2.zip": {
        "example@v0.0.2/example.go": `package main

import "fmt"

func main() {
	fmt.Println("Trivial example module. Should NOT include nested module.")
}
`,
        "example@v0.0.2/go.mod": "module example\n\ngo 1.21.1\n",
      },
    },
  },
  {
    config: {
      url: "https://github.com/more-please/gosub-goproxy",
      module: "nested",
      directory: "test/example/nested",
      tagPrefix: "nested-",
      githubToken: process.env["GITHUB_TOKEN"],
    },
    text: {
      "nested/@gosub/tags": TAGS,
      "nested/@v/list": "v0.0.1\n",
      "nested/@v/v0.0.1.mod": "module nested\n\ngo 1.21.1\n",
    },
    json: {
      "nested/@v/v0.0.1.info": {
        Version: "v0.0.1",
        Time: "2023-09-28T10:42:53Z",
      },
    },
    zip: {
      "nested/@v/v0.0.1.zip": {
        "nested@v0.0.1/go.mod": "module nested\n\ngo 1.21.1\n",
        "nested@v0.0.1/nested.go": `package main

import "fmt"

func main() {
	fmt.Println("This nested module shouldn't be included in example.zip")
}
`,
      },
    },
  },
];

describe("goproxy", async () => {
  for (const { config, error, text, json, zip } of TESTS) {
    const proxy = goproxy("/", config);
    for (const [name, status] of Object.entries(error ?? {})) {
      test(`error > ${name}`, async () => {
        const request = new Request(`https://foo.bar/${name}`);
        const response = await proxy(request);
        if (!response) {
          expect(status).toBeUndefined();
        } else {
          expect(response.ok).toBeFalsy();
          expect(response.status).toEqual(status);
        }
      });
    }
    for (const [name, expected] of Object.entries(text ?? {})) {
      test(`text > ${name}`, async () => {
        const request = new Request(`https://foo.bar/${name}`);
        const response = (await proxy(request)) ?? fatal("Expected a response");
        expect(response.ok).toBeTruthy();
        expect(response.headers.get("Content-Type")).toEqual(
          "text/plain; charset=utf-8",
        );
        const actual = await response.text();
        expect(actual).toEqual(expected);
      });
    }
    for (const [name, expected] of Object.entries(json ?? {})) {
      test(`json > ${name}`, async () => {
        const request = new Request(`https://foo.bar/${name}`);
        const response = (await proxy(request)) ?? fatal("Expected a response");
        expect(response.ok).toBeTruthy();
        expect(response.headers.get("Content-Type")).toEqual(
          "application/json",
        );
        const actual = await response.json();
        expect(actual).toEqual(expected);
      });
    }
    for (const [name, expected] of Object.entries(zip ?? {})) {
      describe(`zip > ${name}`, async () => {
        const request = new Request(`https://foo.bar/${name}`);
        const response = (await proxy(request)) ?? fatal("Expected a response");
        expect(response.ok).toBeTruthy();
        expect(response.headers.get("Content-Type")).toEqual("application/zip");
        const blob = await response.blob();
        const { entries } = await unzip(blob);
        expect(Object.keys(entries)).toEqual(Object.keys(expected));
        for (const [filename, entry] of Object.entries(entries)) {
          test(filename, async () => {
            const actual = await entry.text();
            expect(expected[filename]).toEqual(actual);
          });
        }
      });
    }
  }
});
