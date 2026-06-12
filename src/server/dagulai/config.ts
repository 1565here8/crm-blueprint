export function dagulaiApiConfig() {
  return {
    cryptorank: { enabled: false },
    santiment: { enabled: false },
    lunarcrush: { enabled: false },
    myfxbook: { enabled: false },
  };
}
export const DAGULAI_VERSION = "1.0.0";
export function dagulaiOllamaHost() {
  return "http://127.0.0.1:11434";
}
export function dagulaiOllamaModel() {
  return "llama3.2:3b";
}
