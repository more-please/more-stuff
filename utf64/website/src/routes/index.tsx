import { Meta, MetaProvider, Title } from "@solidjs/meta";
import { Demo } from "../components/Demo";
import svg from "../../../utf64.svg";
import "./index.css";

export default () => (
  <>
    <MetaProvider>
      <Title>UTF-64</Title>
      <Meta
        name="description"
        content="A terse, human-readable, URL-safe encoding for JSONish strings"
      />
      <Meta
        name="go-import"
        content="utf64.moreplease.com mod https://utf64.moreplease.com/go"
      />
    </MetaProvider>
    <main>
      <h1>
        <img src={svg} width={236} height={64} alt="utf-64" />
      </h1>
      <h2>A terse, human-readable, URL-safe encoding for JSONish strings</h2>
      <div class="cols">
        <Demo />
      </div>
      <div class="cols">
        <div class="col">
          <h3>What it does</h3>
          <p>
            UTF-64 is a way to encode any Unicode string so that it can safely
            be stored in a URL parameter, in a compact and readable way. This is
            useful any time you want to pass a JSON blob or Unicode string
            anywhere in a URL.
          </p>
          <h4>
            Compared to{" "}
            <a href="https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding">
              percent-encoding
            </a>
          </h4>
          <ul>
            <li>
              UTF-64 has a single API with consistent behavior across languages.
              No more confusion around{" "}
              <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">
                encodeURI
              </a>{" "}
              vs{" "}
              <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">
                encodeURIComponent
              </a>
              ,{" "}
              <a href="https://pkg.go.dev/net/url?utm_source=godoc#PathEscape">
                PathEscape
              </a>{" "}
              vs{" "}
              <a href="https://pkg.go.dev/net/url?utm_source=godoc#QueryEscape">
                QueryEscape
              </a>
              , etc.
            </li>
          </ul>
          <h4>Compared to Base64</h4>
          <ul>
            <li>
              Base64 isn't URL-safe (you need to use{" "}
              <a href="https://en.wikipedia.org/wiki/Base64url">base64url</a>{" "}
              instead).
            </li>
            <li>
              Base64 has an{" "}
              <a href="https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem">
                awkward JS API
              </a>{" "}
              for Unicode strings. UTF-64 has a convenient Unicode-aware API for
              multiple languages.
            </li>
          </ul>
        </div>
        <div class="col">
          <h3>How to install</h3>
          <h4>JavaScript / TypeScript</h4>
          <pre>npm install utf64</pre>
          <h4>Python</h4>
          <pre>pip install utf64</pre>
          <h4>Go</h4>
          <pre>go get utf64.moreplease.com</pre>
          <h4>Rust</h4>
          <pre>cargo add utf64</pre>
          <h4>Other languages</h4>
          <p>
            Contributions welcome! Please feel free to send a pull request or
            file an issue on{" "}
            <a href="https://github.com/more-please/more-stuff/tree/main/utf64#readme">
              GitHub
            </a>
            .
          </p>
        </div>
      </div>
      <div class="cols">
        <div class="col">
          <h3>About</h3>
          <p>
            UTF-64 is by <a href="mailto:iain@moreplease.com">Iain Merrick</a>.
            It's free to use for any purpose. (See{" "}
            <a href="https://github.com/more-please/more-stuff/blob/main/utf64/LICENSE">
              LICENSE
            </a>{" "}
            on GitHub.)
          </p>
          <p>
            <a href="https://moreplease.com">More Please</a> is my freelance
            software development business.
          </p>
        </div>
      </div>
    </main>
  </>
);
