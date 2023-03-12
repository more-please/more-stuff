import { assert, test } from "vitest";
import { invalid_utf64, valid_utf64 } from "./test.json";
import { str_to_utf64, utf64_to_str } from "./utf64";

for (const [dest, src] of Object.entries(valid_utf64)) {
  test(dest, () => {
    assert.equal(dest, str_to_utf64(src));
    assert.equal(src, utf64_to_str(dest));
  });
}

for (const [dest, reason] of Object.entries(invalid_utf64)) {
  test(reason, () => {
    assert.throws(() => {
      const src = utf64_to_str(dest);
      console.log(dest, "->", src);
    });
  });
}
