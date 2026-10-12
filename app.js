const symbols = JSON.parse(localStorage.getItem("symbols") || '["AAPL","MSFT","NVDA","AMZN","TSLA"]');
let key = localStorage.getItem("finnhub_key") || "";
let ws, selected = symbols[0] || "AAPL", data = {}, points = {}, demoTimer = null, pollTimer = null;
let sortKey = "symbol", sortDirection = 1, chartRange = "all";

const demoBase = { AAPL: 214.78, MSFT: 458.12, NVDA: 128.66, AMZN: 191.33, TSLA: 223.04 };
const statusEl = document.querySelector("#status");
const keyEl = document.querySelector("#key");
const countEl = document.querySelector("#count");

keyEl.value = key;
countEl.textContent = symbols.length;

function n(x) {
  return Number.isFinite(x) ? x.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "?";
}

function setStatus(msg, color = "#7f8da8") {
  statusEl.textContent = msg;
  statusEl.style.color = color;
}

function isMarketOpen() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);

  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const minutes = hour * 60 + minute;

  const isWeekday = day !== "Sat" && day !== "Sun";
  return isWeekday && minutes >= 9 * 60 + 30 && minutes <= 16 * 60;
}

function updateMarketStatus() {
  const open = isMarketOpen();
  const live = key && ws && ws.readyState === WebSocket.OPEN;
  const feed = demoTimer ? "Demo feed" : live ? "Live feed" : key ? "API disconnected" : "Demo feed";
  setStatus(`● ${open ? "Market Open" : "Market Closed"} · ${feed}`, open ? "#b7ed62" : "#ff8a78");
}

function applyQuote(symbol, quote) {
  const previous = data[symbol]?.price ?? quote.price;
  const change = quote.price - previous;
  const cp = previous ? (change / previous) * 100 : 0;

  const next = {
    symbol,
    price: quote.price,
    change,
    cp,
    high: Math.max(data[symbol]?.high ?? quote.price, quote.price),
    low: Math.min(data[symbol]?.low ?? quote.price, quote.price),
    volume: (data[symbol]?.volume ?? 0) + (quote.volume || 0),
    time: quote.time || Date.now()
  };

  data[symbol] = next;

  if (!points[symbol]) points[symbol] = [];
  points[symbol].push({ p: quote.price, t: next.time });
  if (points[symbol].length > 120) points[symbol].shift();
}

function render() {
  const vals = symbols.map((s) => data[s]?.cp).filter(Number.isFinite);
  document.querySelector("#gainers").textContent = vals.filter((x) => x > 0).length;
  document.querySelector("#losers").textContent = vals.filter((x) => x < 0).length;
  document.querySelector("#avg").textContent = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) + "%" : "?";

  const query = document.querySelector("#search").value.trim().toUpperCase();
  const visibleSymbols = symbols.filter((symbol) => symbol.includes(query)).sort((a, b) => {
    const left = sortKey === "symbol" ? a : data[a]?.[sortKey];
    const right = sortKey === "symbol" ? b : data[b]?.[sortKey];
    if (!Number.isFinite(left) && sortKey !== "symbol") return 1;
    if (!Number.isFinite(right) && sortKey !== "symbol") return -1;
    return (typeof left === "string" ? left.localeCompare(right) : (left ?? 0) - (right ?? 0)) * sortDirection;
  });

  document.querySelector("#body").innerHTML = visibleSymbols.map((s) => {
    const q = data[s] || {};
    const c = (q.cp ?? 0) >= 0 ? "green" : "red";
    return `<tr class="${s === selected ? "is-selected" : ""}" data-symbol="${s}"><td><button class="symbol-select" data-select="${s}">${s}<span class="row-dot"></span></button></td><td class="price-cell">$${n(q.price)}</td><td class="${c}">${q.change == null ? "?" : (q.change >= 0 ? "+" : "") + n(q.change)}</td><td class="${c}">${q.cp == null ? "?" : (q.cp >= 0 ? "+" : "") + q.cp.toFixed(2) + "%"}</td><td>$${n(q.high)}</td><td>$${n(q.low)}</td><td>${n(q.volume)}</td><td>${q.time ? new Date(q.time).toLocaleTimeString() : "?"}</td><td><button class="remove-symbol" data-remove="${s}" aria-label="Remove ${s}" title="Remove ${s}">×</button></td></tr>`;
  }).join("");

  document.querySelector("#movers").innerHTML = symbols.map((s) => ({ s, v: data[s]?.cp })).filter((x) => Number.isFinite(x.v)).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).map((x) => `<button class="mover ${x.s === selected ? "is-selected" : ""}" data-select="${x.s}"><b>${x.s}</b><span class="${x.v >= 0 ? "green" : "red"}">${x.v >= 0 ? "+" : ""}${x.v.toFixed(2)}%</span><span class="mover-track"><i class="${x.v >= 0 ? "positive" : "negative"}" style="width:${Math.min(Math.abs(x.v) * 12, 100)}%"></i></span></button>`).join("") || "<p class=\"empty-state\">Waiting for market data</p>";

  document.querySelectorAll("[data-select]").forEach((button) => {
    button.onclick = () => {
      selected = button.dataset.select;
      render();
    };
  });
  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      removeSymbol(button.dataset.remove);
    };
  });

  draw();
}

