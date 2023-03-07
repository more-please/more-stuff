import { assert, test } from "vitest";

import { str_to_utf64 } from "./utf64";
import { valid_utf64 } from "./test.json";

test("str_to_utf64", () => {
  for (const [dest, src] of Object.entries(valid_utf64)) {
    assert.equal(dest, str_to_utf64(src));
  }
});
