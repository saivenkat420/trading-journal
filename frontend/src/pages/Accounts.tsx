import { useState, useEffect } from "react";
import { accountsApi } from "../utils/api";
import {
  Button,
  Input,
  Card,
  ErrorMessage,
  SuccessMessage,
  LoadingSpinner,
} from "../components";

function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [minBalance, setMinBalance] = useState<string>("");
  const [maxBalance, setMaxBalance] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "initial" | "current" | "pnl">(
    "name"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [formData, setFormData] = useState({
    name: "",
    initial_balance: "",
    current_balance: "",
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsApi.getAll();
      const normalized = (response.data.data || []).map((account: any) => ({
        ...account,
        initial_balance: Number(account.initial_balance ?? 0),
        current_balance: Number(
          account.current_balance ?? account.initial_balance ?? 0
        ),
      }));
      setAccounts(normalized);
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to load accounts"
      );
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSorted = () => {
    let list = [...accounts];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name?.toLowerCase().includes(q));
    }
    if (minBalance !== "") {
      const v = Number(minBalance);
      if (!Number.isNaN(v)) {
        list = list.filter((a) => Number(a.current_balance) >= v);
      }
    }
    if (maxBalance !== "") {
      const v = Number(maxBalance);
      if (!Number.isNaN(v)) {
        list = list.filter((a) => Number(a.current_balance) <= v);
      }
    }
    list.sort((a, b) => {
      const pnlA =
        Number(a.current_balance ?? 0) - Number(a.initial_balance ?? 0);
      const pnlB =
        Number(b.current_balance ?? 0) - Number(b.initial_balance ?? 0);
      let comp = 0;
      if (sortBy === "name") comp = (a.name || "").localeCompare(b.name || "");
      if (sortBy === "initial")
        comp = Number(a.initial_balance) - Number(b.initial_balance);
      if (sortBy === "current")
        comp = Number(a.current_balance) - Number(b.current_balance);
      if (sortBy === "pnl") comp = pnlA - pnlB;
      return sortDir === "asc" ? comp : -comp;
    });
    return list;
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({
      name: "",
      initial_balance: "",
      current_balance: "",
    });
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (account: any) => {
    setEditingId(account.id);
    setIsCreating(false);
    setFormData({
      name: account.name || "",
      initial_balance: account.initial_balance?.toString() || "",
      current_balance: account.current_balance?.toString() || "",
    });
    setError(null);
    setSuccess(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      name: "",
      initial_balance: "",
      current_balance: "",
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
        name: formData.name,
        initial_balance: formData.initial_balance
          ? parseFloat(formData.initial_balance)
          : 0,
        current_balance: formData.current_balance
          ? parseFloat(formData.current_balance)
          : formData.initial_balance
          ? parseFloat(formData.initial_balance)
          : 0,
      };

      if (editingId) {
        await accountsApi.update(editingId, submitData);
        setSuccess("Account updated successfully!");
      } else {
        await accountsApi.create(submitData);
        setSuccess("Account created successfully!");
      }

      handleCancel();
      loadAccounts();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to save account");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await accountsApi.delete(id);
      setSuccess("Account deleted successfully!");
      loadAccounts();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to delete account"
      );
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
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
            Accounts
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Manage your trading accounts
          </p>
        </div>
        {!isCreating && !editingId && (
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            Create Account
          </Button>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Input
            label="Search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Account name"
          />
          <Input
            label="Min Balance"
            type="number"
            value={minBalance}
            onChange={(e) => setMinBalance(e.target.value)}
            placeholder="0.00"
          />
          <Input
            label="Max Balance"
            type="number"
            value={maxBalance}
            onChange={(e) => setMaxBalance(e.target.value)}
            placeholder="100000.00"
          />
          <div>
            <label
              htmlFor="accounts-sort-by"
              className="block text-sm font-medium text-dark-text-primary mb-2"
            >
              Sort By
            </label>
            <select
              id="accounts-sort-by"
              className="w-full bg-dark-bg-tertiary text-dark-text-primary border border-dark-border-primary rounded px-3 py-2"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort accounts by"
            >
              <option value="name">Name</option>
              <option value="initial">Initial Balance</option>
              <option value="current">Current Balance</option>
              <option value="pnl">P&L</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="accounts-sort-dir"
              className="block text-sm font-medium text-dark-text-primary mb-2"
            >
              Direction
            </label>
            <select
              id="accounts-sort-dir"
              className="w-full bg-dark-bg-tertiary text-dark-text-primary border border-dark-border-primary rounded px-3 py-2"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
              aria-label="Sort direction"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </Card>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {(isCreating || editingId) && (
        <Card title={editingId ? "Edit Account" : "Create Account"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Account Name *"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Main Trading Account"
              required
            />

            <Input
              label="Initial Balance *"
              type="number"
              step="0.01"
              value={formData.initial_balance}
              onChange={(e) =>
                setFormData({ ...formData, initial_balance: e.target.value })
              }
              placeholder="0.00"
              required
            />

            <Input
              label="Current Balance"
              type="number"
              step="0.01"
              value={formData.current_balance}
              onChange={(e) =>
                setFormData({ ...formData, current_balance: e.target.value })
              }
              placeholder="Leave empty to use initial balance"
            />

            <div className="flex gap-2 justify-end pt-4 border-t border-dark-border-primary">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saving}>
                {editingId ? "Update" : "Create"} Account
              </Button>
            </div>
          </form>
        </Card>
      )}

      {accounts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-4">No accounts yet</p>
            <Button onClick={handleCreate}>Create Your First Account</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {getFilteredAndSorted().map((account) => (
            <Card key={account.id} title={account.name}>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Initial Balance
                  </span>
                  <p className="text-lg font-semibold text-dark-text-primary">
                    {formatCurrency(Number(account.initial_balance ?? 0))}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Current Balance
                  </span>
                  <p
                    className={`text-lg font-semibold ${
                      account.current_balance >= account.initial_balance
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(Number(account.current_balance ?? 0))}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-dark-text-secondary">P&L</span>
                  <p
                    className={`text-lg font-semibold ${
                      account.current_balance >= account.initial_balance
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(
                      Number(account.current_balance ?? 0) -
                        Number(account.initial_balance ?? 0)
                    )}
                  </p>
                </div>
                <div className="flex gap-2 pt-4 border-t border-dark-border-primary">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(account)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(account.id, account.name)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Accounts;
