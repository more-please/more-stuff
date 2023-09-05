# utf64

[![Test JS](https://github.com/more-please/utf64/actions/workflows/js.yml/badge.svg)](https://github.com/more-please/utf64/actions/workflows/js.yml)
[![Test Python](https://github.com/more-please/utf64/actions/workflows/py.yml/badge.svg)](https://github.com/more-please/utf64/actions/workflows/py.yml)

A terse, human-readable, URL-safe encoding for JSONish strings.

## Overview

Use this when you need to encode a string to make it URL-safe, but you also want to keep it as small and readable as possible (unlike base64). For example:

| Input string      | base64                   | utf64              |
| ----------------- | ------------------------ | ------------------ |
| Hello             | SGVsbG8=                 | YHello             |
| "Hello!"          | IkhlbGxvISI=             | AYHelloGA          |
| {"Hello":"world"} | eyJIZWxsbyI6IndvcmxkIn0= | MAYHelloAFAworldAN |

I made this because I wanted to build a web API with a nice JSON schema that could also be cached by a CDN. To make it cacheable, I had to use the GET method; but GET can't (portably) have a request body, so this means all the API parameters need to be packed into the URL. `utf64` is a fire-and-forget way to solve this problem.

## Installation & usage

### JavaScript

```
npm install utf64
```

```
import { str_to_utf64, utf64_to_str } from "utf64";

# Encode
console.log(str_to_utf64("Hello!"));

# Decode
console.log(utf64_to_str("YHelloG"));
```

### Python

```
pip install utf64
```

```
from utf64 import str_to_utf64, utf64_to_str

# Encode
print(str_to_utf64("Hello!"))

# Decode
print(utf64_to_str("YHelloG"))
```

### Command-line tool

The JS package includes a `utf64` command-line tool:

```
npm install -g utf64
```

```
# Encode
echo -n "Hello\!" | utf64

# Decode
echo -n "YHelloG" | utf64 -d
```

## Specification

Output is encoded using base64url-compatible characters: `_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-`

| utf64                   | Decoded as                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_`                     | As-is                                                                                                                                                                                                                 |
| `a` to `z`              | As-is                                                                                                                                                                                                                 |
| `0` to `9`              | As-is                                                                                                                                                                                                                 |
| `ABCDEFGHIJKLMNOPQRSTU` | Mapped to: `"',.;:!?()[]{}#=+-*/\`                                                                                                                                                                                    |
| `V`                     | Newline                                                                                                                                                                                                               |
| `W`                     | Space                                                                                                                                                                                                                 |
| `X`                     | Prefix for Unicode 0-63. For example, "`Xk`" is "`%`" (U+0025)                                                                                                                                                        |
| `Y`                     | Prefix for Unicode 64-127. For example, "`Y_`" is "`@`" (U+0040)                                                                                                                                                      |
| `Z`                     | Prefix for Unicode 128+. The following characters are interpreted as UTF-8, reduced to 6-bit bytes by stripping the redundant top two bits. For example, "`ZhBr`" is "`€`" (UTF-8 `[11]100010 [10]000010 [10]101100`) |

See [`test.json`](test.json) for tests that (hopefully) cover all the edge cases, for both valid and invalid encodings.
