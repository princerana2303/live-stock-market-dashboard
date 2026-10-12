const symbols = JSON.parse(
  localStorage.getItem("symbols") || '["AAPL","MSFT","NVDA","AMZN","TSLA"]'
);

let selected = symbols[0] || "AAPL";
let data = {};
let points = {};
let sortKey = "symbol";
let sortDirection = 1;
let chartRange = "all";

const statusEl = document.querySelector("#status");
const countEl = document.querySelector("#count");

function n(x) {
  return Number.isFinite(x)
    ? x.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : "?";
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
  const weekday = day !== "Sat" && day !== "Sun";

  return weekday && minutes >= 570 && minutes <= 960;
}

function updateMarketStatus() {
  const open = isMarketOpen();

  setStatus(
    `● ${open ? "Market Open" : "Market Closed"} · Secure Live API`,
    open ? "#b7ed62" : "#ff8a78"
  );
}

function applyQuote(symbol, quote) {
  const price = Number(quote.c);

  if (!Number.isFinite(price)) return;

  const previous = data[symbol]?.price ?? price;
  const change = Number(quote.d ?? price - previous);
  const cp = Number.isFinite(Number(quote.dp))
    ? Number(quote.dp)
    : previous
      ? (change / previous) * 100
      : 0;

  data[symbol] = {
    symbol,
    price,
    change,
    cp,
    high: Number(quote.h ?? price),
    low: Number(quote.l ?? price),
    volume: Number(quote.v ?? data[symbol]?.volume ?? 0),
    time: Number(quote.t)
      ? Number(quote.t) * 1000
      : Date.now()
  };

  if (!points[symbol]) {
    points[symbol] = [];
  }

  points[symbol].push({
    p: price,
    t: data[symbol].time
  });

  if (points[symbol].length > 120) {
    points[symbol].shift();
  }
}

