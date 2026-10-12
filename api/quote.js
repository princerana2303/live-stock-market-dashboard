export default async function handler(req, res) {
  try {
    const symbol = (req.query.symbol || "AAPL").toUpperCase();

    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "FINNHUB_API_KEY is not configured"
      });
    }

    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Finnhub API request failed"
      });
    }

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}
