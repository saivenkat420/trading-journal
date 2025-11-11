import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { analyticsApi, tradesApi, goalsApi, strategiesApi } from "../utils/api";
import { DashboardStats, Trade } from "../types";
import { calculateTradePnl } from "../utils/pnlCalculator";
import { LoadingSpinner, Card, Button, Input, Select } from "../components";

interface TradeFilters {
  query?: string;
  symbol?: string;
  status?: string;
  trade_type?: string;
  asset_class?: string;
  strategy_id?: string;
}

interface GoalPulseState {
  profitGoal: number | null;
  winRateGoal: number | null;
  netPl: number;
  winRate: number;
}

interface AggregatedStats {
  netPl: number;
  wins: number;
  losses: number;
  total: number;
  winPnl: number[];
  lossPnl: number[];
}

const PROGRESS_WIDTH_CLASSES: Record<number, string> = {
  0: "w-[0%]",
  5: "w-[5%]",
  10: "w-[10%]",
  15: "w-[15%]",
  20: "w-[20%]",
  25: "w-[25%]",
  30: "w-[30%]",
  35: "w-[35%]",
  40: "w-[40%]",
  45: "w-[45%]",
  50: "w-[50%]",
  55: "w-[55%]",
  60: "w-[60%]",
  65: "w-[65%]",
  70: "w-[70%]",
  75: "w-[75%]",
  80: "w-[80%]",
  85: "w-[85%]",
  90: "w-[90%]",
  95: "w-[95%]",
  100: "w-[100%]",
  105: "w-[105%]",
  110: "w-[110%]",
  115: "w-[115%]",
  120: "w-[120%]",
  125: "w-[125%]",
  130: "w-[130%]",
  135: "w-[135%]",
  140: "w-[140%]",
  145: "w-[145%]",
  150: "w-[150%]",
  155: "w-[155%]",
  160: "w-[160%]",
  165: "w-[165%]",
  170: "w-[170%]",
  175: "w-[175%]",
  180: "w-[180%]",
  185: "w-[185%]",
  190: "w-[190%]",
  195: "w-[195%]",
  200: "w-[200%]",
};

const getProgressWidthClass = (value: number): string => {
  const clamped = Math.max(0, Math.min(200, Math.round(value / 5) * 5));
  return PROGRESS_WIDTH_CLASSES[clamped] ?? "w-[0%]";
};

const normalizeDashboardStats = (
  data: any | null | undefined
): DashboardStats | null => {
  if (!data) return null;
  return {
    net_pl: Number(data.net_pl ?? 0),
    win_rate: Number(data.win_rate ?? 0),
    avg_rr: Number(data.avg_rr ?? 0),
    average_win: Number(data.average_win ?? 0),
    average_loss: Number(data.average_loss ?? 0),
    total_trades: Number(data.total_trades ?? 0),
    total_wins: Number(data.total_wins ?? 0),
    total_losses: Number(data.total_losses ?? 0),
  };
};

