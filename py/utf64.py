"""Encoder/decoder for UTF-64, a URL-safe encoding for JSONish strings"""

__version__ = "1.0.0"

_base64 = "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-"

_special = "_\"',.;:!?()[]{}#=+-*/\\\n "


def encode(input: str) -> str:
    result = []
    for c in input:
        # a-z, 0-9 and - are encoded as themselves
        if "a" <= c <= "z" or "0" <= c <= "9" or c == "-":
            result.append(c)
            continue
        # Characters in _special are mapped to the _base64 alphabet
        i = _special.find(c)
        if i >= 0:
            result.append(_base64[i])
            continue
        # Other ASCII characters are mapped to two words (with some redundancy)
        n = ord(c)
        if n < 64:
            result.append("X")
            result.append(_base64[n])
            continue
        if n < 128:
            result.append("Y")
            result.append(_base64[n - 64])
            continue
        # Remaining encodings are packed UTF-8 (without the synchronisation bits)
        result.append("Z")
        if n <= 0x7FF:
            result.append(_base64[n >> 6])
            bytes = 1
        elif n <= 0xFFFF:
            result.append(_base64[0x20 + (n >> 12)])
            bytes = 2
        elif n <= 0x10FFFF:
            result.append(_base64[0x30 + (n >> 18)])
            bytes = 3
        else:
            raise UnicodeError(f"Invalid Unicode code point: ${n}")
        for b in range(bytes - 1, -1, -1):
            value = (n >> (6 * b)) & 0x3F
            result.append(_base64[value])
    return "".join(result)


def decode(input: str) -> str:
    result = []
    it = iter(input)

    def nextCode() -> int:
        try:
            c = next(it)
        except StopIteration:
            raise ValueError("Unexpected end of input")
        n = ord(c)
        if n == 95:
            return 0  # _
        elif 65 <= n <= 90:
            return 1 + (n - 65)  # A-Z
        elif 97 <= n <= 122:
            return 27 + (n - 97)  # a-z
        elif 48 <= n <= 57:
            return 53 + (n - 48)  # 0-9
        elif n == 45:
            return 63  # -
        else:
            raise ValueError(f"Invalid UTF-64 character: ${c}")

    try:
        while True:
            c = next(it)
            # a-z, 0-9 and - are encoded as themselves
            if "a" <= c <= "z" or c >= "0" and c <= "9" or c == "-" or c == "_":
                result.append(c)
                continue
            # _ and A-W are mapped to special characters
            if c >= "A" and c <= "W":
                result.append(_special[ord(c) - 64])
                continue
            # X and Y are low and high halves of 7-bit ASCII
            if c == "X":
                result.append(chr(nextCode()))
                continue
            if c == "Y":
                result.append(chr(nextCode() + 64))
                continue
            # Remaining encodings are packed UTF-8 (without the synchronisation bits)
            if c != "Z":
                raise ValueError(f"Invalid UTF-64 character: ${c}")
            i = nextCode()
            if i < 0x20:
                i &= 0x1F
                bytes = 1
            elif i < 0x30:
                i &= 0xF
                bytes = 2
            elif i < 0x38:
                i &= 0x7
                bytes = 3
            else:
                raise ValueError("Invalid UTF-8 prefix: ${i}")
            for _ in range(bytes):
                i = (i << 6) + nextCode()
            result.append(chr(i))
    except StopIteration:
        pass

    return "".join(result)
