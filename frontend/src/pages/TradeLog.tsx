import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tradesApi } from "../utils/api";
import { Trade } from "../types";
import { calculateTradePnl } from "../utils/pnlCalculator";
import {
  Button,
  Card,
  LoadingSpinner,
  ErrorMessage,
  SearchFilters,
  SearchFiltersType,
} from "../components";

type InlineEditDraft = {
  date: string;
  symbol: string;
  trade_type: "long" | "short";
  position_size: number;
  entry_price: number | "";
  exit_price: number | "";
  realized_pnl: number | "";
  status: "open" | "closed" | "reviewed";
};

function TradeLog() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<SearchFiltersType>({});
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<InlineEditDraft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadTrades();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [trades, activeFilters]);

  const loadTrades = async (filtersOverride?: SearchFiltersType) => {
    try {
      setLoading(true);
      const filters = filtersOverride ?? activeFilters;
      const params: any = { limit: 1000 };

      // Apply server-side filters if available
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const res = await tradesApi.getAll(params);
      setTrades(res.data.data);
    } catch (error: any) {
      console.error("Error loading trades:", error);
      setError(
        error?.response?.data?.error?.message || "Failed to load trades"
      );
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...trades];

    // Client-side filtering for complex queries
    if (activeFilters.query) {
      const query = activeFilters.query.toLowerCase();
      filtered = filtered.filter(
        (trade) =>
          trade.symbol?.toLowerCase().includes(query) ||
          trade.notes?.toLowerCase().includes(query) ||
          trade.reflection?.toLowerCase().includes(query)
      );
    }

    if (activeFilters.trade_type) {
      filtered = filtered.filter(
        (trade) => trade.trade_type === activeFilters.trade_type
      );
    }

    if (activeFilters.asset_class) {
      filtered = filtered.filter(
        (trade) => trade.asset_class === activeFilters.asset_class
      );
    }

    setFilteredTrades(filtered);
  };

  const handleSearch = (filters: SearchFiltersType) => {
    setActiveFilters(filters);
    // Reload if server-side filters changed
    if (filters.status || filters.date_from || filters.date_to) {
      loadTrades(filters);
    }
  };

  const handleReset = () => {
    setActiveFilters({});
    loadTrades({});
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Use the centralized P/L calculator from utils/pnlCalculator

  const getPnlColor = (value: number) => {
    if (value > 0) return "text-dark-accent-success";
    if (value < 0) return "text-dark-accent-danger";
    return "text-dark-text-secondary";
  };

  const startEdit = (trade: Trade) => {
    const displayPnl =
      trade.realized_pnl != null ? trade.realized_pnl : calculateTradePnl(trade);
    setEditingTradeId(trade.id);
    setEditingDraft({
      date: new Date(trade.date).toISOString().slice(0, 10),
      symbol: trade.symbol,
      trade_type: trade.trade_type,
      position_size: trade.position_size,
      entry_price: trade.entry_price ?? "",
      exit_price: trade.exit_price ?? "",
      realized_pnl: displayPnl,
      status: trade.status,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingTradeId(null);
    setEditingDraft(null);
  };

  const saveEdit = async () => {
    if (!editingTradeId || !editingDraft) return;
    setSavingId(editingTradeId);
    setError(null);
    try {
      const { data } = await tradesApi.update(editingTradeId, {
        date: editingDraft.date,
        symbol: editingDraft.symbol,
        trade_type: editingDraft.trade_type,
        position_size: editingDraft.position_size,
        entry_price: editingDraft.entry_price === "" ? null : Number(editingDraft.entry_price),
        exit_price: editingDraft.exit_price === "" ? null : Number(editingDraft.exit_price),
        realized_pnl:
          editingDraft.realized_pnl === "" ? null : Number(editingDraft.realized_pnl),
        status: editingDraft.status,
      });
      setTrades((prev) =>
        prev.map((t) => (t.id === editingTradeId ? { ...t, ...data.data } : t))
      );
      setEditingTradeId(null);
      setEditingDraft(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to update trade"
      );
    } finally {
      setSavingId(null);
    }
  };

  const updateDraft = <K extends keyof InlineEditDraft>(
    field: K,
    value: InlineEditDraft[K]
  ) => {
    if (!editingDraft) return;
    setEditingDraft({ ...editingDraft, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
            Trade Log
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            View and manage all your trades
          </p>
        </div>
        <Link to="/add-trade" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">Add Trade</Button>
        </Link>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      <SearchFilters onSearch={handleSearch} onReset={handleReset} />

      <Card>
        {filteredTrades.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-4">
              No trades to display.
            </p>
            <Link to="/add-trade">
              <Button>Add Your First Trade</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-dark-border-primary">
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden md:table-cell">
                    Position Size
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Entry Price
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden lg:table-cell">
                    Exit Price
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                    P/L
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade) => {
                  const pnl = calculateTradePnl(trade);
                  const isEditing = editingTradeId === trade.id;
                  const draft = isEditing ? editingDraft! : null;
                  const inputClass =
                    "w-full min-w-0 px-2 py-1.5 text-xs sm:text-sm rounded border border-dark-border-primary bg-dark-bg-primary text-dark-text-primary focus:ring-1 focus:ring-dark-accent-primary focus:border-dark-accent-primary";

                  return (
                    <tr
                      key={trade.id}
                      className={`border-b border-dark-border-primary transition-colors duration-150 ${
                        isEditing ? "bg-dark-bg-tertiary" : "hover:bg-dark-bg-tertiary"
                      }`}
                    >
                      <td className="py-3 px-2 sm:px-4 text-dark-text-primary whitespace-nowrap text-xs sm:text-sm">
                        {isEditing && draft ? (
                          <input
                            type="date"
                            value={draft.date}
                            onChange={(e) => updateDraft("date", e.target.value)}
                            className={inputClass}
                            aria-label="Trade date"
                          />
                        ) : (
                          new Date(trade.date).toLocaleDateString()
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        {isEditing && draft ? (
                          <input
                            type="text"
                            value={draft.symbol}
                            onChange={(e) => updateDraft("symbol", e.target.value)}
                            className={inputClass}
                            placeholder="Symbol"
                            aria-label="Symbol"
                          />
                        ) : (
                          <span className="font-medium text-dark-text-primary text-xs sm:text-sm">
                            {trade.symbol}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        {isEditing && draft ? (
                          <select
                            value={draft.trade_type}
                            onChange={(e) =>
                              updateDraft("trade_type", e.target.value as "long" | "short")
                            }
                            className={inputClass}
                            aria-label="Trade type"
                          >
                            <option value="long">LONG</option>
                            <option value="short">SHORT</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.trade_type === "long"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {trade.trade_type.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-dark-text-primary text-xs sm:text-sm hidden md:table-cell">
                        {isEditing && draft ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={draft.position_size}
                            onChange={(e) =>
                              updateDraft("position_size", parseFloat(e.target.value) || 0)
                            }
                            className={inputClass}
                            aria-label="Position size"
                          />
                        ) : (
                          trade.position_size
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-dark-text-primary text-xs sm:text-sm hidden lg:table-cell">
                        {isEditing && draft ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={draft.entry_price}
                            onChange={(e) =>
                              updateDraft(
                                "entry_price",
                                e.target.value === "" ? "" : parseFloat(e.target.value)
                              )
                            }
                            className={inputClass}
                            placeholder="—"
                            aria-label="Entry price"
                          />
                        ) : trade.entry_price !== null &&
                          trade.entry_price !== undefined ? (
                          formatCurrency(trade.entry_price)
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-dark-text-primary text-xs sm:text-sm hidden lg:table-cell">
                        {isEditing && draft ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={draft.exit_price}
                            onChange={(e) =>
                              updateDraft(
                                "exit_price",
                                e.target.value === "" ? "" : parseFloat(e.target.value)
                              )
                            }
                            className={inputClass}
                            placeholder="—"
                            aria-label="Exit price"
                          />
                        ) : trade.exit_price !== undefined &&
                          trade.exit_price !== null ? (
                          formatCurrency(trade.exit_price)
                        ) : (
                          "-"
                        )}
                      </td>
                      <td
                        className={`py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm ${getPnlColor(
                          pnl
                        )}`}
                      >
                        {isEditing && draft ? (
                          <input
                            type="number"
                            step="any"
                            value={draft.realized_pnl}
                            onChange={(e) =>
                              updateDraft(
                                "realized_pnl",
                                e.target.value === ""
                                  ? ""
                                  : parseFloat(e.target.value)
                              )
                            }
                            className={inputClass}
                            aria-label="P/L"
                          />
                        ) : (
                          formatCurrency(pnl)
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                        {isEditing && draft ? (
                          <select
                            value={draft.status}
                            onChange={(e) =>
                              updateDraft(
                                "status",
                                e.target.value as "open" | "closed" | "reviewed"
                              )
                            }
                            className={inputClass}
                            aria-label="Status"
                          >
                            <option value="open">open</option>
                            <option value="closed">closed</option>
                            <option value="reviewed">reviewed</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.status === "closed"
                                ? "bg-dark-accent-success/20 text-dark-accent-success"
                                : trade.status === "open"
                                ? "bg-dark-accent-warning/20 text-dark-accent-warning"
                                : "bg-dark-bg-tertiary text-dark-text-secondary"
                            }`}
                          >
                            {trade.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        {isEditing ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={savingId === trade.id}
                              className="text-dark-accent-success hover:text-green-400 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {savingId === trade.id ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={savingId === trade.id}
                              className="text-dark-text-secondary hover:text-dark-text-primary text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(trade)}
                              className="text-dark-accent-primary hover:text-blue-400 text-xs sm:text-sm font-medium transition-colors mr-2"
                            >
                              Edit
                            </button>
                            <Link
                              to={`/trade/${trade.id}`}
                              className="text-dark-accent-primary hover:text-blue-400 text-xs sm:text-sm font-medium transition-colors"
                            >
                              View
                            </Link>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TradeLog;
