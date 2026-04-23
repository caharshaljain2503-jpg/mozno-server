import axios from "axios";

const MARKET_ENDPOINTS = {
  india: [
    { key: "nifty-50", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI" },
    { key: "sensex", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN" },
    { key: "nifty-bank", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEBANK" },
    { key: "nifty-it", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEIT" },
    { key: "nifty-midcap-50", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEMD" },
    { key: "nifty-smallcap", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSESML" },
    { key: "india-vix", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX" },
  ],
  global: [
    { key: "sp500", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC" },
    { key: "nasdaq", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EIXIC" },
    { key: "dow-jones", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EDJI" },
    { key: "ftse-100", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EFTSE" },
    { key: "nikkei-225", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EN225" },
    { key: "hang-seng", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EHSI" },
    { key: "dax", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5EGDAXI" },
    { key: "shanghai-composite", url: "https://query1.finance.yahoo.com/v8/finance/chart/%5ESSEC" },
  ],
};

let marketCache = {
  india: [],
  global: [],
  updatedAt: null,
};

const marketStateToStatus = (marketState) => {
  if (marketState == null || marketState === "") return null;
  const s = String(marketState).toUpperCase();

  if (s.includes("PRE")) return "Pre-market";
  if (s.includes("POST")) return "Closed";
  if (s.includes("REGULAR") || s === "OPEN") return "Open";
  if (s.includes("CLOSED")) return "Closed";

  return null;
};

const parseMarketMeta = (meta) => {
  const price = meta?.regularMarketPrice ?? null;
  const prevClose =
    meta?.previousClose ?? meta?.regularMarketPreviousClose ?? null;

  const changePoints =
    price !== null && prevClose !== null ? price - prevClose : null;

  const changePercent =
    changePoints !== null && prevClose !== null && prevClose !== 0
      ? (changePoints / prevClose) * 100
      : meta?.regularMarketChangePercent ?? null;

  return {
    name: meta?.shortName || meta?.longName || meta?.symbol || "—",
    symbol: meta?.symbol || "",
    currency: meta?.currency || "",
    exchange: meta?.fullExchangeName || meta?.exchangeName || "",

    // Main metrics (frontend expects these names)
    price,
    open: meta?.regularMarketOpen ?? null,
    prevClose,
    high: meta?.regularMarketDayHigh ?? null,
    low: meta?.regularMarketDayLow ?? null,
    weekHigh:
      meta?.fiftyTwoWeekHigh ?? meta?.regularMarketFiftyTwoWeekHigh ?? null,
    weekLow:
      meta?.fiftyTwoWeekLow ?? meta?.regularMarketFiftyTwoWeekLow ?? null,
    volume: meta?.regularMarketVolume ?? null,

    // Deltas
    changePercent,

    // Status
    marketState: meta?.marketState ?? null,
    marketStatus: marketStateToStatus(meta?.marketState ?? null),

    marketTime: meta?.regularMarketTime || null,
  };
};

const fetchOneIndex = async ({ key, url }) => {
  const res = await axios.get(url, { timeout: 15000 });
  const result0 = res?.data?.chart?.result?.[0];
  const meta = result0?.meta;
  if (!meta) {
    throw new Error(`Invalid market response for ${key}`);
  }

  // Fallbacks: some fields (like open) may be missing from `meta`, so
  // we derive them from the latest quote candle.
  const quote = result0?.indicators?.quote?.[0];
  const last = (arr) =>
    Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null;

  return {
    key,
    ...(() => {
      const parsed = parseMarketMeta(meta);
      const openFromQuote = parsed.open ?? last(quote?.open);
      const volumeFromQuote =
        parsed.volume ?? last(quote?.volume);

      return {
        ...parsed,
        open: openFromQuote,
        volume: volumeFromQuote,
      };
    })(),
    source: url,
  };
};

const fetchGroup = async (items) => {
  const settled = await Promise.allSettled(items.map((item) => fetchOneIndex(item)));
  return settled
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
};

export const refreshMarketCache = async () => {
  const [india, global] = await Promise.all([
    fetchGroup(MARKET_ENDPOINTS.india),
    fetchGroup(MARKET_ENDPOINTS.global),
  ]);

  if (india.length === 0 && global.length === 0) {
    throw new Error("Unable to fetch market data from all configured endpoints");
  }

  marketCache = {
    india,
    global,
    updatedAt: new Date().toISOString(),
  };

  return marketCache;
};

export const getMarketOverview = async (req, res) => {
  try {
    if (!marketCache.updatedAt) {
      await refreshMarketCache();
    }

    return res.status(200).json({
      success: true,
      message: "Market overview fetched successfully",
      data: marketCache,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch market overview",
    });
  }
};