function draw() {
  if (!window.Chart) return;
  if (window.ch) window.ch.destroy();

  const now = Date.now();
  const limits = { "15m": 15 * 60 * 1000, "1h": 60 * 60 * 1000 };
  const p = (points[selected] || []).filter((point) => !limits[chartRange] || now - point.t <= limits[chartRange]);
  const canvas = document.querySelector("#chart");
  if (!canvas) return;
  const quote = data[selected];
  document.querySelector("#chartTitle").textContent = selected;
  document.querySelector("#chartPrice").textContent = quote ? `$${n(quote.price)}  ${quote.cp >= 0 ? "+" : ""}${quote.cp.toFixed(2)}%` : "Waiting for quote";
  document.querySelector("#chartPrice").className = quote?.cp >= 0 ? "green" : "red";

  window.ch = new Chart(canvas, {
    type: "line",
    data: {
      labels: p.map((x) => new Date(x.t).toLocaleTimeString()),
      datasets: [{ label: selected, data: p.map((x) => x.p), borderColor: "#b7ed62", backgroundColor: "rgba(183,237,98,.09)", borderWidth: 2, pointRadius: 0, pointHitRadius: 8, tension: 0.24, fill: true }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: (context) => `$${n(context.parsed.y)}` } } },
      scales: {
        x: { ticks: { color: "#7f8da8", maxTicksLimit: 7 }, grid: { color: "#1d2941" } },
        y: { ticks: { color: "#7f8da8" }, grid: { color: "#1d2941" } }
      }
    }
  });
}

function seedDemoData() {
  symbols.forEach((symbol) => {
    const base = demoBase[symbol] || 100;
    if (!data[symbol]) {
      applyQuote(symbol, { price: base, volume: 1200 + Math.round(Math.random() * 5000), time: Date.now() });
    }
  });
}

function startDemoFeed() {
  if (demoTimer) clearInterval(demoTimer);
  seedDemoData();
  render();

  demoTimer = setInterval(() => {
    symbols.forEach((symbol) => {
      const last = data[symbol]?.price ?? demoBase[symbol] ?? 100;
      const drift = (Math.random() - 0.5) * 2.8;
      const nextPrice = Number((last * (1 + drift / 100)).toFixed(2));
      applyQuote(symbol, {
        price: nextPrice,
        volume: Math.round(700 + Math.random() * 3000),
        time: Date.now()
      });
    });
    render();
  }, 2200);

  updateMarketStatus();
}

function removeSymbol(symbol) {
  const index = symbols.indexOf(symbol);
  if (index < 0) return;
  symbols.splice(index, 1);
  localStorage.setItem("symbols", JSON.stringify(symbols));
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "unsubscribe", symbol }));
  delete data[symbol];
  delete points[symbol];
  if (selected === symbol) selected = symbols[0] || "";
  countEl.textContent = symbols.length;
  render();
}

