import { useState, useEffect } from "react";
import { goalsApi, analyticsApi, accountsApi } from "../utils/api";
import { Goal, DashboardStats } from "../types";
import {
  Card,
  LoadingSpinner,
  Input,
  Button,
  ErrorMessage,
  SuccessMessage,
} from "../components";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatGoalCurrency = (value?: number | null) =>
  value === undefined || value === null ? "—" : formatCurrency(value);

function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"month" | "profit" | "win_rate">("month");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [formData, setFormData] = useState({
    month: "",
    profit_goal: "",
    win_rate_goal: "",
  });
  const [goalStats, setGoalStats] = useState<Record<string, DashboardStats>>({});
  
  // Account Manager state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountFormVisible, setAccountFormVisible] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: "",
    initial_balance: "",
    current_balance: "",
  });
  const [accountEditingId, setAccountEditingId] = useState<string | null>(null);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
    loadAccounts();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await goalsApi.getAll();
      const normalized = (response.data.data || []).map((goal: any) => ({
        ...goal,
        profit_goal:
          goal.profit_goal !== null && goal.profit_goal !== undefined
            ? Number(goal.profit_goal)
            : undefined,
        win_rate_goal:
          goal.win_rate_goal !== null && goal.win_rate_goal !== undefined
            ? Number(goal.win_rate_goal)
            : undefined,
      }));
      setGoals(normalized);

      // Load stats for each goal
      for (const goal of normalized) {
        await loadStatsForGoal(goal);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const loadStatsForGoal = async (goal: Goal) => {
    try {
      const monthDate = new Date(goal.month);
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0
      )
        .toISOString()
        .split("T")[0];

      const response = await analyticsApi.getDashboard({
        date_from: goal.month,
        date_to: monthEnd,
      });
      const raw = response.data.data;
      if (raw) {
        setGoalStats((prev) => ({
          ...prev,
          [goal.id]: {
            net_pl: Number(raw.net_pl ?? 0),
            win_rate: Number(raw.win_rate ?? 0),
            avg_rr: Number(raw.avg_rr ?? 0),
            average_win: Number(raw.average_win ?? 0),
            average_loss: Number(raw.average_loss ?? 0),
            total_trades: Number(raw.total_trades ?? 0),
            total_wins: Number(raw.total_wins ?? 0),
            total_losses: Number(raw.total_losses ?? 0),
          },
        }));
      }
    } catch (error) {
      console.error("Error loading stats for goal:", error);
    }
  };

  const getFilteredAndSorted = () => {
    let list = [...goals];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          new Date(g.month).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let comp = 0;
      if (sortBy === "month") {
        comp =
          new Date(a.month).getTime() - new Date(b.month).getTime();
      } else if (sortBy === "profit") {
        const profitA = a.profit_goal ?? 0;
        const profitB = b.profit_goal ?? 0;
        comp = profitA - profitB;
      } else if (sortBy === "win_rate") {
        const winRateA = a.win_rate_goal ?? 0;
        const winRateB = b.win_rate_goal ?? 0;
        comp = winRateA - winRateB;
      }
      return sortDir === "asc" ? comp : -comp;
    });
    return list;
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      month: new Date().toISOString().slice(0, 7) + "-01",
      profit_goal: "",
      win_rate_goal: "",
    });
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setIsCreating(false);
    setFormData({
      month: goal.month,
      profit_goal: goal.profit_goal?.toString() || "",
      win_rate_goal: goal.win_rate_goal?.toString() || "",
    });
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      month: "",
      profit_goal: "",
      win_rate_goal: "",
    });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const submitData = {
        month: formData.month,
        profit_goal:
          formData.profit_goal.trim() !== ""
            ? parseFloat(formData.profit_goal)
            : undefined,
        win_rate_goal:
          formData.win_rate_goal.trim() !== ""
            ? parseFloat(formData.win_rate_goal)
            : undefined,
      };

      if (editingId) {
        await goalsApi.update(editingId, submitData);
        setSuccess("Goal updated successfully!");
      } else {
        await goalsApi.create(submitData);
        setSuccess("Goal created successfully!");
      }

      handleCancel();
      await loadGoals();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, month: string) => {
    const monthStr = new Date(month).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (
      !confirm(
        `Are you sure you want to delete the goal for "${monthStr}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await goalsApi.delete(id);
      setSuccess("Goal deleted successfully!");
      await loadGoals();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to delete goal");
    }
  };

  // Account Manager functions
  const loadAccounts = async () => {
    try {
      setAccountsLoading(true);
      const response = await accountsApi.getAll();
      const normalized = (response.data.data || []).map((account: any) => ({
        ...account,
        initial_balance: Number(account.initial_balance ?? 0),
        current_balance: Number(account.current_balance ?? account.initial_balance ?? 0),
      }));
      setAccounts(normalized);
    } catch (err: any) {
      setAccountError(err?.response?.data?.error?.message || "Failed to load accounts");
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleAccountCreateClick = () => {
    resetAccountForm();
    setAccountError(null);
    setAccountSuccess(null);
    setAccountFormVisible((prev) => !prev);
  };

  const handleAccountEdit = (account: any) => {
    setAccountFormVisible(true);
    setAccountEditingId(account.id);
    setAccountForm({
      name: account.name ?? "",
      initial_balance: account.initial_balance.toString(),
      current_balance: account.current_balance.toString(),
    });
    setAccountError(null);
    setAccountSuccess(null);
  };

  const handleAccountDelete = async (account: any) => {
    if (
      !confirm(
        `Delete account "${account.name}"? This will remove it from goal filters.`
      )
    ) {
      return;
    }

    try {
      await accountsApi.delete(account.id);
      setAccountSuccess("Account deleted successfully.");
      await loadAccounts();
    } catch (error: any) {
      setAccountError(
        error?.response?.data?.error?.message || "Failed to delete account."
      );
    }
  };

  const handleAccountSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    if (!accountForm.name.trim()) {
      setAccountError("Account name is required.");
      return;
    }

    const initial =
      accountForm.initial_balance.trim() === ""
        ? 0
        : Number(accountForm.initial_balance);
    if (Number.isNaN(initial)) {
      setAccountError("Initial balance must be a number.");
      return;
    }

    const current =
      accountForm.current_balance.trim() === ""
        ? initial
        : Number(accountForm.current_balance);
    if (Number.isNaN(current)) {
      setAccountError("Current balance must be a number.");
      return;
    }

    const payload = {
      name: accountForm.name.trim(),
      initial_balance: initial,
      current_balance: current,
    };

    try {
      setAccountSaving(true);
      if (accountEditingId) {
        await accountsApi.update(accountEditingId, payload);
        setAccountSuccess("Account updated successfully.");
      } else {
        await accountsApi.create(payload);
        setAccountSuccess("Account created successfully.");
      }

      await loadAccounts();
      resetAccountForm();
      setAccountFormVisible(false);
    } catch (error: any) {
      setAccountError(
        error?.response?.data?.error?.message || "Failed to save account."
      );
    } finally {
      setAccountSaving(false);
    }
  };

  const resetAccountForm = () => {
    setAccountForm({
      name: "",
      initial_balance: "",
      current_balance: "",
    });
    setAccountEditingId(null);
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
            Goals
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Manage your monthly trading goals
          </p>
        </div>
        {!isCreating && !editingId && (
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            Create Goal
          </Button>
        )}
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {(isCreating || editingId) && (
        <Card title={editingId ? "Edit Goal" : "Create Goal"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Month *"
              type="month"
              value={formData.month.slice(0, 7)}
              onChange={(e) =>
                setFormData({ ...formData, month: e.target.value + "-01" })
              }
              required
            />

            <Input
              label="Profit Goal (USD)"
              type="number"
              min="0"
              step="0.01"
              value={formData.profit_goal}
              onChange={(e) =>
                setFormData({ ...formData, profit_goal: e.target.value })
              }
              placeholder="e.g., 5000"
              helperText="Leave blank to skip setting a profit goal"
            />

            <Input
              label="Win Rate Goal (%)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.win_rate_goal}
              onChange={(e) =>
                setFormData({ ...formData, win_rate_goal: e.target.value })
              }
              placeholder="e.g., 55"
              helperText="Leave blank to skip setting a win-rate target"
            />

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t border-dark-border-primary">
              <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" isLoading={saving} className="w-full sm:w-auto">
                {editingId ? "Update" : "Create"} Goal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-6 md:grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Input
                label="Search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by month..."
              />
              <div>
                <label htmlFor="goals-sort-by" className="block text-sm font-medium text-dark-text-primary mb-2">
                  Sort By
                </label>
                <select
                  id="goals-sort-by"
                  className="w-full bg-dark-bg-tertiary text-dark-text-primary border border-dark-border-primary rounded px-3 py-2 text-sm sm:text-base"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sort goals by"
                  title="Sort goals by"
                >
                  <option value="month">Month</option>
                  <option value="profit">Profit Goal</option>
                  <option value="win_rate">Win Rate Goal</option>
                </select>
              </div>
              <div>
                <label htmlFor="goals-sort-dir" className="block text-sm font-medium text-dark-text-primary mb-2">
                  Direction
                </label>
                <select
                  id="goals-sort-dir"
                  className="w-full bg-dark-bg-tertiary text-dark-text-primary border border-dark-border-primary rounded px-3 py-2 text-sm sm:text-base"
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as any)}
                  aria-label="Sort direction"
                  title="Sort direction"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </Card>

          {goals.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-dark-text-secondary mb-4">No goals yet</p>
                <Button onClick={handleCreate}>Create Your First Goal</Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {getFilteredAndSorted().map((goal) => {
            const stats = goalStats[goal.id];
            const monthStr = new Date(goal.month).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });

            const profitTarget = goal.profit_goal ?? undefined;
            const winRateTarget = goal.win_rate_goal ?? undefined;

            const profitProgress =
              profitTarget && profitTarget !== 0 && stats
                ? Math.min(((stats.net_pl || 0) / profitTarget) * 100, 100)
                : 0;
            const winRateProgress =
              winRateTarget && winRateTarget !== 0 && stats
                ? Math.min(((stats.win_rate || 0) / winRateTarget) * 100, 100)
                : 0;

            const profitAccentClass =
              profitProgress >= 100
                ? "accent-dark-accent-success"
                : profitProgress >= 50
                ? "accent-dark-accent-primary"
                : "accent-dark-accent-warning";

            const winRateAccentClass =
              winRateProgress >= 100
                ? "accent-dark-accent-success"
                : winRateProgress >= 50
                ? "accent-dark-accent-primary"
                : "accent-dark-accent-warning";

            return (
              <Card key={goal.id} title={monthStr}>
                <div className="space-y-4">
                  {profitTarget !== undefined && (
                    <div>
                      <div className="flex items-baseline justify-between mb-2 gap-2">
                        <span className="text-xs sm:text-sm text-dark-text-secondary">
                          Profit Goal
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-dark-text-primary whitespace-nowrap">
                          {stats
                            ? `${profitProgress.toFixed(1)}%`
                            : "Loading..."}
                        </span>
                      </div>
                      <progress
                        value={Math.min(Math.max(profitProgress, 0), 100)}
                        max={100}
                        className={`w-full h-2 rounded-full bg-dark-bg-tertiary transition-[accent-color] duration-500 appearance-none ${profitAccentClass}`}
                      />
                      <div className="flex justify-between text-xs text-dark-text-tertiary mt-1">
                        <span>
                          {stats
                            ? formatCurrency(stats.net_pl || 0)
                            : "—"}{" "}
                          / {formatGoalCurrency(profitTarget)}
                        </span>
                      </div>
                    </div>
                  )}

                  {winRateTarget !== undefined && (
                    <div>
                      <div className="flex items-baseline justify-between mb-2 gap-2">
                        <span className="text-xs sm:text-sm text-dark-text-secondary">
                          Win Rate Goal
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-dark-text-primary whitespace-nowrap">
                          {stats
                            ? `${winRateProgress.toFixed(1)}%`
                            : "Loading..."}
                        </span>
                      </div>
                      <progress
                        value={Math.min(Math.max(winRateProgress, 0), 100)}
                        max={100}
                        className={`w-full h-2 rounded-full bg-dark-bg-tertiary transition-[accent-color] duration-500 appearance-none ${winRateAccentClass}`}
                      />
                      <div className="flex justify-between text-xs text-dark-text-tertiary mt-1">
                        <span>
                          {stats
                            ? `${(stats.win_rate || 0).toFixed(1)}%`
                            : "—"}{" "}
                          / {winRateTarget.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {stats && (
                    <div className="pt-2 border-t border-dark-border-primary space-y-1 text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-dark-text-secondary">Net P/L:</span>
                        <span
                          className={
                            (stats.net_pl || 0) > 0
                              ? "text-dark-accent-success"
                              : (stats.net_pl || 0) < 0
                              ? "text-dark-accent-danger"
                              : "text-dark-text-primary"
                          }
                        >
                          {formatCurrency(stats.net_pl || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-dark-text-secondary">
                          Total Trades:
                        </span>
                        <span className="text-dark-text-primary">
                          {stats.total_trades}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-dark-text-secondary">
                          Win Rate:
                        </span>
                        <span className="text-dark-text-primary">
                          {(stats.win_rate || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-dark-border-primary">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(goal)}
                      className="flex-1 w-full sm:w-auto"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(goal.id, goal.month)}
                      className="flex-1 w-full sm:w-auto"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
            </div>
          )}
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Card
            title="Account Manager"
            headerActions={
              <Button
                variant="outline"
                size="sm"
                onClick={handleAccountCreateClick}
                className="text-xs sm:text-sm"
              >
                {accountFormVisible ? "Close" : "New Account"}
              </Button>
            }
          >
            {(accountError || accountSuccess) && (
              <div className="space-y-3 mb-4">
                {accountError && (
                  <ErrorMessage
                    message={accountError}
                    onDismiss={() => setAccountError(null)}
                  />
                )}
                {accountSuccess && (
                  <SuccessMessage
                    message={accountSuccess}
                    onDismiss={() => setAccountSuccess(null)}
                  />
                )}
              </div>
            )}

            {accountFormVisible && (
              <form onSubmit={handleAccountSubmit} className="space-y-4 mb-6">
                <Input
                  label="Account Name *"
                  type="text"
                  value={accountForm.name}
                  onChange={(e) =>
                    setAccountForm({ ...accountForm, name: e.target.value })
                  }
                  placeholder="e.g., Main Trading Account"
                  required
                />

                <Input
                  label="Initial Balance *"
                  type="number"
                  step="0.01"
                  value={accountForm.initial_balance}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      initial_balance: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  required
                />

                <Input
                  label="Current Balance"
                  type="number"
                  step="0.01"
                  value={accountForm.current_balance}
                  onChange={(e) =>
                    setAccountForm({
                      ...accountForm,
                      current_balance: e.target.value,
                    })
                  }
                  placeholder="Leave empty to match initial balance"
                />

                <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-3 border-t border-dark-border-primary">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetAccountForm();
                      setAccountFormVisible(false);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={accountSaving} className="w-full sm:w-auto">
                    {accountEditingId ? "Update Account" : "Create Account"}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {accountsLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner />
                </div>
              ) : accounts.length === 0 ? (
                <p className="text-dark-text-secondary text-sm">
                  No accounts yet. Create one to start tracking goals per
                  account.
                </p>
              ) : (
                accounts.map((account) => {
                  const pnl = account.current_balance - account.initial_balance;
                  return (
                    <div
                      key={account.id}
                      className="rounded-xl border border-dark-border-primary p-4 transition-colors duration-200 bg-dark-bg-secondary hover:border-dark-border-secondary"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base sm:text-lg font-semibold text-dark-text-primary truncate">
                            {account.name}
                          </p>
                          <p className="text-xs uppercase tracking-wider text-dark-text-tertiary mt-1">
                            Initial • {formatCurrency(account.initial_balance)}
                          </p>
                          <p
                            className={`text-xs sm:text-sm font-medium mt-1 break-words ${
                              pnl >= 0
                                ? "text-dark-accent-success"
                                : "text-dark-accent-danger"
                            }`}
                          >
                            Current {formatCurrency(account.current_balance)} (
                            {pnl >= 0 ? "+" : ""}
                            {formatCurrency(pnl)})
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 w-full sm:w-auto"
                          onClick={() => handleAccountEdit(account)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          className="flex-1 w-full sm:w-auto"
                          onClick={() => handleAccountDelete(account)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Goals;
