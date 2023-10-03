import { gosub_svg, under_construction } from "../assets.ts";

export default function Home() {
  return (
    <main>
      <h1>
        <img src={gosub_svg} alt="GOSUB" width="236" height="64" />
      </h1>
      <h2>Serve Go modules from a GitHub repo subdirectory</h2>
      <img
        src={under_construction}
        alt="Under construction"
        width="64"
        height="64"
      />
      <p>Under construction!</p>
      <p>
        {"Here’s the "}
        <a href="https://github.com/more-please/gosub-goproxy">GitHub repo</a>
        {" if you just want the code."}
      </p>
    </main>
  );
}
