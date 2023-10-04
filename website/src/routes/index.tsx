import { ParentComponent, Signal, createSignal } from "solid-js";

import { GoproxyConfig } from "gosub-goproxy/goproxy.ts";
import { gosubEncode } from "gosub-goproxy/gosub.ts";
import { gosub_svg } from "../assets.ts";

const Input: ParentComponent<{
  id: string;
  placeholder: string;
  value: Signal<string>;
}> = (props) => {
  const [get, set] = props.value;
  return (
    <>
      <label for={props.id}>{props.children}</label>
      <input
        id={props.id}
        name={props.id}
        type="text"
        size="40"
        placeholder={props.placeholder}
        value={get()}
        onInput={(e) => set(e.currentTarget.value)}
      />
    </>
  );
};

const InputWithCheckbox: ParentComponent<{
  id: string;
  placeholder: string;
  value: Signal<string | undefined>;
}> = (props) => {
  const [get, set] = props.value;
  return (
    <>
      <label for={props.id}>{props.children}</label>
      <input
        type="checkbox"
        checked={get() !== undefined}
        onChange={(e) => set(e.currentTarget.checked ? "" : undefined)}
      />
      <input
        type="text"
        size="40"
        placeholder={props.placeholder}
        value={get() ?? ""}
        onInput={(e) => set(e.currentTarget.value)}
      />
    </>
  );
};

export default function Home() {
  const [url, setUrl] = createSignal("https://github.com/more-please/utf64");
  const [dir, setDir] = createSignal("");
  const [module, setModule] = createSignal("");
  const [prefix, setPrefix] = createSignal<string>();
  const [suffix, setSuffix] = createSignal<string>();
  function config(): GoproxyConfig {
    return {
      url: url(),
      directory: dir(),
      tagPrefix: prefix(),
      tagSuffix: suffix(),
    };
  }
  function encoded() {
    try {
      debugger;
      return gosubEncode(config());
    } catch (e) {
      return `${e}`;
    }
  }
  return (
    <main>
      <h1>
        <img src={gosub_svg} alt="GOSUB" width="236" height="64" />
      </h1>
      <h2>Serve Go modules from a GitHub repo subdirectory</h2>

      <Input
        id="url"
        placeholder="https://github.com/<user>/<repo>"
        value={[url, setUrl]}
      >
        GitHub URL
      </Input>

      <Input
        id="directory"
        placeholder="optional/sub/directory"
        value={[dir, setDir]}
      >
        Subdirectory
      </Input>

      <Input id="module" placeholder="my.module" value={[module, setModule]}>
        Go module name
      </Input>

      <InputWithCheckbox
        id="prefix"
        placeholder="prefix-"
        value={[prefix, setPrefix]}
      >
        Version tag prefix (default: <code>v</code>)
      </InputWithCheckbox>

      <InputWithCheckbox
        id="suffix"
        placeholder="-suffix"
        value={[suffix, setSuffix]}
      >
        Version tag suffix
      </InputWithCheckbox>

      <p>{encoded()}</p>
    </main>
  );
}
