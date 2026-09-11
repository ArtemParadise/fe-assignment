// Mock stock market data generator
export const generateStockData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          symbol: "AAPL",
          name: "Apple Inc.",
          price: 178.52,
          sector: "Technology",
          marketCap: 2800000000000,
          change: 2.3,
          volume: 52000000,
        },
        {
          id: 2,
          symbol: "MSFT",
          name: "Microsoft Corporation",
          price: 412.78,
          sector: "Technology",
          marketCap: 3100000000000,
          change: -1.2,
          volume: 28000000,
        },
        {
          id: 3,
          symbol: "GOOGL",
          name: "Alphabet Inc.",
          price: 142.65,
          sector: "Technology",
          marketCap: 1800000000000,
          change: 0.8,
          volume: 24000000,
        },
        {
          id: 4,
          symbol: "AMZN",
          name: "Amazon.com Inc.",
          price: 178.25,
          sector: "Consumer Cyclical",
          marketCap: 1850000000000,
          change: 1.5,
          volume: 45000000,
        },
        {
          id: 5,
          symbol: "TSLA",
          name: "Tesla Inc.",
          price: 238.45,
          sector: "Automotive",
          marketCap: 750000000000,
          change: -3.4,
          volume: 98000000,
        },
        {
          id: 6,
          symbol: "META",
          name: "Meta Platforms Inc.",
          price: 485.3,
          sector: "Technology",
          marketCap: 1200000000000,
          change: 4.2,
          volume: 18000000,
        },
        {
          id: 7,
          symbol: "NVDA",
          name: "NVIDIA Corporation",
          price: 875.28,
          sector: "Technology",
          marketCap: 2150000000000,
          change: 5.7,
          volume: 42000000,
        },
        {
          id: 8,
          symbol: "JPM",
          name: "JPMorgan Chase & Co.",
          price: 185.67,
          sector: "Financial",
          marketCap: 540000000000,
          change: -0.5,
          volume: 12000000,
        },
        {
          id: 9,
          symbol: "V",
          name: "Visa Inc.",
          price: 278.92,
          sector: "Financial",
          marketCap: 580000000000,
          change: 1.1,
          volume: 8000000,
        },
        {
          id: 10,
          symbol: "WMT",
          name: "Walmart Inc.",
          price: 165.43,
          sector: "Consumer Defensive",
          marketCap: 450000000000,
          change: 0.3,
          volume: 7000000,
        },
      ]);
    }, 500);
  });
};

// Simulated API with random delays causing race conditions
export const fetchStockDetails = (symbol) => {
  return new Promise((resolve) => {
    // Random delay simulates unpredictable API
    const delay = Math.random() * 2000 + 500;

    setTimeout(() => {
      resolve({
        symbol: symbol,
        name: `${symbol} Corporation`,
        price: (Math.random() * 500 + 50).toFixed(2),
        change: (Math.random() * 10 - 5).toFixed(2),
        volume: Math.floor(Math.random() * 100000000),
        marketCap: Math.floor(Math.random() * 3000000000000),
        pe: (Math.random() * 50 + 5).toFixed(2),
        eps: (Math.random() * 20).toFixed(2),
        high52: (Math.random() * 600 + 100).toFixed(2),
        low52: (Math.random() * 100 + 20).toFixed(2),
        dividend: (Math.random() * 5).toFixed(2),
        beta: (Math.random() * 2).toFixed(2),
      });
    }, delay);
  });
};

// Simulated API for stock news
export const fetchStockNews = (symbol) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          title: `${symbol} Reports Strong Q4 Earnings`,
          date: "2026-01-20",
          summary:
            "Company exceeds analyst expectations with record revenue growth...",
        },
        {
          id: 2,
          title: `Analysts Upgrade ${symbol} Price Target`,
          date: "2026-01-18",
          summary:
            "Major investment banks raise price targets following positive outlook...",
        },
        {
          id: 3,
          title: `${symbol} Announces New Product Launch`,
          date: "2026-01-15",
          summary:
            "Innovative product expected to drive future growth and market share...",
        },
      ]);
    }, 1000);
  });
};

// Simulated API for historical data
export const fetchHistoricalPrices = (_symbol) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = [];

      for (let i = 30; i >= 0; i--) {
        data.push({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          price: (Math.random() * 100 + 150).toFixed(2),
        });
      }

      resolve(data);
    }, 800);
  });
};
