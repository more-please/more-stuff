import { assert, test } from "vitest";

import { str_to_utf64 } from "./utf64";

test("str_to_utf64", () => {
  function check(lhs: string, rhs: string) {
    assert.equal(str_to_utf64(lhs), rhs);
  }
  check("", "");
  check("foo", "foo");
  check("one, two, three", "oneCVtwoCVthree");
  check("Hello", "YHello");
  check("Hello, world!", "YHelloCVworldG");
  check(`{"hello":["world","!"]}`, "OAhelloAFQAworldACAGARP");
  check("こんにちは", "ZiASZiBSZiAqZiAgZiAu");
  check("大家好", "ZkjmZkt1Zkk8");
  check("Ceud mìle fàilte", "YCeudVmZCrleVfZCfilte");
  check("🧐", "ZvemP");
  check("🇺🇸", "ZveG5ZveG3");
  check("🏴󠁧󠁢󠁳󠁣󠁴󠁿", "ZveOzZyfAmZyfAhZyfAyZyfAiZyfAzZyfA-");
});
