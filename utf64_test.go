package utf64

import (
	"encoding/json"
	"os"
	"testing"
)

type TestJson struct {
	Valid   map[string]string `json:"valid_utf64"`
	Invalid map[string]string `json:"invalid_utf64"`
}

func TestUtf64(t *testing.T) {
	file, err := os.ReadFile("test.json")
	if err != nil {
		panic(err)
	}

	var spec TestJson
	err = json.Unmarshal(file, &spec)
	if err != nil {
		panic(err)
	}

	for dest, src := range spec.Valid {
		actualDest := Encode(src)
		if actualDest != dest {
			t.Errorf("\nWhen encoding: %v\nExpected: %v\nActual %v", src, dest, actualDest)
		}
		actualSrc, err := Decode(dest)
		if err != nil {
			t.Errorf("\nWhen decoding: %v\nUnexpected error: %v", dest, err)
		}
		if actualSrc != src {
			t.Errorf("\nWhen decoding: %v\nExpected: %v\nActual %v", dest, src, actualSrc)
		}
	}

	for dest, message := range spec.Invalid {
		actualSrc, err := Decode(dest)
		if err == nil {
			t.Errorf("\nWhen decoding: %v\nExpected error: %v\nBut got result: %v", dest, message, actualSrc)
		}
	}
}
