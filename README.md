![utf-64](utf64.svg)

A terse, human-readable, URL-safe encoding for JSONish strings.

[![JS](https://github.com/more-please/utf64/actions/workflows/js.yml/badge.svg)](https://github.com/more-please/utf64/actions/workflows/js.yml)
[![Python](https://github.com/more-please/utf64/actions/workflows/py.yml/badge.svg)](https://github.com/more-please/utf64/actions/workflows/py.yml)
[![Go](https://github.com/more-please/utf64/actions/workflows/go.yml/badge.svg)](https://github.com/more-please/utf64/actions/workflows/go.yml)
[![Rust](https://github.com/more-please/utf64/actions/workflows/rust.yml/badge.svg)](https://github.com/more-please/utf64/actions/workflows/rust.yml)

## Overview

Use this when you need to encode a string to make it URL-safe, but you also want to keep it as small and readable as possible (unlike base64). For example:

| Input string      | base64                   | utf64              |
| ----------------- | ------------------------ | ------------------ |
| Hello             | SGVsbG8=                 | YHello             |
| "Hello!"          | IkhlbGxvISI=             | AYHelloGA          |
| {"Hello":"world"} | eyJIZWxsbyI6IndvcmxkIn0= | MAYHelloAFAworldAN |

I made this because I wanted to build a web API with a nice JSON schema that could also be cached by a CDN. To make it cacheable, I had to use the GET method; but GET can't (portably) have a request body, so this means all the API parameters need to be packed into the URL. UTF-64 is a fire-and-forget way to solve this problem.

UTF-64 uses the very permissive [0BSD licence](LICENSE) so you can freely use this code & spec anywhere. I picked 0BSD as it seems to be the "public domain equivalent" most widely accepted by corporations, e.g. Google has a [specific exception permitting the use of 0BSD](https://opensource.google/documentation/reference/patching#forbidden).

## Installation & usage

### JavaScript

```
npm install utf64
```

```
import * as utf64 from "utf64";

console.log(utf64.encode("Hello!"));
console.log(utf64.decode("YHelloG"));
```

### Python

```
pip install utf64
```

```
import utf64

print(utf64.encode("Hello!"))
print(utf64.decode("YHelloG"))
```

### Go

```
go get utf64.moreplease.com
```

```
package main

import (
	"fmt"
	"utf64.moreplease.com"
)

func main() {
	fmt.Println(utf64.Encode("Hello!"))
	result, err := utf64.Decode("YHelloG")
	if err != nil {
		panic(err)
	}
	fmt.Println(result)
}
```

### Rust

Kindly contributed by Mark Musante ([@mjmusante](https://github.com/mjmusante))

```
cargo add utf64
```

```
use utf64::*;

fn main() {
    println!("{}", "Hello!".encode_utf64().unwrap());
    match "YHelloG".decode_utf64() {
        Ok(result) => println!("{result}"),
        Err(e) => panic!("{e}"),
    }
}
```

### Command-line tool

The JS package includes a `utf64` command-line tool:

```
npm install -g utf64
```

```
utf64 "Hello\!"
utf64 -d YHelloG
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
