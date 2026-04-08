import { useState, useEffect } from "react";
import { tradesApi, analyticsApi, accountsApi } from "../utils/api";
import { Trade, DashboardStats } from "../types";
import { calculateTradePnl } from "../utils/pnlCalculator";
import {
  formatCurrency as formatUserCurrency,
  formatWithUserDate,
} from "../utils/userSettings";
import {
  Card,
  LoadingSpinner,
  Button,
  Input,
  Select,
  ErrorMessage,
  SuccessMessage,
} from "../components";

function Reports() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    status: "",
    asset_class: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, accountsRes] = await Promise.all([
        analyticsApi.getDashboard({}),
        accountsApi.getAll(),
      ]);
      const pageSize = 1000;
      let offset = 0;
      let total = 0;
      let allTrades: Trade[] = [];

      do {
        const tradesRes = await tradesApi.getAll({ limit: pageSize, offset });
        const pageTrades = tradesRes.data.data || [];
        total = Number(tradesRes.data.total || 0);
        allTrades = allTrades.concat(pageTrades);
        offset += pageSize;
      } while (offset < total);

      setTrades(allTrades);
      setStats(statsRes.data.data);
      setAccounts(accountsRes.data.data || []);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err?.response?.data?.error?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTrades = () => {
    let filtered = [...trades];

    if (filters.date_from) {
      filtered = filtered.filter(
        (t) => new Date(t.date) >= new Date(filters.date_from)
      );
    }
    if (filters.date_to) {
      filtered = filtered.filter(
        (t) => new Date(t.date) <= new Date(filters.date_to)
      );
    }
    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters.asset_class) {
      filtered = filtered.filter((t) => t.asset_class === filters.asset_class);
    }

    return filtered;
  };

  const exportToCSV = () => {
    setExporting("csv");
    setError(null);

    try {
      const filteredTrades = getFilteredTrades();

      const headers = [
        "Date",
        "Symbol",
        "Asset Class",
        "Trade Type",
        "Status",
        "Position Size",
        "Entry Price",
        "Exit Price",
        "P&L",
        "Session",
        "Confidence",
        "Strategy",
        "Notes",
        "Reflection",
      ];

      const rows = filteredTrades.map((trade) => {
        const pnl = calculateTradePnl(trade);
        return [
          formatWithUserDate(trade.date),
          trade.symbol,
          trade.asset_class,
          trade.trade_type,
          trade.status,
          trade.position_size,
          trade.entry_price ?? "",
          trade.exit_price ?? "",
          pnl.toFixed(2),
          trade.session || "",
          trade.confidence_level || "",
          trade.strategy_name || "",
          (trade.notes || "").replace(/"/g, '""'),
          (trade.reflection || "").replace(/"/g, '""'),
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `trades_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Exported ${filteredTrades.length} trades to CSV`);
    } catch (err) {
      setError("Failed to export CSV");
    } finally {
      setExporting(null);
    }
  };

  const exportToJSON = () => {
    setExporting("json");
    setError(null);

    try {
      const filteredTrades = getFilteredTrades();

      const exportData = {
        exportDate: new Date().toISOString(),
        totalTrades: filteredTrades.length,
        filters: filters,
        trades: filteredTrades.map((trade) => ({
          ...trade,
          calculated_pnl: calculateTradePnl(trade),
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `trades_export_${new Date().toISOString().split("T")[0]}.json`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Exported ${filteredTrades.length} trades to JSON`);
    } catch (err) {
      setError("Failed to export JSON");
    } finally {
      setExporting(null);
    }
  };

  const generatePDFReport = () => {
    setExporting("pdf");
    setError(null);

    try {
      const filteredTrades = getFilteredTrades();

      // Calculate statistics for filtered trades
      let totalPnl = 0;
      let wins = 0;
      let losses = 0;
      let winPnl = 0;
      let lossPnl = 0;

      filteredTrades.forEach((trade) => {
        const pnl = calculateTradePnl(trade);
        totalPnl += pnl;
        if (pnl > 0) {
          wins++;
          winPnl += pnl;
        } else if (pnl < 0) {
          losses++;
          lossPnl += pnl;
        }
      });

      const winRate =
        filteredTrades.length > 0
          ? ((wins / filteredTrades.length) * 100).toFixed(1)
          : "0";
      const avgWin = wins > 0 ? (winPnl / wins).toFixed(2) : "0";
      const avgLoss = losses > 0 ? (lossPnl / losses).toFixed(2) : "0";

      // Generate HTML for PDF
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Trading Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #1a1a2e; margin-top: 30px; }
    .summary { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
    .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; min-width: 150px; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .stat-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <h1>Trading Performance Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  ${
    filters.date_from || filters.date_to
      ? `<p>Period: ${filters.date_from || "Start"} to ${filters.date_to || "Present"}</p>`
      : ""
  }
  
  <h2>Summary Statistics</h2>
  <div class="summary">
    <div class="stat-card">
      <div class="stat-label">Total Trades</div>
      <div class="stat-value">${filteredTrades.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Net P&L</div>
      <div class="stat-value ${totalPnl >= 0 ? "positive" : "negative"}">$${totalPnl.toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Win Rate</div>
      <div class="stat-value">${winRate}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Wins / Losses</div>
      <div class="stat-value">${wins} / ${losses}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Win</div>
      <div class="stat-value positive">$${avgWin}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Loss</div>
      <div class="stat-value negative">$${avgLoss}</div>
    </div>
  </div>

  <h2>Trade Details</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Symbol</th>
        <th>Type</th>
        <th>Entry</th>
        <th>Exit</th>
        <th>Size</th>
        <th>P&L</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${filteredTrades
        .slice(0, 100)
        .map((trade) => {
          const pnl = calculateTradePnl(trade);
          return `
        <tr>
          <td>${formatWithUserDate(trade.date)}</td>
          <td>${trade.symbol}</td>
          <td>${trade.trade_type.toUpperCase()}</td>
          <td>${trade.entry_price ?? "-"}</td>
          <td>${trade.exit_price ?? "-"}</td>
          <td>${trade.position_size}</td>
          <td class="${pnl >= 0 ? "positive" : "negative"}">$${pnl.toFixed(2)}</td>
          <td>${trade.status}</td>
        </tr>
      `;
        })
        .join("")}
    </tbody>
  </table>
  ${filteredTrades.length > 100 ? `<p><em>Showing first 100 of ${filteredTrades.length} trades</em></p>` : ""}

  <div class="footer">
    <p>Trading Journal - Performance Report</p>
    <p>This report was automatically generated. Past performance does not guarantee future results.</p>
  </div>
</body>
</html>
      `;

      // Open in new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      setSuccess("Report generated - use browser print to save as PDF");
    } catch (err) {
      setError("Failed to generate report");
    } finally {
      setExporting(null);
    }
  };

  const exportAccountsSummary = () => {
    setExporting("accounts");
    setError(null);

    try {
      const headers = ["Account Name", "Initial Balance", "Current Balance", "P&L", "P&L %"];
      
      const rows = accounts.map((account) => {
        const pnl = account.current_balance - account.initial_balance;
        const pnlPercent = account.initial_balance > 0 
          ? ((pnl / account.initial_balance) * 100).toFixed(2) 
          : "0";
        return [
          account.name,
          account.initial_balance.toFixed(2),
          account.current_balance.toFixed(2),
          pnl.toFixed(2),
          pnlPercent + "%",
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `accounts_summary_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Exported ${accounts.length} accounts summary`);
    } catch (err) {
      setError("Failed to export accounts");
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filteredTrades = getFilteredTrades();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
          Export & Reports
        </h1>
        <p className="text-sm sm:text-base text-dark-text-secondary">
          Export your trading data and generate performance reports
        </p>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {/* Filters */}
      <Card title="Filter Data">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="From Date"
            type="date"
            value={filters.date_from}
            onChange={(e) =>
              setFilters({ ...filters, date_from: e.target.value })
            }
          />
          <Input
            label="To Date"
            type="date"
            value={filters.date_to}
            onChange={(e) =>
              setFilters({ ...filters, date_to: e.target.value })
            }
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[
              { value: "", label: "All Statuses" },
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
              { value: "reviewed", label: "Reviewed" },
            ]}
          />
          <Select
            label="Asset Class"
            value={filters.asset_class}
            onChange={(e) =>
              setFilters({ ...filters, asset_class: e.target.value })
            }
            options={[
              { value: "", label: "All Classes" },
              { value: "futures", label: "Futures" },
              { value: "forex", label: "Forex" },
              { value: "stocks", label: "Stocks" },
              { value: "crypto", label: "Crypto" },
            ]}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-dark-text-secondary">
            {filteredTrades.length} trades match your filters
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setFilters({
                date_from: "",
                date_to: "",
                status: "",
                asset_class: "",
              })
            }
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-dark-text-primary mb-2">
              Export CSV
            </h3>
            <p className="text-xs text-dark-text-secondary mb-4">
              Download trades as spreadsheet
            </p>
            <Button
              onClick={exportToCSV}
              isLoading={exporting === "csv"}
              className="w-full"
            >
              Download CSV
            </Button>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-dark-text-primary mb-2">
              Export JSON
            </h3>
            <p className="text-xs text-dark-text-secondary mb-4">
              Download trades as JSON data
            </p>
            <Button
              onClick={exportToJSON}
              isLoading={exporting === "json"}
              className="w-full"
            >
              Download JSON
            </Button>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-dark-text-primary mb-2">
              PDF Report
            </h3>
            <p className="text-xs text-dark-text-secondary mb-4">
              Generate printable report
            </p>
            <Button
              onClick={generatePDFReport}
              isLoading={exporting === "pdf"}
              className="w-full"
            >
              Generate PDF
            </Button>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-dark-text-primary mb-2">
              Accounts Summary
            </h3>
            <p className="text-xs text-dark-text-secondary mb-4">
              Export account balances
            </p>
            <Button
              onClick={exportAccountsSummary}
              isLoading={exporting === "accounts"}
              className="w-full"
            >
              Export Accounts
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      {stats && (
        <Card title="Current Statistics">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-dark-bg-tertiary rounded-lg">
              <p className="text-xs text-dark-text-secondary uppercase mb-1">
                Total Trades
              </p>
              <p className="text-xl font-bold text-dark-text-primary">
                {stats.total_trades}
              </p>
            </div>
            <div className="text-center p-4 bg-dark-bg-tertiary rounded-lg">
              <p className="text-xs text-dark-text-secondary uppercase mb-1">
                Net P&L
              </p>
              <p
                className={`text-xl font-bold ${
                  stats.net_pl >= 0
                    ? "text-dark-accent-success"
                    : "text-dark-accent-danger"
                }`}
              >
                {formatUserCurrency(stats.net_pl)}
              </p>
            </div>
            <div className="text-center p-4 bg-dark-bg-tertiary rounded-lg">
              <p className="text-xs text-dark-text-secondary uppercase mb-1">
                Win Rate
              </p>
              <p className="text-xl font-bold text-dark-text-primary">
                {stats.win_rate.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 bg-dark-bg-tertiary rounded-lg">
              <p className="text-xs text-dark-text-secondary uppercase mb-1">
                Avg R:R
              </p>
              <p className="text-xl font-bold text-dark-text-primary">
                {stats.avg_rr.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default Reports;
