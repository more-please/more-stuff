export { BuildInfo } from "./build-info";

export default function plugin(): {
  name: string;
  buildStart(): void;
  resolveId(source: string): string | null;
  load(id: string): Promise<string | null>;
};
