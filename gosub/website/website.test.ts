import { dev } from "astro";
import { afterAll, describe, expect, test } from "vitest";

describe("website", { timeout: 30_000 }, async () => {
  const server = await dev({ logLevel: "debug" });
  afterAll(async () => {
    await server.stop();
  });
  test("/", async () => {
    const response = await fetch(`http://localhost:${server.address.port}/`);
    expect(response.ok).toBeTruthy();
  });
});
