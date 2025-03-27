export type GoproxyEnv = Record<string, string | undefined> & {
  GITHUB_TOKEN?: string;
  GOSUB_VERBOSE?: string;
};

export type GoproxyConfig = {
  url: string; // Git repo URL - currently only Github is supported
  module?: string; // If set, Go module is required to match this
  directory?: string; // Subdirectory within the git repo
  tagPrefix?: string; // Prefix for version tags in git (default is "v")
  tagSuffix?: string; // Suffix for version tags in git
};

export type GoproxyOptions = {
  console?: GoproxyConsole;
  verbose?: boolean;
};

export type GoproxyLogEntry = Record<string, any> & {
  message: string;
};

export type GoproxyConsole = {
  info: (obj: GoproxyLogEntry) => void;
  log: (obj: GoproxyLogEntry) => void;
  warn: (obj: GoproxyLogEntry) => void;
  error: (obj: GoproxyLogEntry) => void;
};
