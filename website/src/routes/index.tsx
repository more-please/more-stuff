import {
  For,
  ParentComponent,
  Show,
  Suspense,
  createResource,
  createSignal,
  resetErrorBoundaries,
} from "solid-js";
import { GoproxyConfig, goproxy } from "gosub-goproxy/goproxy.ts";
import { Result, err, isErr, isOK, ok } from "gosub-goproxy/result.ts";

import { gosubEncode } from "gosub-goproxy/gosub";
import gosub_svg from "assets/gosub.svg?url";
import server$ from "solid-start/server";

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

const serverGetTags = server$(async (config: GoproxyConfig) => {
  const proxy = goproxy("/", config);
  const response = await proxy("/module/@gosub/tags");
  if (!response) {
    return err("Sorry, an unknown server-side error occurred");
  }
  if (response.status === 404) {
    return err("Repo not found");
  }
  if (!response.ok) {
    return err(`Internal error: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const tags = text.split("\n").filter((s) => s);
  if (tags.length < 1) {
    return err("No tags found in this repo");
  }
  return ok(tags);
});

async function getTags(url: string): Promise<Result<string[]>> {
  const config: GoproxyConfig = { url };
  const preflight = gosubEncode(config);
  if (!preflight.ok) {
    return preflight;
  }
  return serverGetTags(config);
}

export default function Home() {
  const [url, setUrl] = createSignal("https://github.com/more-please/more-stuff");
  const [tags] = createResource(url, getTags);
  return (
    <main>
      <h1>
        <img src={gosub_svg} alt="GOSUB" width="236" height="64" />
      </h1>
      <h2>Serve Go modules from a GitHub repo subdirectory</h2>

      <Input
        id="url"
        placeholder="https://github.com/<user>/<repo>"
        value={url()}
        setValue={(url) => {
          setUrl(url);
          resetErrorBoundaries();
        }}
      >
        GitHub URL for your Go module:
      </Input>

      <Suspense fallback={<p>Loading...</p>}>
        <Show when={url() !== "" && isErr(tags())} keyed>
          {(e) => (
            <p>
              <em>{e.message}</em>
            </p>
          )}
        </Show>
        <For each={isOK(tags())?.value}>{(tag) => <p>{tag}</p>}</For>
      </Suspense>
    </main>
  );
}
