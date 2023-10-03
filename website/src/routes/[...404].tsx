import { HttpStatusCode } from "solid-start/server";
import { Title } from "solid-start";

export default function NotFound() {
  return (
    <main>
      <Title>Not Found</Title>
      <HttpStatusCode code={404} />
      <h1>Page Not Found</h1>
    </main>
  );
}
