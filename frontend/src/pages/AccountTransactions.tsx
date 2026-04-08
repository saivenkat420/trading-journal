import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { accountsApi, accountTransactionsApi } from "../utils/api";
import {
  Card,
  LoadingSpinner,
  Button,
  Input,
  Select,
  Textarea,
  ErrorMessage,
  SuccessMessage,
} from "../components";

interface Transaction {
  id: string;
  account_id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  trade_id: string | null;
  transaction_date: string;
  created_at: string;
}

interface Account {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
}

function AccountTransactions() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const [formData, setFormData] = useState({
    transaction_type: "deposit",
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().split("T")[0],
  });

  const transactionTypes = [
    { value: "deposit", label: "Deposit" },
    { value: "withdrawal", label: "Withdrawal" },
    { value: "adjustment", label: "Balance Adjustment" },
    { value: "fee", label: "Fee/Commission" },
    { value: "interest", label: "Interest" },
    { value: "dividend", label: "Dividend" },
  ];

  useEffect(() => {
    if (accountId) {
      loadData();
    }
  }, [accountId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountRes, transactionsRes] = await Promise.all([
        accountsApi.getById(accountId!),
        accountTransactionsApi.getByAccount(accountId!),
      ]);
      setAccount(accountRes.data.data);
      setTransactions(transactionsRes.data.data || []);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err?.response?.data?.error?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      transaction_type: "deposit",
      amount: "",
      description: "",
      transaction_date: new Date().toISOString().split("T")[0],
    });
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openEditForm = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      transaction_type: transaction.transaction_type,
      amount: Math.abs(transaction.amount).toString(),
      description: transaction.description || "",
      transaction_date: new Date(transaction.transaction_date)
        .toISOString()
        .split("T")[0],
    });
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const amount = parseFloat(formData.amount);
      const payload = {
        account_id: accountId,
        transaction_type: formData.transaction_type,
        amount:
          formData.transaction_type === "withdrawal" ||
          formData.transaction_type === "fee"
            ? -Math.abs(amount)
            : Math.abs(amount),
        description: formData.description.trim() || null,
        transaction_date: formData.transaction_date,
      };

      if (editingTransaction) {
        await accountTransactionsApi.update(editingTransaction.id, payload);
        setSuccess("Transaction updated successfully");
      } else {
        await accountTransactionsApi.create(payload);
        setSuccess("Transaction created successfully");
      }
      setIsFormOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to save transaction"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) {
      return;
    }
    try {
      await accountTransactionsApi.delete(transaction.id);
      setSuccess("Transaction deleted successfully");
      loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to delete transaction"
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

  const getTypeColor = (_type: string, amount: number) => {
    if (amount > 0) return "text-dark-accent-success";
    if (amount < 0) return "text-dark-accent-danger";
    return "text-dark-text-primary";
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "bg-green-500/20 text-green-400";
      case "withdrawal":
        return "bg-red-500/20 text-red-400";
      case "fee":
        return "bg-yellow-500/20 text-yellow-400";
      case "interest":
      case "dividend":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!account) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-dark-text-secondary mb-4">Account not found</p>
          <Link to="/accounts">
            <Button>Back to Accounts</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/accounts"
              className="text-dark-text-secondary hover:text-dark-text-primary"
            >
              Accounts
            </Link>
            <span className="text-dark-text-tertiary">/</span>
            <span className="text-dark-text-primary">{account.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
            Transactions
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Manage deposits, withdrawals, and other transactions
          </p>
        </div>
        <Button onClick={openCreateForm} className="w-full sm:w-auto">
          Add Transaction
        </Button>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-dark-text-secondary mb-1">
              Initial Balance
            </p>
            <p className="text-xl font-bold text-dark-text-primary">
              {formatCurrency(account.initial_balance)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-dark-text-secondary mb-1">
              Current Balance
            </p>
            <p
              className={`text-xl font-bold ${
                account.current_balance >= account.initial_balance
                  ? "text-dark-accent-success"
                  : "text-dark-accent-danger"
              }`}
            >
              {formatCurrency(account.current_balance)}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-dark-text-secondary mb-1">Net Change</p>
            <p
              className={`text-xl font-bold ${
                account.current_balance - account.initial_balance >= 0
                  ? "text-dark-accent-success"
                  : "text-dark-accent-danger"
              }`}
            >
              {formatCurrency(
                account.current_balance - account.initial_balance
              )}
            </p>
          </div>
        </Card>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {/* Create/Edit Form */}
      {isFormOpen && (
        <Card
          title={
            editingTransaction ? "Edit Transaction" : "Add New Transaction"
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Transaction Type *"
                value={formData.transaction_type}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_type: e.target.value })
                }
                options={transactionTypes}
                required
              />

              <Input
                label="Amount *"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0.00"
                required
              />

              <Input
                label="Date *"
                type="date"
                value={formData.transaction_date}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_date: e.target.value })
                }
                required
              />
            </div>

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional notes about this transaction..."
              rows={2}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-dark-border-primary">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={saving}>
                {editingTransaction ? "Update" : "Add"} Transaction
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Transactions List */}
      <Card title={`Transaction History (${transactions.length})`}>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-4">
              No transactions recorded yet.
            </p>
            <Button onClick={openCreateForm}>Add First Transaction</Button>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-dark-border-primary">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-text-secondary uppercase">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-text-secondary uppercase">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-text-secondary uppercase">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-text-secondary uppercase hidden sm:table-cell">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-text-secondary uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-dark-border-primary hover:bg-dark-bg-tertiary transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-dark-text-primary">
                      {new Date(
                        transaction.transaction_date
                      ).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(
                          transaction.transaction_type
                        )}`}
                      >
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-sm font-semibold ${getTypeColor(
                        transaction.transaction_type,
                        transaction.amount
                      )}`}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="py-3 px-4 text-sm text-dark-text-secondary hidden sm:table-cell">
                      {transaction.description || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditForm(transaction)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(transaction)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AccountTransactions;
