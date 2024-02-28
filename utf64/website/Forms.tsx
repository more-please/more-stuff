import { createSignal, type Component, Show } from "solid-js";
import * as utf64 from "utf64";

export type FormsProps = {
  src?: string | null;
  dest?: string | null;
  error?: string | null;
};

export const Forms: Component<FormsProps> = (props) => {
  const [src, setSrc] = createSignal(props.src ?? "");
  const [dest, setDest] = createSignal(props.dest ?? "");
  const [error, setError] = createSignal(props.error);
  return (
    <>
      <form class="col" method="get">
        <label for="encode">Try it! Type anything here:</label>
        <textarea
          name="encode"
          value={src()}
          onInput={(e) => {
            const src = setSrc(e.currentTarget.value);
            setDest(utf64.encode(src));
          }}
          rows="8"
          cols="40"
        />
        <noscript>
          <button>Encode »</button>
        </noscript>
      </form>
      <form class="col" method="get">
        <label for="decode">
          <Show when={error()} fallback="Encoded as UTF-64:">
            {(e) => <span class="error">{e}</span>}
          </Show>
        </label>
        <textarea
          id="decode"
          name="decode"
          classList={{
            error: !!error()
          }}
          value={dest()}
          onInput={(e) => {
            const dest = setDest(e.currentTarget.value);
            try {
              setSrc(utf64.decode(dest));
              setError(undefined);
            } catch (err) {
              const e = err as Error;
              setError(e.message);
            }
          }}
          rows="8"
          cols="40"
        />
        <noscript>
          <button>« Decode</button>
        </noscript>
      </form>
    </>
  );
};
