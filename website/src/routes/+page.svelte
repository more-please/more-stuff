<svelte:head>
  <title>GOSUB</title>
  <meta
    name="description"
    content="Serve Go modules from a GitHub repo subdirectory"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="content">
  <h1>
    <img src="$lib/gosub.svg" alt="utf-64" width="236" height="64" />
  </h1>
  <h2>Serve Go modules from a GitHub repo subdirectory</h2>

  <h3>
    <img
      src="$lib/under-construction.svg"
      alt="Under construction"
      width="128"
      height="128"
    />
  </h3>
  <h3>Under construction</h3>

  <h3>
    <a href="https://github.com/more-please/gosub-goproxy">
      <img src="$lib/github-mark.svg" alt="GitHub" width="20" height="20" />
      more-please/gosub-gproxy
    </a>
  </h3>
</div>

<style>
  .content {
    font-family: sans-serif;
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    margin: 0 0 4em;
  }
  img {
    vertical-align: middle;
  }
  a {
    text-decoration: none;
  }
  h1,
  h2 {
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
  span.error {
    font-weight: bold;
    color: red;
  }
  textarea.error {
    background-color: rgba(255, 0, 0, 25%);
  }
</style>
