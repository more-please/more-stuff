<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;
  let { url, dir, prefix, suffix, result, hostError } = data;
</script>

<svelte:head>
  <title>Gosub</title>
  <meta
    name="description"
    content="Serve Go modules from a Github repo subdirectory"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<div class="content">
  <h1><img src="$lib/gosub.svg" alt="GOSUB" width="236" height="64" /></h1>
  <form method="get">
    <label>
      GitHub URL: <input name="url" type="text" bind:value={url} />
    </label>
    <label>
      Subdirectory: <input name="dir" type="text" bind:value={dir} />
    </label>
    <label>
      Tag prefix: <input name="prefix" type="text" bind:value={prefix} />
    </label>
    <label>
      Tag suffix: <input name="suffix" type="text" bind:value={suffix} />
    </label>
    <button>Submit</button>
  </form>
  <p>{hostError}</p>
  <p>{result}</p>
</div>
