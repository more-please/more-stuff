import { gosub_svg } from "../assets.ts";

export default function Home() {
  return (
    <main>
      <h1>
        <img src={gosub_svg} alt="GOSUB" width="236" height="64" />
      </h1>
      <h2>Serve Go modules from a GitHub repo subdirectory</h2>
    </main>
  );
}
