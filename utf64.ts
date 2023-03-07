const base64 =
  "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";

// A-W encodes frequently-used whitespace and punctuation
//               _ABCDEFGHIJKLMNOPQRSTUVW
const special = `_"',.;:!?+-*/(){}[]<>= \n`;

// X is 0-63 (note some redundancy with the chars above)
// Y is 64-127 (ditto)
// Z is codepoints 128+ (bottom 6 bits of UTF-8)

export function str_to_utf64(str: string): string {
  const result: string[] = [];
  for (const c of str) {
    // a-z, 0-9 and - are encoded as themselves
    if ((c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "-") {
      result.push(c);
      continue;
    }
    // Characters in 'special' are mapped to the base64 alphabet
    const i = special.indexOf(c);
    if (i >= 0) {
      result.push(base64[i]!);
      continue;
    }
    // Other ASCII characters are mapped to two words (with some redundancy)
    const n = c.codePointAt(0)!;
    if (n < 64) {
      result.push("X");
      result.push(base64[n]!);
      continue;
    }
    if (n < 128) {
      result.push("Y");
      result.push(base64[n - 64]!);
      continue;
    }
    // Remaining encodings are packed UTF-8 (without the synchronisation bits)
    result.push("Z");
    let bytes: number;
    if (n <= 0x7ff) {
      result.push(base64[n >> 6]!);
      bytes = 1;
    } else if (n <= 0xffff) {
      result.push(base64[0x20 + (n >> 12)]!);
      bytes = 2;
    } else if (n <= 0x10ffff) {
      result.push(base64[0x30 + (n >> 18)]!);
      bytes = 3;
    } else {
      // Should never happen with a valid UTF-16 input string!
      throw new Error(`Codepoint out of permitted Unicode range: ${n}`);
    }
    for (let b = bytes - 1; b >= 0; --b) {
      const value = (n >> (6 * b)) & 0x3f;
      result.push(base64[value]!);
    }
  }
  return "".concat(...result);
}

export function utf64_to_str(str: string): string {
  return "foo";
}
