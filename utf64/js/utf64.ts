const base64 =
  "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";

// A-W encodes frequently-used whitespace and punctuation
//               _ABCDEFGHIJKLMNOPQRSTU V W
const special = `_"',.;:!?()[]{}#=+-*/\\\n `;

// X is 0-63 (note some redundancy with the chars above)
// Y is 64-127 (ditto)
// Z is codepoints 128+ (bottom 6 bits of UTF-8)

export function encode(str: string): string {
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
      throw new Error(`Invalid Unicode code point: ${n}`);
    }
    for (let b = bytes - 1; b >= 0; --b) {
      const value = (n >> (6 * b)) & 0x3f;
      result.push(base64[value]!);
    }
  }
  return "".concat(...result);
}

export function decode(str: string): string {
  const result: string[] = [];
  const iter = str[Symbol.iterator]();
  const next = () => {
    const n = iter.next();
    if (n.done) {
      throw new Error("Unexpected end of input");
    }
    const c = n.value.codePointAt(0)!;
    if (c === 95) {
      return 0; // _
    } else if (c >= 65 && c <= 90) {
      return 1 + (c - 65); // A-Z
    } else if (c >= 97 && c <= 122) {
      return 27 + (c - 97); // a-z
    } else if (c >= 48 && c <= 57) {
      return 53 + (c - 48); // 0-9
    } else if (c === 45) {
      return 63; // -
    }
    throw new Error(`Invalid UTF-64 character: '${n.value}'`);
  };
  for (let n = iter.next(); !n.done; n = iter.next()) {
    let c = n.value;
    // a-z, 0-9 and - are encoded as themselves
    if (
      (c >= "a" && c <= "z") ||
      (c >= "0" && c <= "9") ||
      c === "-" ||
      c === "_"
    ) {
      result.push(c);
      continue;
    }
    // _ and A-W are mapped to special characters
    if (c >= "A" && c <= "W") {
      result.push(special[c.codePointAt(0)! - 64]!);
      continue;
    }
    // X and Y are low and high halves of 7-bit ASCII
    if (c === "X") {
      const i = next();
      result.push(String.fromCodePoint(i));
      continue;
    }
    if (c === "Y") {
      const i = next();
      result.push(String.fromCodePoint(64 + i));
      continue;
    }
    // Remaining encodings are packed UTF-8 (without the synchronisation bits)
    if (c != "Z") {
      throw new Error(`Invalid UTF-64 character: '${c}'`);
    }
    let i = next();
    let bytes: number;
    if (i < 0x20) {
      i &= 0x1f;
      bytes = 1;
    } else if (i < 0x30) {
      i &= 0xf;
      bytes = 2;
    } else if (i < 0x38) {
      i &= 0x7;
      bytes = 3;
    } else {
      throw new Error(`Invalid UTF-8 prefix: '${i}'`);
    }
    for (let b = 0; b < bytes; ++b) {
      i = (i << 6) + next();
    }
    result.push(String.fromCodePoint(i));
  }
  return "".concat(...result);
}
