# Live Stock Market Dashboard

A real-time stock market analytics portfolio project.

## Live architecture
Browser dashboard -> Finnhub WebSocket -> live US stock trade events -> calculations -> charts/KPIs.

The dashboard is intentionally based on US equities because the selected free provider supports real-time US stock streaming. Indian NSE real-time data is generally distributed through paid/authorized feeds.

## Run
1. Create a free Finnhub account and get an API key.
2. Open `index.html` or deploy this folder to Vercel.
3. Paste the API key.
4. Click **Connect Live**.
5. Add symbols such as AAPL, MSFT, NVDA, AMZN and TSLA.

## Deploy
Upload these files to GitHub and import the repository into Vercel. No build command is required.

## Portfolio description
Built a real-time Stock Market Analytics Dashboard using JavaScript, WebSockets and Chart.js to ingest live market ticks, calculate price movement and volume metrics, rank market movers and visualize streaming stock prices.

## Note
The API key is stored in browser local storage for this portfolio demo. For a production application, move authenticated API access behind a backend/serverless proxy and follow the provider's market-data licensing/display rules.
