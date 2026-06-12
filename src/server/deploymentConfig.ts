export function getDeploymentConfig() {
  return {
    mode: "development",
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3001),
  };
}

export function getBillingConfig() {
  return {
    starterTokens: Number(process.env.STARTER_TOKENS || 500),
    freeSearchesPerDay: Number(process.env.ARCANA_FREE_SEARCHES_PER_DAY || 999),
    monthlySearchLimit: Number(process.env.ARCANA_MONTHLY_SEARCH_LIMIT || 99999),
    monthlyPriceCents: Number(process.env.ARCANA_MONTHLY_PRICE_CENTS || 0),
    searchPriceCents: Number(process.env.ARCANA_SEARCH_PRICE_CENTS || 0),
  };
}