async function fetchLatestQuotes() {
  if (!key || !symbols.length) return;

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
        if (!response.ok) return null;
        return { symbol, quote: await response.json() };
      })
    );

    results.forEach((entry) => {
      if (!entry || !entry.quote) return;
      const { symbol, quote } = entry;
      const price = Number(quote.c ?? quote.price);
      if (!Number.isFinite(price)) return;

      const previous = Number(quote.pc ?? data[symbol]?.price ?? price);
      const change = Number(quote.d ?? price - previous);
      const cp = Number.isFinite(quote.dp) ? Number(quote.dp) : (previous ? (change / previous) * 100 : 0);
      const now = Date.now();

      data[symbol] = {
        symbol,
        price,
        change,
        cp,
        high: Number.isFinite(quote.h) ? Math.max(data[symbol]?.high ?? price, quote.h) : data[symbol]?.high ?? price,
        low: Number.isFinite(quote.l) ? Math.min(data[symbol]?.low ?? price, quote.l) : data[symbol]?.low ?? price,
        volume: Number.isFinite(quote.v) ? Number(quote.v) : data[symbol]?.volume ?? 0,
        time: Number.isFinite(quote.t) ? quote.t * 1000 : now
      };

      if (!points[symbol]) points[symbol] = [];
      points[symbol].push({ p: price, t: data[symbol].time });
      if (points[symbol].length > 120) points[symbol].shift();
    });

    render();
    updateMarketStatus();
  } catch (error) {
    console.error("Failed to fetch live quote data:", error);
    setStatus("● Live refresh failed — retrying", "#fbbf24");
  }
}

function connect() {
  key = document.querySelector("#key").value.trim();
  if (!key) {
    setStatus("? No API key ? demo mode active", "#fbbf24");
    startDemoFeed();
    return;
  }

  localStorage.setItem("finnhub_key", key);
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (ws) ws.close();

  setStatus(`● Connecting · ${isMarketOpen() ? "Market Open" : "Market Closed"}`, "#f4bd55");
  ws = new WebSocket("wss://ws.finnhub.io?token=" + encodeURIComponent(key));

  ws.onopen = () => {
    updateMarketStatus();
    symbols.forEach((s) => ws.send(JSON.stringify({ type: "subscribe", symbol: s })));
    fetchLatestQuotes();
    pollTimer = setInterval(() => {
      fetchLatestQuotes();
      updateMarketStatus();
    }, 15000);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type !== "trade" || !Array.isArray(message.data)) return;

      message.data.forEach((t) => {
        const symbol = t.s;
        const price = Number(t.p);
        if (!symbol || !Number.isFinite(price)) return;

        applyQuote(symbol, {
          price,
          volume: Number(t.v) || 0,
          time: t.t || Date.now()
        });
      });

      render();
    } catch (error) {
      console.error("Failed to parse live tick:", error);
    }
  };

  ws.onerror = () => {
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = null;
    updateMarketStatus();
    console.error("Finnhub auth failed. Check your API key.");
  };

  ws.onclose = () => {
    updateMarketStatus();
  };
}

setInterval(() => {
  if (key) {
    updateMarketStatus();
  }
}, 60000);

document.querySelector("#connect").onclick = connect;
document.querySelector("#search").addEventListener("input", render);
document.querySelectorAll("[data-sort]").forEach((button) => {
  button.onclick = () => {
    const nextKey = button.dataset.sort;
    sortDirection = sortKey === nextKey ? sortDirection * -1 : 1;
    sortKey = nextKey;
    document.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("is-sorted", item === button));
    button.querySelector("span").textContent = sortDirection === 1 ? "↑" : "↓";
    render();
  };
});
document.querySelectorAll("[data-range]").forEach((button) => {
  button.onclick = () => {
    chartRange = button.dataset.range;
    document.querySelectorAll("[data-range]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    draw();
  };
});
document.querySelector("#add").onclick = () => {
  const symbol = document.querySelector("#symbol").value.trim().toUpperCase();
  if (!/^[A-Z.]{1,12}$/.test(symbol)) return;

  if (!symbols.includes(symbol)) {
    symbols.push(symbol);
    localStorage.setItem("symbols", JSON.stringify(symbols));
    document.querySelector("#count").textContent = symbols.length;

    if (key && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "subscribe", symbol }));
    } else if (!data[symbol]) {
      applyQuote(symbol, {
        price: demoBase[symbol] || 100,
        volume: 1000,
        time: Date.now()
      });
    }
    selected = symbol;
    if (key && ws?.readyState === WebSocket.OPEN) fetchLatestQuotes();
  }

  document.querySelector("#symbol").value = "";
  render();
};
document.querySelector("#symbol").addEventListener("keydown", (event) => {
  if (event.key === "Enter") document.querySelector("#add").click();
});

render();
if (!key) {
  startDemoFeed();
} else {
  connect();
}
