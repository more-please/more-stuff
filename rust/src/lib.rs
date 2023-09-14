#![warn(missing_docs)]

//! utf-64 is a terse, human-readable, URL-safe encoding for JSONish strings

use std::str::Chars;

/// The trait for converting to/from UTF-64
pub trait UTF64 {
    /// The type for reporting conversion errors
    type Error;

    /// Convert a string-like object into utf-64
    fn encode_utf64(&self) -> Result<String, Self::Error>;

    /// Convert a utf-64-encoded string-like object back into the origial string
    fn decode_utf64(&self) -> Result<String, Self::Error>;
}

const BASE64: &str = "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
const SPECIAL: &str = "_\"',.;:!?()[]{}#=+-*/\\\n ";

impl<T: AsRef<str>> UTF64 for T {
    type Error = String;

    fn encode_utf64(&self) -> Result<String, Self::Error> {
        let mut result = String::new();
        for ch in self.as_ref().chars() {
            if matches!(ch, '-' | 'a'..='z' | '0'..='9') {
                result.push(ch);
                continue;
            }

            if let Some(index) = SPECIAL.find(ch) {
                result.push_str(&BASE64[index..index + 1]);
                continue;
            }

            let n = (ch as u32) as usize;

            if n < 64 {
                result.push('X');
                result.push_str(&BASE64[n..n + 1]);
                continue;
            }

            if n < 128 {
                result.push('Y');
                result.push_str(&BASE64[n - 64..n - 63]);
                continue;
            }

            result.push('Z');
            let (bytes, index) = if n < 0x7ff {
                (1, n >> 6)
            } else if n < 0xffff {
                (2, 0x20 + (n >> 12))
            } else if n < 0x10ffff {
                (3, 0x30 + (n >> 18))
            } else {
                return Err(format!("Invalid Unicode code point: {n}"));
            };
            result.push_str(&BASE64[index..index + 1]);
            for b in (0..bytes).rev() {
                let value = (n >> (6 * b as usize)) & 0x3f;
                result.push_str(&BASE64[value..value + 1]);
            }
        }
        Ok(result)
    }

    fn decode_utf64(&self) -> Result<String, Self::Error> {
        fn code(chars: &mut Chars) -> Result<u8, String> {
            let Some(ch) = chars.next() else {
                return Err("Unexpected end of input".to_string());
            };
            let num = ch as u8;

            Ok(match num {
                95 => 0,
                65..=90 => 1 + (num - 65),
                97..=122 => 27 + (num - 97),
                48..=57 => 53 + (num - 48),
                45 => 63,
                _ => return Err(format!("Invalid UTF-64 character: {ch}")),
            })
        }

        let mut result = String::new();
        let mut iter = self.as_ref().chars();

        loop {
            let Some(ch) = iter.next() else {
                break;
            };

            match ch {
                '-' | '_' | 'a'..='z' | '0'..='9' => result.push(ch),

                'A'..='W' => {
                    let index = (ch as u8 - b'A' + 1) as usize;
                    result.push_str(&SPECIAL[index..index + 1]);
                }

                'X' => result.push(code(&mut iter)? as char),

                'Y' => result.push((64 + code(&mut iter)?) as char),

                'Z' => {
                    let chcode = code(&mut iter)?;

                    let (mut index, bytes) = if chcode < 0x20 {
                        (chcode as u32 & 0x1f, 1)
                    } else if chcode < 0x30 {
                        (chcode as u32 & 0xf, 2)
                    } else if chcode < 0x38 {
                        (chcode as u32 & 0x7, 3)
                    } else {
                        return Err(format!("Invalid UTF-8 prefix: {chcode}"));
                    };

                    for _ in 0..bytes {
                        let chcode = code(&mut iter)?;
                        index = (index << 6) + chcode as u32;
                    }
                    let Some(ch) = char::from_u32(index) else {
                        return Err(format!("Invalid UTF-8 codepoint: {index}"));
                    };

                    result.push(ch);
                }
                _ => return Err(format!("Invalid UTF-64 character: {ch}")),
            }
        }

        Ok(result)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use serde_json::Value;
    use std::{fs::File, io::Read};

    #[test]
    fn valid_tests() {
        let mut f = File::open("../test.json").expect("unable to open test data file");
        let mut data = String::new();
        f.read_to_string(&mut data).expect("failed to read file");
        let mut v: Value = serde_json::from_str(data.as_str()).expect("failure parsing test.json");

        let valid_utf64 = v["valid_utf64"].take();
        let valid_utf64 = valid_utf64.as_object().unwrap();
        assert!(valid_utf64.len() > 0);

        let mut success = 0;
        let mut failure = 0;
        for (k, v) in valid_utf64 {
            let enc = v.as_str().unwrap().encode_utf64().unwrap();
            if k == &enc.as_str() {
                success += 1;
            } else {
                failure += 1;
                println!("encoding of '{v}' should have been '{k}' but was '{enc}'");
            }
        }
        assert_eq!(valid_utf64.len(), success);
        assert_eq!(0, failure);

        success = 0;
        for (k, v) in valid_utf64 {
            match k.decode_utf64() {
                Ok(dec) => {
                    if v == &dec.as_str() {
                        success += 1;
                    } else {
                        failure += 1;
                        println!("decoding of '{k}' should have been '{v}' but was '{dec}'");
                    }
                }
                Err(e) => {
                    println!("failed to decode '{k}': {e}");
                    failure += 1;
                }
            }
        }
        assert_eq!(valid_utf64.len(), success);
        assert_eq!(0, failure);
    }

    #[test]
    fn invalid_tests() {
        let mut f = File::open("../test.json").expect("unable to open test data file");
        let mut data = String::new();
        f.read_to_string(&mut data).expect("failed to read file");
        let mut v: Value = serde_json::from_str(data.as_str()).expect("failure parsing test.json");

        let invalid_utf64 = v["invalid_utf64"].take();
        let invalid_utf64 = invalid_utf64.as_object().unwrap();
        assert!(invalid_utf64.len() > 0);

        let mut failure = 0;
        for (k, _) in invalid_utf64 {
            if !k.decode_utf64().is_err() {
                failure += 1;
                println!("failed to report '{k}' as invalid utf64");
            }
        }
        assert_eq!(0, failure);
    }
}
