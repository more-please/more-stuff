import { useSearchParams } from "@solidjs/router";
import { createSignal, Show, createEffect, onMount } from "solid-js";
import * as utf64 from "utf64";

export const Demo = () => {
  const [args] = useSearchParams();

  const [src, setSrc] = createSignal("");
  const [dest, setDest] = createSignal("");
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

  if (args.encode) {
    encode(args.encode);
  } else if (args.decode) {
    decode(args.decode);
  }

  let srcField!: HTMLTextAreaElement;
  let destField!: HTMLTextAreaElement;
  onMount(() => {
    createEffect(() => (srcField.value = src()));
    createEffect(() => (destField.value = dest()));
  });

  return (
    <>
      <form class="col" method="get">
        <label for="encode">Try it! Type anything here:</label>
        <textarea
          ref={srcField}
          id="encode"
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
          ref={destField}
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
