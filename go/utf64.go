package utf64

import (
	"errors"
	"fmt"
	"strings"
)

const base64_alphabet = "_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-"
const special_alphabet = `_"',.;:!?()[]{}#=+-*/\
 `
const as_is_alphabet = "abcdefghijklmnopqrstuvwxyz0123456789-"

var base64_to_rune = map[int]rune{}
var rune_to_base64 = map[rune]int{}

var direct_to_utf64 = map[rune]rune{}
var utf64_to_direct = map[rune]rune{}

func init() {
	for i, c := range base64_alphabet {
		base64_to_rune[i] = c
		rune_to_base64[c] = i
	}
	for i, c := range special_alphabet {
		b := base64_to_rune[i]
		direct_to_utf64[c] = b
		utf64_to_direct[b] = c
	}
	for _, c := range as_is_alphabet {
		direct_to_utf64[c] = c
		utf64_to_direct[c] = c
	}
}

func Encode(text string) string {
	var result strings.Builder
	for _, c := range text {
		direct, isDirect := direct_to_utf64[c]
		n := int(c)
		switch {
		// 'As-is' and 'special' character: single base64 output char
		case isDirect:
			result.WriteRune(direct)

		// Other ASCII characters: prefix + char
		case n < 64:
			result.WriteRune('X')
			result.WriteRune(base64_to_rune[n])
		case n < 128:
			result.WriteRune('Y')
			result.WriteRune(base64_to_rune[n-64])

			// Remaining encodings: packed UTF-8 (without the synchronisation bits)
		default:
			result.WriteRune('Z')
			var bytes int
			switch {
			case n <= 0x7ff:
				result.WriteRune(base64_to_rune[n>>6])
				bytes = 1
			case n <= 0xffff:
				result.WriteRune(base64_to_rune[0x20+(n>>12)])
				bytes = 2
			case n <= 0x10ffff:
				result.WriteRune(base64_to_rune[0x30+(n>>18)])
				bytes = 3
			default:
				panic("Invalid Unicode input")
			}
			for b := bytes - 1; b >= 0; b -= 1 {
				value := (n >> (6 * b)) & 0x3f
				result.WriteRune(base64_to_rune[value])
			}
		}
	}
	return result.String()
}

func invalidCharError(r rune) (string, error) {
	return "", errors.New(fmt.Sprintf("Invalid UTF-64 character: %v", r))
}

func Decode(text string) (string, error) {
	var result strings.Builder
	input := strings.NewReader(text)
	for input.Len() > 0 {
		r, _, err := input.ReadRune()
		if err != nil {
			return "", err
		}
		switch r {
		case 'X', 'Y':
			next, _, err := input.ReadRune()
			if err != nil {
				return "", err
			}
			n, ok := rune_to_base64[next]
			if !ok {
				return invalidCharError(next)
			}
			if r == 'Y' {
				n += 64
			}
			result.WriteRune(rune(n))

		case 'Z':
			next, _, err := input.ReadRune()
			if err != nil {
				return "", err
			}
			n, ok := rune_to_base64[next]
			if !ok {
				return invalidCharError(r)
			}
			var bytes int
			switch {
			case n < 0x20:
				n &= 0x1f
				bytes = 1
			case n < 0x30:
				n &= 0xf
				bytes = 2
			case n < 0x38:
				n &= 0x7
				bytes = 3
			default:
				return "", errors.New(fmt.Sprintf("Invalid UTF-8 prefix: %v", r))
			}
			for b := 0; b < bytes; b += 1 {
				r, _, err = input.ReadRune()
				if err != nil {
					return "", err
				}
				i, ok := rune_to_base64[r]
				if !ok {
					return invalidCharError(r)
				}
				n = (n << 6) + i
			}
			if (n > 0x10ffff) {
				return "", errors.New(fmt.Sprintf("Invalid Unicode output: 0x%x", n))
			}
			result.WriteRune(rune(n))

		default:
			c, ok := utf64_to_direct[r]
			if !ok {
				return invalidCharError(r)
			}
			result.WriteRune(c)
		}
	}
	return result.String(), nil
}
