import { assert, test } from "vitest";
import { str_to_utf64, utf64_to_str } from "./utf64";

import { valid_utf64 } from "./test.json";

for (const [dest, src] of Object.entries(valid_utf64)) {
  test(dest, () => {
    assert.equal(dest, str_to_utf64(src));
    assert.equal(src, utf64_to_str(dest));
  });
}
