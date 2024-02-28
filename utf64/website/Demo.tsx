import { createSignal, type Component, Show } from "solid-js";
import * as utf64 from "utf64";

export type DemoProps = {
  url: string;
};

export const Demo: Component<DemoProps> = (props) => {
  const args = new URL(props.url).searchParams;
  const [src, setSrc] = createSignal(args.get("encode"));
  const [dest, setDest] = createSignal(args.get("decode"));
  const [error, setError] = createSignal<string>();

  function encode(src: string) {
    setSrc(src);
    setDest(utf64.encode(src));
    setError(undefined);
  }

  function decode(dest: string) {
    try {
      setDest(dest);
      setSrc(utf64.decode(dest));
      setError(undefined);
    } catch (err) {
      const e = err as Error;
      setError(e.message);
    }
  }

  const [s, d] = [src(), dest()];
  if (s) {
    encode(s);
  } else if (d) {
    decode(d);
  }

  return (
    <>
      <form class="col" method="get">
        <label for="encode">Try it! Type anything here:</label>
        <textarea
          name="encode"
          onInput={(e) => encode(e.currentTarget.value)}
          rows="8"
          cols="40"
        >
          {src()}
        </textarea>
        <noscript>
          <button>Encode »</button>
        </noscript>
      </form>
      <form class="col" method="get">
        <label for="decode">
          <Show when={error()} fallback="Encoded as UTF-64:" keyed>
            {(e) => <span class="error">{e}</span>}
          </Show>
        </label>
        <textarea
          id="decode"
          name="decode"
          classList={{
            error: !!error(),
          }}
          onInput={(e) => decode(e.currentTarget.value)}
          rows="8"
          cols="40"
        >
          {dest()}
        </textarea>
        <noscript>
          <button>« Decode</button>
        </noscript>
      </form>
    </>
  );
};