const normalizeTrade = (trade: any): Trade => {
  const entry = trade.entry_price;
  const exit = trade.exit_price;

  return {
    ...trade,
    position_size: Number(trade.position_size ?? 0),
    entry_price: entry === null || entry === undefined ? null : Number(entry),
    exit_price: exit === null || exit === undefined ? undefined : Number(exit),
    fees:
      trade.fees !== undefined && trade.fees !== null
        ? Number(trade.fees)
        : undefined,
    contract_size:
      trade.contract_size !== undefined && trade.contract_size !== null
        ? Number(trade.contract_size)
        : undefined,
    point_value:
      trade.point_value !== undefined && trade.point_value !== null
        ? Number(trade.point_value)
        : undefined,
    unit_size:
      trade.unit_size !== undefined && trade.unit_size !== null
        ? Number(trade.unit_size)
        : undefined,
    accounts: Array.isArray(trade.accounts)
      ? trade.accounts.map((account: any) => ({
          ...account,
          pnl: Number(account.pnl ?? 0),
        }))
      : [],
  };
};

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<TradeFilters>({});
  const [goalPulse, setGoalPulse] = useState<GoalPulseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [calendarMonth]);

  useEffect(() => {
    const monthStart = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1
    );
    if (
      selectedDate.getFullYear() !== monthStart.getFullYear() ||
      selectedDate.getMonth() !== monthStart.getMonth()
    ) {
      setSelectedDate(monthStart);
    }
  }, [calendarMonth]);

  useEffect(() => {
    applyFilters();
  }, [filters, allTrades]);

  useEffect(() => {
    loadGoalPulse();
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const response = await strategiesApi.getAll();
      setStrategies(response.data.data || []);
    } catch (error) {
      console.error("Failed to load strategies:", error);
    }
  };

  const loadGoalPulse = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const [goalRes, monthStatsRes] = await Promise.all([
        goalsApi.getAll({ month: monthStart }),
        analyticsApi.getDashboard({ date_from: monthStart, date_to: monthEnd }),
      ]);

      const goal = goalRes.data.data?.[0] || null;
      const monthStats: DashboardStats | undefined = monthStatsRes.data.data;

      const profitGoalValue =
        typeof goal?.profit_goal === "number" ? goal.profit_goal : null;
      const winRateGoalValue =
        typeof goal?.win_rate_goal === "number" ? goal.win_rate_goal : null;

      setGoalPulse({
        profitGoal: profitGoalValue,
        winRateGoal: winRateGoalValue,
        netPl: monthStats?.net_pl || 0,
        winRate: monthStats?.win_rate || 0,
      });
    } catch (error) {
      setGoalPulse(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 1000 };
      const monthStart = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        1
      );
      const monthEnd = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        0
      );
      params.date_from = monthStart.toISOString().split("T")[0];
      params.date_to = monthEnd.toISOString().split("T")[0];

      const [statsRes, tradesRes] = await Promise.all([
        analyticsApi.getDashboard({
          date_from: params.date_from,
          date_to: params.date_to,
        }),
        tradesApi.getAll(params),
      ]);
      setStats(normalizeDashboardStats(statsRes.data.data));

      const normalizedTrades: Trade[] = (tradesRes.data.data || []).map(
        normalizeTrade
      );
      const sortedTrades = normalizedTrades.sort(
        (a: Trade, b: Trade) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAllTrades(sortedTrades);
      setFilteredTrades(sortedTrades);
      setRecentTrades(sortedTrades.slice(0, 5));
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use the centralized P/L calculator
  // calculateTradePnl is imported from utils/pnlCalculator

  const applyFilters = () => {
    let filtered = [...allTrades];

    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(
        (trade) =>
          trade.symbol?.toLowerCase().includes(query) ||
          trade.notes?.toLowerCase().includes(query) ||
          trade.reflection?.toLowerCase().includes(query)
      );
    }

    if (filters.symbol) {
      filtered = filtered.filter((trade) => trade.symbol === filters.symbol);
    }

    if (filters.status) {
      filtered = filtered.filter((trade) => trade.status === filters.status);
    }

    if (filters.trade_type) {
      filtered = filtered.filter(
        (trade) => trade.trade_type === filters.trade_type
      );
    }

    if (filters.asset_class) {
      filtered = filtered.filter(
        (trade) => trade.asset_class === filters.asset_class
      );
    }

    if (filters.strategy_id) {
      filtered = filtered.filter(
        (trade) => trade.strategy_id === filters.strategy_id
      );
    }

    setFilteredTrades(filtered);
    setRecentTrades(filtered.slice(0, 5));
  };

  const filteredStats: DashboardStats | null = useMemo(() => {
    if (filteredTrades.length === 0) {
      return stats;
    }

    const totals: AggregatedStats = {
      netPl: 0,
      wins: 0,
      losses: 0,
      total: 0,
      winPnl: [],
      lossPnl: [],
    };

    filteredTrades.forEach((trade) => {
      const pnl = calculateTradePnl(trade);
      totals.netPl += pnl;
      totals.total += 1;

      if (pnl > 0) {
        totals.wins += 1;
        totals.winPnl.push(pnl);
      } else if (pnl < 0) {
        totals.losses += 1;
        totals.lossPnl.push(pnl);
      }
    });

    const avgWin = totals.winPnl.length
      ? totals.winPnl.reduce((a, b) => a + b, 0) / totals.winPnl.length
      : 0;
    const avgLoss = totals.lossPnl.length
      ? totals.lossPnl.reduce((a, b) => a + b, 0) / totals.lossPnl.length
      : 0;

    const winRate = totals.total > 0 ? (totals.wins / totals.total) * 100 : 0;
    const avgRR = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

    return {
      net_pl: totals.netPl,
      win_rate: Number(winRate.toFixed(2)),
      avg_rr: Number(avgRR.toFixed(2)),
      average_win: avgWin,
      average_loss: avgLoss,
      total_trades: totals.total,
      total_wins: totals.wins,
      total_losses: totals.losses,
    };
  }, [filteredTrades, stats]);

  const hasActiveFilters = Boolean(
    (filters.query && filters.query.trim() !== "") ||
      filters.symbol ||
      filters.status ||
      filters.trade_type ||
      filters.asset_class
  );

  const statsForCards =
    hasActiveFilters && filteredStats ? filteredStats : stats;

  // Calculate total commission/fees from filtered trades
  const totalFees = useMemo(() => {
    const tradesToUse = hasActiveFilters ? filteredTrades : allTrades;
    return tradesToUse.reduce((sum, trade) => {
      const fees = Number(trade.fees ?? 0);
      return sum + fees;
    }, 0);
  }, [hasActiveFilters, filteredTrades, allTrades]);

  const symbols = useMemo(() => {
    const unique = new Set<string>();
    allTrades.forEach((trade) => {
      if (trade.symbol) unique.add(trade.symbol);
    });
    return Array.from(unique).sort();
  }, [allTrades]);

  const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Format date in local timezone (YYYY-MM-DD) to avoid UTC timezone issues
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const dailyStats = useMemo(() => {
    const stats: Record<string, { pnl: number; trades: number }> = {};
    filteredTrades.forEach((trade) => {
      const key = formatDateKey(new Date(trade.date));
      if (!stats[key]) {
        stats[key] = { pnl: 0, trades: 0 };
      }
      stats[key].pnl += calculateTradePnl(trade);
      stats[key].trades += 1;
    });
    return stats;
  }, [filteredTrades]);

  const monthStart = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1),
    [calendarMonth]
  );
  const monthEnd = useMemo(
    () =>
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0),
    [calendarMonth]
  );

  const calendarDays = useMemo(() => {
    const days: Array<null | {
      date: Date;
      key: string;
      pnl: number;
      trades: number;
    }> = [];

    const firstDayIndex = monthStart.getDay();
    for (let i = 0; i < firstDayIndex; i += 1) {
      days.push(null);
    }

    const totalDays = monthEnd.getDate();
    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        day
      );
      const key = formatDateKey(date);
      const statsForDay = dailyStats[key] || { pnl: 0, trades: 0 };
      days.push({
        date,
        key,
        pnl: statsForDay.pnl,
        trades: statsForDay.trades,
      });
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [calendarMonth, monthStart, monthEnd, dailyStats]);

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayStats = dailyStats[selectedDateKey] || { pnl: 0, trades: 0 };

  const weeklySummary = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    let pnl = 0;
    let trades = 0;
    const tradeDays = new Set<string>();

    filteredTrades.forEach((trade) => {
      const tradeDate = new Date(trade.date);
      tradeDate.setHours(0, 0, 0, 0);
      if (tradeDate >= start && tradeDate <= end) {
        pnl += calculateTradePnl(trade);
        trades += 1;
        tradeDays.add(formatDateKey(tradeDate));
      }
    });

    return {
      pnl,
      trades,
      days: tradeDays.size,
    };
  }, [filteredTrades, selectedDate]);

  const monthlySummary = useMemo(() => {
    let pnl = 0;
    let trades = 0;
    const tradeDays = new Set<string>();

    Object.entries(dailyStats).forEach(([key, value]) => {
      const date = new Date(key);
      if (
        date.getFullYear() === calendarMonth.getFullYear() &&
        date.getMonth() === calendarMonth.getMonth()
      ) {
        pnl += value.pnl;
        trades += value.trades;
        if (value.trades > 0) {
          tradeDays.add(key);
        }
      }
    });

    return { pnl, trades, days: tradeDays.size };
  }, [dailyStats, calendarMonth]);

  const profitGoalValue = goalPulse?.profitGoal ?? null;
  const hasProfitGoal =
    typeof profitGoalValue === "number" && profitGoalValue !== 0;
  const profitGoalNumber = hasProfitGoal ? profitGoalValue : undefined;
  const profitProgress =
    profitGoalNumber !== undefined
      ? Math.min(((goalPulse?.netPl ?? 0) / profitGoalNumber) * 100, 200)
      : 0;

  const winRateGoalValue = goalPulse?.winRateGoal ?? null;
  const hasWinRateGoal =
    typeof winRateGoalValue === "number" && winRateGoalValue !== 0;
  const winRateGoalNumber = hasWinRateGoal ? winRateGoalValue : undefined;
  const winRateProgress =
    winRateGoalNumber !== undefined
      ? Math.min(((goalPulse?.winRate ?? 0) / winRateGoalNumber) * 100, 200)
      : 0;

  const changeMonth = (delta: number) => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + delta, 1)
    );
  };

  const goToToday = () => {
    const today = new Date();
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const monthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const selectedDayLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const todayKey = formatDateKey(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getPnlColor = (value: number) => {
    if (value > 0) return "text-dark-accent-success";
    if (value < 0) return "text-dark-accent-danger";
    return "text-dark-text-secondary";
  };

  const handleFilterChange = (field: keyof TradeFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const resetFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-1">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Monitor your trading performance and goals
          </p>
        </div>
      </div>

      {/* Goal Pulse */}
      {goalPulse && (hasProfitGoal || hasWinRateGoal) && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {hasProfitGoal && profitGoalNumber !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-dark-text-secondary uppercase tracking-wide">
                    Profit Goal Progress
                  </p>
                  <span className="text-dark-text-primary font-semibold">
                    {formatCurrency(goalPulse.netPl)} /{" "}
                    {formatCurrency(profitGoalNumber!)}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={`h-full bg-dark-accent-primary transition-all duration-500 ${getProgressWidthClass(
                      Number(profitProgress.toFixed(0))
                    )}`}
                  />
                </div>
                <p className="text-xs text-dark-text-tertiary mt-2">
                  {goalPulse.netPl >= profitGoalNumber!
                    ? "Goal achieved — keep the momentum!"
                    : `${(
                        (goalPulse.netPl / profitGoalNumber!) * 100 || 0
                      ).toFixed(1)}% of monthly target`}
                </p>
              </div>
            )}
            {hasWinRateGoal && winRateGoalNumber !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-dark-text-secondary uppercase tracking-wide">
                    Win Rate Goal
                  </p>
                  <span className="text-dark-text-primary font-semibold">
                    {goalPulse.winRate.toFixed(1)}% /{" "}
                    {winRateGoalNumber!.toFixed(1)}%
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={`h-full bg-dark-accent-success transition-all duration-500 ${getProgressWidthClass(
                      Number(winRateProgress.toFixed(0))
                    )}`}
                  />
                </div>
                <p className="text-xs text-dark-text-tertiary mt-2">
                  {goalPulse.winRate >= winRateGoalNumber!
                    ? "Win rate goal achieved"
                    : `${(
                        (goalPulse.winRate / winRateGoalNumber!) * 100 || 0
                      ).toFixed(1)}% of target win rate`}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Trade Filter Panel */}
      <Card>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 flex-1">
            <Input
              label="Search"
              placeholder="Symbol, notes, reflection"
              value={filters.query || ""}
              onChange={(event) =>
                handleFilterChange("query", event.target.value)
              }
            />
            <Select
              label="Symbol"
              value={filters.symbol || ""}
              onChange={(event) =>
                handleFilterChange("symbol", event.target.value)
              }
              options={[
                { value: "", label: "All Symbols" },
                ...symbols.map((symbol) => ({ value: symbol, label: symbol })),
              ]}
            />
            <Select
              label="Status"
              value={filters.status || ""}
              onChange={(event) =>
                handleFilterChange("status", event.target.value)
              }
              options={[
                { value: "", label: "All Statuses" },
                { value: "open", label: "Open" },
                { value: "closed", label: "Closed" },
                { value: "reviewed", label: "Reviewed" },
              ]}
            />
            <Select
              label="Trade Type"
              value={filters.trade_type || ""}
              onChange={(event) =>
                handleFilterChange("trade_type", event.target.value)
              }
              options={[
                { value: "", label: "All Types" },
                { value: "long", label: "Long" },
                { value: "short", label: "Short" },
              ]}
            />
            <Select
              label="Asset Class"
              value={filters.asset_class || ""}
              onChange={(event) =>
                handleFilterChange("asset_class", event.target.value)
              }
              options={[
                { value: "", label: "All Classes" },
                { value: "futures", label: "Futures" },
                { value: "forex", label: "Forex" },
                { value: "stocks", label: "Stocks" },
                { value: "crypto", label: "Crypto" },
              ]}
            />
            <Select
              label="Strategy"
              value={filters.strategy_id || ""}
              onChange={(event) =>
                handleFilterChange("strategy_id", event.target.value)
              }
              options={[
                { value: "", label: "All Strategies" },
                ...strategies.map((strategy) => ({
                  value: strategy.id,
                  label: strategy.name,
                })),
              ]}
            />
          </div>
          <div className="flex items-end xl:items-center gap-3 justify-end">
            <Button type="button" onClick={resetFilters} variant="secondary">
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
        <StatCard
          title="Net P/L"
          value={formatCurrency(statsForCards?.net_pl || 0)}
          valueColor={getPnlColor(statsForCards?.net_pl || 0)}
          subtitle={`Total Commission: ${formatCurrency(totalFees)}`}
        />
        <StatCard
          title="Win Rate"
          value={`${statsForCards?.win_rate?.toFixed(1) || "0.0"}%`}
          subtitle={`${statsForCards?.total_wins || 0}W / ${
            statsForCards?.total_losses || 0
          }L`}
        />
        <StatCard
          title="Avg. R:R"
          value={`${statsForCards?.avg_rr?.toFixed(2) || "0.00"}R`}
        />
        <StatCard
          title="Average Win"
          value={formatCurrency(statsForCards?.average_win || 0)}
          valueColor="text-dark-accent-success"
        />
        <StatCard
          title="Average Loss"
          value={formatCurrency(statsForCards?.average_loss || 0)}
          valueColor="text-dark-accent-danger"
        />
        <StatCard
          title="Total Trades"
          value={statsForCards?.total_trades || 0}
        />
      </div>

      {/* Calendar & Summaries */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card
          className="xl:col-span-3"
          title={monthLabel}
          headerActions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => changeMonth(-1)}
                className="text-xs sm:text-sm"
              >
                ← Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => changeMonth(1)}
                className="text-xs sm:text-sm"
              >
                Next →
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="text-xs sm:text-sm"
              >
                Today
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-xs font-semibold uppercase text-dark-text-tertiary mb-3">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="text-center">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="h-16 sm:h-20 md:h-24 rounded-lg sm:rounded-xl bg-dark-bg-tertiary/30 border border-dark-border-primary/10"
                  />
                );
              }

              const isSelected = day.key === selectedDateKey;
              const isToday = day.key === todayKey;
              const profitClass = getPnlColor(day.pnl);

              return (
                <button
                  key={day.key}
                  onClick={() => setSelectedDate(day.date)}
                  className={`text-left h-16 sm:h-20 md:h-[104px] rounded-lg sm:rounded-xl border px-1 sm:px-2 md:px-3 py-1 sm:py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-dark-accent-primary/60 ${
                    isSelected
                      ? "border-dark-accent-primary bg-dark-bg-tertiary shadow-dark"
                      : "border-dark-border-primary/20 hover:border-dark-border-primary hover:bg-dark-bg-tertiary/60"
                  } ${isToday ? "ring-1 ring-dark-accent-primary/50" : ""}`}
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm text-dark-text-secondary mb-0.5 sm:mb-1">
                    <span className="text-sm sm:text-base md:text-lg font-semibold text-dark-text-primary">
                      {day.date.getDate()}
                    </span>
                    {isToday && (
                      <span className="text-[10px] sm:text-xs font-semibold text-dark-accent-primary">
                        Today
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-semibold ${profitClass} truncate`}
                  >
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(day.pnl)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-dark-text-tertiary mt-0.5 sm:mt-1 truncate">
                    {day.trades} {day.trades === 1 ? "trade" : "trades"}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Selected Day">
            <div className="space-y-3">
              <p className="text-sm text-dark-text-secondary">
                {selectedDayLabel}
              </p>
              <p
                className={`text-2xl sm:text-3xl font-bold ${getPnlColor(
                  selectedDayStats.pnl
                )}`}
              >
                {formatCurrency(selectedDayStats.pnl)}
              </p>
              <p className="text-sm text-dark-text-tertiary">
                {selectedDayStats.trades}{" "}
                {selectedDayStats.trades === 1 ? "trade" : "trades"}
              </p>
            </div>
          </Card>

          <Card title="Weekly Summary">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-text-secondary">Profit</span>
                <span
                  className={`text-lg font-semibold ${getPnlColor(
                    weeklySummary.pnl
                  )}`}
                >
                  {formatCurrency(weeklySummary.pnl)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-dark-text-tertiary">
                <span>Trades</span>
                <span>{weeklySummary.trades}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-dark-text-tertiary">
                <span>Active Days</span>
                <span>{weeklySummary.days}</span>
              </div>
            </div>
          </Card>

          <Card title="Monthly Summary">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-text-secondary">Profit</span>
                <span
                  className={`text-lg font-semibold ${getPnlColor(
                    monthlySummary.pnl
                  )}`}
                >
                  {formatCurrency(monthlySummary.pnl)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-dark-text-tertiary">
                <span>Trades</span>
                <span>{monthlySummary.trades}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-dark-text-tertiary">
                <span>Active Days</span>
                <span>{monthlySummary.days}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-dark-bg-secondary rounded-xl border border-dark-border-primary shadow-dark-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-dark-text-primary">
            Recent Trades
          </h2>
          <Link
            to="/add-trade"
            className="px-4 py-2 bg-dark-accent-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors duration-200 text-center sm:text-left w-full sm:w-auto"
          >
            Add Trade
          </Link>
        </div>

        {recentTrades.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-4">
              No recent trades to display.
            </p>
            <Link
              to="/add-trade"
              className="inline-block px-6 py-2 bg-dark-accent-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors duration-200"
            >
              Add Your First Trade
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0">
            <table className="w-full min-w-[700px]">
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
                    Entry
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden md:table-cell">
                    Exit
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider">
                    P/L
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary uppercase tracking-wider hidden sm:table-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((trade) => {
                  const pnl = calculateTradePnl(trade);
                  return (
                    <tr
                      key={trade.id}
                      className="border-b border-dark-border-primary hover:bg-dark-bg-tertiary transition-colors duration-150"
                    >
                      <td className="py-3 px-2 sm:px-4 text-dark-text-primary text-xs sm:text-sm whitespace-nowrap">
                        {new Date(trade.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <span className="font-medium text-dark-text-primary text-xs sm:text-sm">
                          {trade.symbol}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.trade_type === "long"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {trade.trade_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-dark-text-primary text-xs sm:text-sm hidden md:table-cell">
                        {trade.entry_price !== null
                          ? formatCurrency(trade.entry_price)
                          : "-"}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-dark-text-primary text-xs sm:text-sm hidden md:table-cell">
                        {trade.exit_price !== undefined
                          ? formatCurrency(trade.exit_price)
                          : "-"}
                      </td>
                      <td
                        className={`py-3 px-2 sm:px-4 font-semibold text-xs sm:text-sm ${getPnlColor(
                          pnl
                        )}`}
                      >
                        {formatCurrency(pnl)}
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// StatCard Component
function StatCard({
  title,
  value,
  subtitle,
  valueColor = "text-dark-text-primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-dark-bg-secondary rounded-lg border border-dark-border-primary p-4 min-h-[120px] flex flex-col justify-between shadow-dark hover:shadow-dark-lg transition-shadow duration-200">
      <h3 className="text-xs font-semibold text-dark-text-tertiary mb-1 uppercase tracking-wider">
        {title}
      </h3>
      <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && (
        <p className="text-xs text-dark-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default Dashboard;
