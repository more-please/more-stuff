import { ParentComponent, Show, children } from "solid-js";
import { Result, isErr, isOK } from "gosub-goproxy/result.ts";

import { GoproxyConfig } from "gosub-goproxy/goproxy.ts";
import { createStore } from "solid-js/store";
import { gosubEncode } from "gosub-goproxy/gosub.ts";
import { gosub_svg } from "../assets.ts";

const Row: ParentComponent = (props) => <div class="row">{props.children}</div>;
const Col: ParentComponent = (props) => <div class="col">{props.children}</div>;

const Input: ParentComponent<{
  id: string;
  placeholder: string;
  value: string | undefined;
  setValue: (value: string) => void;
}> = (props) => (
  <Col>
    <label for={props.id}>{props.children}</label>
    <input
      id={props.id}
      name={props.id}
      type="text"
      size="80"
      placeholder={props.placeholder}
      value={props.value ?? ""}
      onInput={(e) => props.setValue(e.currentTarget.value)}
    />
  </Col>
);

export default function Home() {
  const [config, setConfig] = createStore<GoproxyConfig>({
    url: "",
    tagPrefix: "v",
  });
  const encoded = () => gosubEncode(config);
  return (
    <main>
      <h1>
        <img src={gosub_svg} alt="GOSUB" width="236" height="64" />
      </h1>
      <h2>Serve Go modules from a GitHub repo subdirectory</h2>

      <Input
        id="url"
        placeholder="https://github.com/<user>/<repo>"
        value={config.url}
        setValue={(url) => setConfig("url", url)}
      >
        GitHub URL for your Go module:
      </Input>

      <Show
        when={isErr(encoded())}
        keyed
        fallback={<p>Looks good! Now let's locate your module…</p>}
      >
        {(result) => (
          <p>
            <em>{result.err}</em>
          </p>
        )}
      </Show>

      <Input
        id="directory"
        placeholder="optional/sub/directory"
        value={config.directory}
        setValue={(dir) => setConfig("directory", dir)}
      >
        Subdirectory:
      </Input>
      <Input
        id="prefix"
        placeholder="prefix-"
        value={config.tagPrefix}
        setValue={(p) => setConfig("tagPrefix", p)}
      >
        Version tag prefix:
      </Input>
      <Input
        id="suffix"
        placeholder="-suffix"
        value={config.tagSuffix}
        setValue={(s) => setConfig("tagSuffix", s)}
      >
        Version tag suffix:
      </Input>

      <Show when={isOK(encoded())} keyed>
        {(result) => (
          <>
            <h2>Result</h2>
            <p>{result.value}</p>
          </>
        )}
      </Show>
    </main>
  );
}
