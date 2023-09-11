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
    content="moreplease.com/utf64 git https://github.com/more-please/utf64"
  />
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
        stored in a URL parameter. This is useful any time you want to pass a
        JSON blob or Unicode string in a URL.
      </p>
      <p>
        It's similar to <a href="https://en.wikipedia.org/wiki/Base64">Base64</a
        >, but has some advantages:
      </p>
      <ul>
        <li>
          Base64 isn't URL-safe (you need to use <a
            href="https://en.wikipedia.org/wiki/Base64url">base64url</a
          > instead).
        </li>
        <li>
          Base64 has an <a
            href="https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem"
            >awkward JavaScript API</a
          > for Unicode strings. UTF-64 has a convenient Unicode-aware API for multiple
          languages.
        </li>
        <li>UTF-64 is more compact for typical JSON input.</li>
        <li>
          UTF-64 is more readable, as numbers and lowercase letters are stored
          directly (e.g. the string "hello123" is encoded as "hello123").
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
      <pre>go get moreplease.com/utf64</pre>
      <h4>Other languages</h4>
      <p>
        Contributions welcome! Please feel free to send a pull request or file
        an issue on <a href="https://github.com/more-please/utf64">GitHub</a>.
      </p>
    </div>
  </div>
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
    width: 24em;
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
