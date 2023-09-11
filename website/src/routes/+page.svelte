<script lang="ts">
  import type { PageData } from "./$types";
  import { str_to_utf64, utf64_to_str } from "utf64";

  export let data: PageData;
  let src = data.src;
  let dest = data.dest;

  function encode() {
    dest = str_to_utf64(src);
  }
  function decode() {
    src = utf64_to_str(dest);
  }
</script>

<svelte:head>
  <title>UTF-64</title>
  <meta
    name="go-import"
    content="utf64.moreplease.com git https://github.com/more-please/utf64"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="content">
  <h1>UTF-64</h1>
  <h2>A terse, human-readable, URL-safe encoding for JSONish strings</h2>
  <div class="cols">
    <form class="col" method="get">
      <label for="encode">Try it! Type anything here:</label>
      <textarea
        name="encode"
        bind:value={src}
        on:input={encode}
        rows="8"
        cols="40"
      />
      <noscript>
        <button>Encode »</button>
      </noscript>
    </form>
    <form class="col" method="get">
      <label for="decode">Encoded as UTF-64:</label>
      <textarea
        name="decode"
        bind:value={dest}
        on:input={decode}
        rows="8"
        cols="40"
      />
      <noscript>
        <button>« Decode</button>
      </noscript>
    </form>
  </div>
  <div class="cols">
    <div class="col">
      <h3>What it does</h3>
      <p>
        UTF-64 is a way to encode any Unicode string so that it can safely be
        stored in a URL parameter, in a compact and readable way. This is useful
        any time you want to pass a JSON blob or Unicode string anywhere in a
        URL.
      </p>
      <h4>
        Compared to <a
          href="https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding"
          >percent-encoding</a
        >
      </h4>
      <ul>
        <li>
          UTF-64 has a single API with consistent behavior across languages. No
          more confusion around <a
            href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI"
            >encodeURI</a
          >
          vs
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent"
            >encodeURIComponent</a
          >,
          <a href="https://pkg.go.dev/net/url?utm_source=godoc#PathEscape"
            >PathEscape</a
          >
          vs
          <a href="https://pkg.go.dev/net/url?utm_source=godoc#QueryEscape"
            >QueryEscape</a
          >, etc.
        </li>
      </ul>
      <h4>Compared to Base64</h4>
      <ul>
        <li>
          Base64 isn't URL-safe (you need to use <a
            href="https://en.wikipedia.org/wiki/Base64url">base64url</a
          > instead).
        </li>
        <li>
          Base64 has an <a
            href="https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem"
            >awkward JS API</a
          > for Unicode strings. UTF-64 has a convenient Unicode-aware API for multiple
          languages.
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
      <h4>Other languages</h4>
      <p>
        Contributions welcome! Please feel free to send a pull request or file
        an issue on <a href="https://github.com/more-please/utf64">GitHub</a>.
      </p>
    </div>
  </div>
  <div class="cols">
  <div class="col">
    <h3>About</h3>
    <p>
      UTF-64 is by <a href="mailto:iain@moreplease.com">Iain Merrick</a>. It's
      free to use for any purpose. (See
      <a href="https://github.com/more-please/utf64/blob/main/LICENSE"
        >LICENSE</a
      > on GitHub.)
    </p>
    <p>
      <a href="https://moreplease.com">More Please</a> is my freelance software development
      business.
    </p>
  </div>
  </div>
</div>

<style>
  .content {
    font-family: sans-serif;
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    margin: 0 0 4em;
  }
  h1,
  h2,
  h3,
  h4 {
    margin: 0;
    padding: 1em 0 0.25em;
    max-width: 16em;
  }
  p,
  li {
    margin: 0;
    padding: 0.75em 0 0.25em;
    max-width: 24rem;
  }
  ul {
    max-width: 24rem;
    padding-left: 2rem;
    margin: 0;
  }
  h1 {
    font-size: 3em;
    font-weight: bolder;
    text-align: center;
  }
  h2 {
    font-size: 1.5em;
    font-weight: normal;
    text-align: center;
  }
  .cols {
    display: flex;
    flex-flow: row wrap;
    column-gap: 2em;
    margin: 0 1em;
    align-items: flex-start;
  }
  .col {
    margin: 0 auto;
  }
  div.col {
    max-width: 24em;
  }
  form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5em;
    padding: 1em 0;
  }
  pre {
    background-color: floralwhite;
    border: 1px solid lightgray;
    padding: 0.5em;
  }
</style>
