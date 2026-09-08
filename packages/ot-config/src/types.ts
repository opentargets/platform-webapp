export interface Config {
  urlApi: string;
  urlAiApi: string;
  urlPathwaysApi: string;
  profile: Record<string, unknown>;
  googleTagManagerID: string | null;
  gitVersion: string;
}

export type Environment = "development" | "production";