function render() {
  const vals = symbols
    .map((s) => data[s]?.cp)
    .filter(Number.isFinite);

  document.querySelector("#gainers").textContent =
    vals.filter((x) => x > 0).length;

  document.querySelector("#losers").textContent =
    vals.filter((x) => x < 0).length;

  document.querySelector("#avg").textContent =
    vals.length
      ? (
          vals.reduce((a, b) => a + b, 0) / vals.length
        ).toFixed(2) + "%"
      : "?";

  const query = document
    .querySelector("#search")
    .value
    .trim()
    .toUpperCase();

  const visibleSymbols = symbols
    .filter((symbol) => symbol.includes(query))
    .sort((a, b) => {
      const left =
        sortKey === "symbol"
          ? a
          : data[a]?.[sortKey];

      const right =
        sortKey === "symbol"
          ? b
          : data[b]?.[sortKey];

      if (!Number.isFinite(left) && sortKey !== "symbol") return 1;
      if (!Number.isFinite(right) && sortKey !== "symbol") return -1;

      return (
        (typeof left === "string"
          ? left.localeCompare(right)
          : (left ?? 0) - (right ?? 0)) *
        sortDirection
      );
    });

  document.querySelector("#body").innerHTML =
    visibleSymbols
      .map((s) => {
        const q = data[s] || {};
        const positive = (q.cp ?? 0) >= 0;
        const c = positive ? "green" : "red";

        return `
          <tr class="${s === selected ? "is-selected" : ""}" data-symbol="${s}">
            <td>
              <button class="symbol-select" data-select="${s}">
                ${s}<span class="row-dot"></span>
              </button>
            </td>

            <td class="price-cell">
              $${n(q.price)}
            </td>

            <td class="${c}">
              ${
                q.change == null
                  ? "?"
                  : (q.change >= 0 ? "+" : "") + n(q.change)
              }
            </td>

            <td class="${c}">
              ${
                q.cp == null
                  ? "?"
                  : (q.cp >= 0 ? "+" : "") +
                    q.cp.toFixed(2) +
                    "%"
              }
            </td>

            <td>$${n(q.high)}</td>
            <td>$${n(q.low)}</td>
            <td>${n(q.volume)}</td>

            <td>
              ${
                q.time
                  ? new Date(q.time).toLocaleTimeString()
                  : "?"
              }
            </td>

            <td>
              <button
                class="remove-symbol"
                data-remove="${s}"
                aria-label="Remove ${s}"
                title="Remove ${s}"
              >
                ×
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

  document.querySelector("#movers").innerHTML =
    symbols
      .map((s) => ({
        s,
        v: data[s]?.cp
      }))
      .filter((x) => Number.isFinite(x.v))
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
      .map(
        (x) => `
          <button
            class="mover ${
              x.s === selected ? "is-selected" : ""
            }"
            data-select="${x.s}"
          >
            <b>${x.s}</b>

            <span class="${
              x.v >= 0 ? "green" : "red"
            }">
              ${x.v >= 0 ? "+" : ""}
              ${x.v.toFixed(2)}%
            </span>

            <span class="mover-track">
              <i
                class="${
                  x.v >= 0 ? "positive" : "negative"
                }"
                style="width:${Math.min(
                  Math.abs(x.v) * 12,
                  100
                )}%"
              ></i>
            </span>
          </button>
        `
      )
      .join("") ||
    '<p class="empty-state">Waiting for market data</p>';

  document
    .querySelectorAll("[data-select]")
    .forEach((button) => {
      button.onclick = () => {
        selected = button.dataset.select;
        render();
      };
    });

  document
    .querySelectorAll("[data-remove]")
    .forEach((button) => {
      button.onclick = (event) => {
        event.stopPropagation();
        removeSymbol(button.dataset.remove);
      };
    });

  draw();
}

function draw() {
  if (!window.Chart) return;

  if (window.ch) {
    window.ch.destroy();
  }

  const now = Date.now();

  const limits = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000
  };

  const p = (points[selected] || []).filter(
    (point) =>
      !limits[chartRange] ||
      now - point.t <= limits[chartRange]
  );

  const canvas = document.querySelector("#chart");

  if (!canvas) return;

  const quote = data[selected];

  document.querySelector("#chartTitle").textContent =
    selected;

  document.querySelector("#chartPrice").textContent =
    quote
      ? `$${n(quote.price)} ${
          quote.cp >= 0 ? "+" : ""
        }${quote.cp.toFixed(2)}%`
      : "Waiting for quote";

  document.querySelector("#chartPrice").className =
    quote?.cp >= 0 ? "green" : "red";

  window.ch = new Chart(canvas, {
    type: "line",

    data: {
      labels: p.map((x) =>
        new Date(x.t).toLocaleTimeString()
      ),

      datasets: [
        {
          label: selected,
          data: p.map((x) => x.p),
          borderColor: "#b7ed62",
          backgroundColor: "rgba(183,237,98,.09)",
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 8,
          tension: 0.24,
          fill: true
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          displayColors: false,

          callbacks: {
            label: (context) =>
              `$${n(context.parsed.y)}`
          }
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#7f8da8",
            maxTicksLimit: 7
          },

          grid: {
            color: "#1d2941"
          }
        },

        y: {
          ticks: {
            color: "#7f8da8"
          },

          grid: {
            color: "#1d2941"
          }
        }
      }
    }
  });
}

function removeSymbol(symbol) {
  const index = symbols.indexOf(symbol);

  if (index < 0) return;

  symbols.splice(index, 1);

  localStorage.setItem(
    "symbols",
    JSON.stringify(symbols)
  );

  delete data[symbol];
  delete points[symbol];

  if (selected === symbol) {
    selected = symbols[0] || "";
  }

  countEl.textContent = symbols.length;

  render();
}

async function fetchQuote(symbol) {
  try {
    const response = await fetch(
      `/api/quote?symbol=${encodeURIComponent(symbol)}`
    );

    if (!response.ok) {
      throw new Error(
        `API returned ${response.status}`
      );
    }

    const quote = await response.json();

    applyQuote(symbol, quote);

    return true;
  } catch (error) {
    console.error(
      `Failed to fetch ${symbol}:`,
      error
    );

    return false;
  }
}

async function updateMarket() {
  if (!symbols.length) {
    setStatus(
      "● No stocks selected",
      "#fbbf24"
    );
    return;
  }

  setStatus(
    `● Updating ${symbols.length} stocks...`,
    "#f4bd55"
  );

  const results = await Promise.all(
    symbols.map((symbol) =>
      fetchQuote(symbol)
    )
  );

  if (results.some(Boolean)) {
    render();
    updateMarketStatus();
  } else {
    setStatus(
      "● API connection failed",
      "#ff8a78"
    );
  }
}

document.querySelector("#search").addEventListener(
  "input",
  render
);

document
  .querySelectorAll("[data-sort]")
  .forEach((button) => {
    button.onclick = () => {
      const nextKey = button.dataset.sort;

      sortDirection =
        sortKey === nextKey
          ? sortDirection * -1
          : 1;

      sortKey = nextKey;

      document
        .querySelectorAll("[data-sort]")
        .forEach((item) =>
          item.classList.toggle(
            "is-sorted",
            item === button
          )
        );

      button.querySelector("span").textContent =
        sortDirection === 1 ? "↑" : "↓";

      render();
    };
  });

document
  .querySelectorAll("[data-range]")
  .forEach((button) => {
    button.onclick = () => {
      chartRange = button.dataset.range;

      document
        .querySelectorAll("[data-range]")
        .forEach((item) => {
          const active = item === button;

          item.classList.toggle(
            "is-active",
            active
          );

          item.setAttribute(
            "aria-pressed",
            String(active)
          );
        });

      draw();
    };
  });

document.querySelector("#add").onclick = async () => {
  const symbol = document
    .querySelector("#symbol")
    .value
    .trim()
    .toUpperCase();

  if (!/^[A-Z.]{1,12}$/.test(symbol)) return;

  if (!symbols.includes(symbol)) {
    symbols.push(symbol);

    localStorage.setItem(
      "symbols",
      JSON.stringify(symbols)
    );

    countEl.textContent = symbols.length;

    selected = symbol;

    await fetchQuote(symbol);
  }

  document.querySelector("#symbol").value = "";

  render();
};

document
  .querySelector("#symbol")
  .addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      document.querySelector("#add").click();
    }
  });

/*
  Old API-key controls are no longer needed.
  Hide them if they exist in the old HTML.
*/

const oldKey = document.querySelector("#key");
const oldConnect = document.querySelector("#connect");

if (oldKey) {
  oldKey.style.display = "none";
}

if (oldConnect) {
  oldConnect.style.display = "none";
}

countEl.textContent = symbols.length;

render();

/*
  Initial secure API request
*/
updateMarket();

/*
  Refresh every 10 seconds
*/
setInterval(updateMarket, 10000);

/*
  Update market status every minute
*/
setInterval(updateMarketStatus, 60000);

updateMarketStatus();
