import { GoproxyConfig, goproxy } from "gosub-goproxy";
import { describe, expect, test } from "vitest";

import { unzip } from "unzipit";

function fail<T>(message: string): NonNullable<T> {
  throw new Error(message);
}

type Test = {
  config: GoproxyConfig;
  text: Record<string, string>;
  json: Record<string, any>;
  zip: Record<string, Record<string, string>>;
};

const TESTS: Test[] = [
  {
    config: {
      url: "https://github.com/more-please/gosub-goproxy",
      directory: "test/example",
      tagPrefix: "example-",
      githubToken:
        process.env["GITHUB_TOKEN"] ??
        fail("GITHUB_TOKEN env variable required"),
    },
    text: {
      "example/@v/list": "v0.0.1\n",
      "example/@v/v0.0.1.mod": "module example\n\ngo 1.21.1\n",
    },
    json: {
      "example/@v/v0.0.1.info": {
        Time: "2023-09-26T12:22:15Z",
        Version: "v0.0.1",
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
    },
  },
];

describe("goproxy", async () => {
  for (const { config, text, json, zip } of TESTS) {
    const proxy = goproxy("/", config);
    for (const [name, expected] of Object.entries(text)) {
      test(name, async () => {
        const request = new Request(`https://foo.bar/${name}`);
        const response = (await proxy(request)) ?? fail("Expected a response");
        expect(response.headers.get("Content-Type")).toEqual(
          "text/plain; charset=utf-8",
        );
        const actual = await response.text();
        expect(actual).toEqual(expected);
      });
    }
    for (const [name, expected] of Object.entries(json)) {
      test(name, async () => {
        const request = new Request(`https://foo.bar/${name}`);
        const response = (await proxy(request)) ?? fail("Expected a response");
        expect(response.headers.get("Content-Type")).toEqual(
          "application/json",
        );
        const actual = await response.json();
        expect(actual).toEqual(expected);
      });
    }
    for (const [name, expected] of Object.entries(zip)) {
      describe(name, async () => {
        const request = new Request(`https://foo.bar/${name}`);
        const response = (await proxy(request)) ?? fail("Expected a response");
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
