import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

export default () => (
  <Router root={(props) => <Suspense>{props.children}</Suspense>}>
    <FileRoutes />
  </Router>
);
