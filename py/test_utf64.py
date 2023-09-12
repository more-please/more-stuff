import json
import unittest
import os

import utf64

_dir = os.path.dirname(__file__)
_json = os.path.join(_dir, "../test.json")
with open(_json, mode="r", encoding="utf-8") as f:
    _data = json.loads(f.read())


class TestUtf64(unittest.TestCase):
    def test_str_to_utf64(self):
        for dest, src in _data["valid_utf64"].items():
            self.assertEqual(dest, utf64.encode(src))

    def test_utf64_to_str(self):
        for dest, src in _data["valid_utf64"].items():
            self.assertEqual(src, utf64.decode(dest))

    def test_invalid_utf64(self):
        for dest, err in _data["invalid_utf64"].items():
            self.assertRaises(ValueError, utf64.decode, dest)


if __name__ == "__main__":
    unittest.main()
