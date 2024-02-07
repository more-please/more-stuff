import * as utf64 from "./utf64";

import { assert, test } from "vitest";
import { invalid_utf64, valid_utf64 } from "../test.json";

for (const [dest, src] of Object.entries(valid_utf64)) {
  test(dest, () => {
    assert.equal(dest, utf64.encode(src));
    assert.equal(src, utf64.decode(dest));
  });
}

for (const [dest, reason] of Object.entries(invalid_utf64)) {
  test(reason, () => {
    assert.throws(() => {
      const src = utf64.decode(dest);
      console.log(dest, "->", src);
    });
  });
}
