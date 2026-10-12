# 📊 Live Stock Market Dashboard

A professional live stock market dashboard built with **HTML, CSS, JavaScript, Chart.js, Vercel Serverless Functions, and Finnhub API**.

## 🚀 Live Demo

Project Link = https://live-stock-market-dashboard.vercel.app/

GitHub Repository = https://github.com/princerana2303/live-stock-market-dashboard

## 📸 Dashboard

The dashboard provides a clean and responsive interface for monitoring live stock market data.

## ✨ Features

- 📈 Live stock price updates
- 📊 Interactive price chart
- 🔎 Search and filter stocks
- ➕ Add stocks to watchlist
- 📈 Gainers and losers
- 💹 Price change and Change %
- 🔝 High and Low prices
- 📦 Trading volume
- 🕒 Last updated time
- 🔐 Secure server-side API integration
- 📱 Responsive dashboard design

## 🛠️ Tech Stack

- **HTML5** – Dashboard structure
- **CSS3** – Responsive UI and styling
- **JavaScript** – Application logic and live data updates
- **Chart.js** – Interactive price visualization
- **Finnhub API** – Stock market data
- **Vercel Serverless Functions** – Secure API layer

## 🔐 Architecture

```text
┌─────────────────────┐
│      Browser        │
│   Stock Dashboard   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Vercel API        │
│   /api/quote        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Finnhub API      │
│   Market Data       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Live Stock Data   │
└─────────────────────┘

📁 Project Structure

live-stock-market-dashboard/
│
├── api/
│   └── quote.js
│
├── index.html
├── styles.css
├── app.js
├── package.json
└── README.md

💻 Run Locally

1. Clone the repository
git clone https://github.com/princerana2303/live-stock-market-dashboard.git

2. Open the project
cd live-stock-market-dashboard

3. Start the local server
npx serve .

🔑 Environment Variable

For deployment, add the following environment variable in Vercel:

FINNHUB_API_KEY=your_api_key

The API key should never be placed directly inside frontend JavaScript.

🔄 How It Works

The user opens the dashboard.
The frontend requests stock data from the Vercel API.
Vercel securely accesses the Finnhub API.
Finnhub returns the latest market quote.
The dashboard updates the stock table and chart.
Multiple stocks can be monitored through the watchlist.

📊 Dashboard Includes

Market Watch
Displays:
Stock symbol
Current price
Price change
Change percentage
Daily high
Daily low
Trading volume
Last updated time
Market Movers
Shows stocks with the biggest positive and negative movements among the tracked symbols.
Live Price Chart
Provides an interactive visualization of stock price movement.

🎯 Project Goals

This project was created to demonstrate practical experience with:

REST API integration
JavaScript development
Live market-data handling
Serverless functions
Secure environment variables
Data visualization
Responsive web design
Frontend and backend integration

🚀 Future Improvements

Planned improvements include:

WebSocket-based tick-by-tick updates
Historical stock data
Candlestick charts
Portfolio tracking
Price alerts
More global markets
Advanced technical indicators
User authentication
Custom watchlists

🔒 Security

The frontend does not require users to enter an API key.

The Finnhub API key is stored securely on the server side using:

FINNHUB_API_KEY

This prevents the secret API key from being exposed in the browser source code.

⚠️ Disclaimer

This project is created for educational and portfolio purposes only.

Market data may be delayed or provider-dependent. This dashboard does not provide financial or investment advice.

👨‍💻 Author

Prince Rana
B.Tech Computer Science & Engineering

⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

Built with HTML, CSS, JavaScript, Chart.js, Finnhub API and Vercel.
