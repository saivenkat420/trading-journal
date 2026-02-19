import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { strategiesApi, tradesApi, accountsApi } from "../utils/api";
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  ErrorMessage,
  LoadingSpinner,
} from "../components";

function AddTrade() {
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [accountPnls, setAccountPnls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    symbol: "",
    asset_class: "futures",
    trade_type: "long",
    status: "closed",
    position_size: "",
    entry_price: "",
    exit_price: "",
    date: new Date().toISOString().split("T")[0],
    strategy_id: "",
    notes: "",
    reflection: "",
    account_pnls: {} as Record<string, number>,
    session: "",
    confidence_level: "",
    fees: "",
    contract_size: "",
    point_value: "20", // Default for futures
    unit_size: "",
  });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<
    { file: File; preview: string }[]
  >([]);
  const confidenceOptions = [
    { value: "good", label: "Good" },
    { value: "average", label: "Average" },
    { value: "bad", label: "Bad" },
  ];

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    return () => {
      filePreviews.forEach(({ preview }) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [filePreviews]);

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      const [strategiesRes, accountsRes] = await Promise.all([
        strategiesApi.getAll(),
        accountsApi.getAll(),
      ]);
      setStrategies(strategiesRes.data.data);
      setAccounts(accountsRes.data.data || []);
    } catch (error: any) {
      console.error("Error loading options:", error);
      setError(
        error?.response?.data?.error?.message || "Failed to load options"
      );
    } finally {
      setLoadingOptions(false);
    }
  };

  // Calculate P&L for a trade based on current form data
  const calculatePnl = useMemo(() => {
    if (
      !formData.entry_price ||
      !formData.exit_price ||
      !formData.position_size
    ) {
      return 0;
    }

    const entry = parseFloat(formData.entry_price);
    const exit = parseFloat(formData.exit_price);
    const positionSize = parseFloat(formData.position_size);
    const fees = parseFloat(formData.fees || "0");

    const priceDiff =
      formData.trade_type === "long" ? exit - entry : entry - exit;

    switch (formData.asset_class) {
      case "stocks":
        return priceDiff * positionSize - fees;
      case "forex": {
        const contractSize = parseFloat(formData.contract_size || "10");
        return priceDiff * contractSize * positionSize - fees;
      }
      case "futures": {
        const pointValue = parseFloat(formData.point_value || "20");
        return priceDiff * pointValue * positionSize - fees;
      }
      case "commodity": {
        const contractSize = parseFloat(formData.contract_size || "100");
        return priceDiff * contractSize * positionSize - fees;
      }
      case "crypto":
        return priceDiff * positionSize - fees;
      default:
        return priceDiff * positionSize - fees;
    }
  }, [
    formData.entry_price,
    formData.exit_price,
    formData.position_size,
    formData.trade_type,
    formData.asset_class,
    formData.fees,
    formData.contract_size,
    formData.point_value,
  ]);

  // Auto-calculate P&L for selected accounts when trade data changes
  // Only update if P&L calculation changed or account selection changed
  useEffect(() => {
    if (selectedAccountIds.length > 0 && calculatePnl !== 0) {
      setAccountPnls((prevPnls) => {
        const newAccountPnls: Record<string, string> = {};
        selectedAccountIds.forEach((accountId) => {
          // If user hasn't manually set a value, auto-calculate
          // Otherwise keep existing value
          if (!prevPnls[accountId] || prevPnls[accountId] === "") {
            // Distribute P&L evenly across selected accounts
            const pnlPerAccount = (
              calculatePnl / selectedAccountIds.length
            ).toFixed(2);
            newAccountPnls[accountId] = pnlPerAccount;
          } else {
            // Keep user's manual input
            newAccountPnls[accountId] = prevPnls[accountId];
          }
        });
        return newAccountPnls;
      });
    }
  }, [calculatePnl, selectedAccountIds.join(",")]); // Only recalculate when P&L or account selection changes

  const handleAccountToggle = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      // Remove account
      setSelectedAccountIds(
        selectedAccountIds.filter((id) => id !== accountId)
      );
      const newPnls = { ...accountPnls };
      delete newPnls[accountId];
      setAccountPnls(newPnls);
    } else {
      // Add account
      setSelectedAccountIds([...selectedAccountIds, accountId]);
      // Auto-calculate P&L for new account
      if (calculatePnl !== 0 && selectedAccountIds.length > 0) {
        const pnlPerAccount = (
          calculatePnl /
          (selectedAccountIds.length + 1)
        ).toFixed(2);
        setAccountPnls({
          ...accountPnls,
          [accountId]: pnlPerAccount,
        });
        // Recalculate existing accounts
        const updatedPnls: Record<string, string> = {};
        [...selectedAccountIds, accountId].forEach((id) => {
          updatedPnls[id] = (
            calculatePnl /
            (selectedAccountIds.length + 1)
          ).toFixed(2);
        });
        setAccountPnls(updatedPnls);
      } else if (calculatePnl !== 0) {
        setAccountPnls({
          ...accountPnls,
          [accountId]: calculatePnl.toFixed(2),
        });
      } else {
        setAccountPnls({
          ...accountPnls,
          [accountId]: "",
        });
      }
    }
  };

  const handleAccountPnlChange = (accountId: string, value: string) => {
    setAccountPnls({
      ...accountPnls,
      [accountId]: value,
    });
  };

  const selectedStrategy = useMemo(
    () => strategies.find((s) => s.id === formData.strategy_id),
    [strategies, formData.strategy_id]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);

      // Create previews for image files
      const previews = fileArray.map((file) => {
        if (file.type.startsWith("image/")) {
          return {
            file,
            preview: URL.createObjectURL(file),
          };
        }
        return {
          file,
          preview: "",
        };
      });
      setFilePreviews(previews);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);

      const formDataToSend = new FormData();

      // Add trade data
      formDataToSend.append("symbol", formData.symbol);
      formDataToSend.append("asset_class", formData.asset_class);
      formDataToSend.append("trade_type", formData.trade_type);
      formDataToSend.append("position_size", formData.position_size);
      if (formData.entry_price) {
        formDataToSend.append("entry_price", formData.entry_price);
      }
      if (formData.exit_price)
        formDataToSend.append("exit_price", formData.exit_price);
      formDataToSend.append("date", formData.date);
      if (formData.strategy_id)
        formDataToSend.append("strategy_id", formData.strategy_id);
      if (formData.notes) formDataToSend.append("notes", formData.notes);
      if (formData.reflection)
        formDataToSend.append("reflection", formData.reflection);
      formDataToSend.append("session", formData.session);
      formDataToSend.append("confidence_level", formData.confidence_level);
      formDataToSend.append("status", formData.status || "closed");

      // Add P/L calculation fields
      if (formData.fees) {
        formDataToSend.append("fees", formData.fees);
      }
      if (formData.contract_size) {
        formDataToSend.append("contract_size", formData.contract_size);
      }
      if (formData.point_value) {
        formDataToSend.append("point_value", formData.point_value);
      }
      if (formData.unit_size) {
        formDataToSend.append("unit_size", formData.unit_size);
      }

      // Add account P&Ls if accounts are selected
      if (selectedAccountIds.length > 0) {
        const accountPnlsToSend: Record<string, number> = {};
        selectedAccountIds.forEach((accountId) => {
          const pnlValue = parseFloat(accountPnls[accountId] || "0");
          if (!isNaN(pnlValue)) {
            accountPnlsToSend[accountId] = pnlValue;
          }
        });

        if (Object.keys(accountPnlsToSend).length > 0) {
          formDataToSend.append(
            "account_pnls",
            JSON.stringify(accountPnlsToSend)
          );
        }
      }

      // Add files
      console.log(
        `[ADD TRADE] Adding ${selectedFiles.length} file(s) to FormData`
      );
      selectedFiles.forEach((file, index) => {
        console.log(
          `[ADD TRADE] File ${index + 1}: ${file.name}, size: ${
            file.size
          }, type: ${file.type}`
        );
        formDataToSend.append("files", file);
      });

      console.log(
        `[ADD TRADE] Submitting trade with FormData. Files count: ${selectedFiles.length}`
      );
      await tradesApi.create(formDataToSend);
      console.log(`[ADD TRADE] Trade created successfully`);

      navigate("/trade-log");
    } catch (error: any) {
      console.error("Error creating trade:", error);
      setError(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Failed to create trade"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
          Add New Trade
        </h1>
        <p className="text-sm sm:text-base text-dark-text-secondary">
          Record a new trading entry
        </p>
      </div>

      <Card title="Trade Details">
        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="Symbol *"
              type="text"
              value={formData.symbol}
              onChange={(e) =>
                setFormData({ ...formData, symbol: e.target.value })
              }
              placeholder="e.g., EURUSD, ES, XAUUSD, US100"
              required
            />

            <Select
              label="Asset Class *"
              value={formData.asset_class}
              onChange={(e) => {
                const newAssetClass = e.target.value;
                // Set default values based on asset class
                const defaults: any = {
                  fees: "",
                  contract_size: "",
                  point_value: "",
                  unit_size: "",
                };

                if (newAssetClass === "forex") {
                  defaults.contract_size = "10"; // Default Contract Size = 10
                } else if (newAssetClass === "futures") {
                  defaults.point_value = "20"; // Default Point Value = 20
                } else if (newAssetClass === "commodity") {
                  defaults.contract_size = "100"; // Default Contract Size = 100
                }

                setFormData({
                  ...formData,
                  asset_class: newAssetClass,
                  ...defaults,
                });
              }}
              options={[
                { value: "futures", label: "Futures" },
                { value: "forex", label: "Forex" },
                { value: "stocks", label: "Stocks" },
                { value: "crypto", label: "Crypto" },
                { value: "commodity", label: "Commodity" },
              ]}
              required
            />

            <Select
              label="Trade Type *"
              value={formData.trade_type}
              onChange={(e) =>
                setFormData({ ...formData, trade_type: e.target.value })
              }
              options={[
                { value: "long", label: "Long" },
                { value: "short", label: "Short" },
              ]}
              required
            />

            <Select
              label="Status *"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              options={[
                { value: "open", label: "Open" },
                { value: "closed", label: "Closed" },
                { value: "reviewed", label: "Reviewed" },
              ]}
              required
            />

            <Input
              label={
                formData.asset_class === "forex"
                  ? "Number of Lots *"
                  : formData.asset_class === "futures"
                  ? "Number of Contracts *"
                  : formData.asset_class === "stocks"
                  ? "Quantity (Shares) *"
                  : formData.asset_class === "crypto"
                  ? "Quantity (Coins/Tokens) *"
                  : "Position Size *"
              }
              type="number"
              step="0.01"
              value={formData.position_size}
              onChange={(e) =>
                setFormData({ ...formData, position_size: e.target.value })
              }
              required
            />

            <Input
              label="Entry Price"
              type="number"
              step="0.01"
              value={formData.entry_price}
              onChange={(e) =>
                setFormData({ ...formData, entry_price: e.target.value })
              }
            />

            <Input
              label="Exit Price"
              type="number"
              step="0.01"
              value={formData.exit_price}
              onChange={(e) =>
                setFormData({ ...formData, exit_price: e.target.value })
              }
            />

            {/* Dynamic fields based on asset class */}
            {/* Fees - shown for all asset classes */}
            <Input
              label="Fees/Commissions"
              type="number"
              step="0.01"
              value={formData.fees}
              onChange={(e) =>
                setFormData({ ...formData, fees: e.target.value })
              }
              placeholder="0.00"
            />

            {/* Contract Size - shown for Forex */}
            {formData.asset_class === "forex" && (
              <Input
                label="Contract Size (Lots) *"
                type="number"
                step="0.01"
                value={formData.contract_size}
                onChange={(e) =>
                  setFormData({ ...formData, contract_size: e.target.value })
                }
                placeholder="Default: 10"
                required
              />
            )}

            {/* Point Value - shown for Futures */}
            {formData.asset_class === "futures" && (
              <Input
                label="Point Value ($ per point) *"
                type="number"
                step="0.01"
                value={formData.point_value}
                onChange={(e) =>
                  setFormData({ ...formData, point_value: e.target.value })
                }
                placeholder="Default: 20"
                required
              />
            )}

            {/* Contract Size - shown for Commodity */}
            {formData.asset_class === "commodity" && (
              <Input
                label="Contract Size (Units per contract) *"
                type="number"
                step="0.01"
                value={formData.contract_size}
                onChange={(e) =>
                  setFormData({ ...formData, contract_size: e.target.value })
                }
                placeholder="Default: 100"
                required
              />
            )}

            <Input
              label="Date *"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />

            <Select
              label="Session *"
              value={formData.session}
              onChange={(e) =>
                setFormData({ ...formData, session: e.target.value })
              }
              options={[
                { value: "", label: "Select a session" },
                { value: "asia", label: "Asia" },
                { value: "london", label: "London" },
                { value: "newyork", label: "New York" },
                { value: "newyork_pm", label: "New York (PM)" },
              ]}
              required
            />

            <Select
              label="Strategy"
              value={formData.strategy_id}
              onChange={(e) =>
                setFormData({ ...formData, strategy_id: e.target.value })
              }
              options={[
                { value: "", label: "Select a strategy" },
                ...strategies.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text-secondary mb-3">
              Confidence Level *
            </label>
            <div className="flex flex-wrap gap-2">
              {confidenceOptions.map((option) => {
                const isSelected = formData.confidence_level === option.value;
                return (
                  <label
                    key={option.value}
                    className={`
                      flex items-center space-x-2 cursor-pointer px-3 py-2 rounded-lg border transition-all duration-200
                      ${
                        isSelected
                          ? "bg-dark-accent-primary/20 border-dark-accent-primary text-dark-accent-primary"
                          : "bg-dark-bg-tertiary border-dark-border-primary text-dark-text-secondary hover:border-dark-border-secondary hover:bg-dark-bg-elevated"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Confidence level ${option.label}`}
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            confidence_level: option.value,
                          });
                        } else {
                          setFormData({
                            ...formData,
                            confidence_level: "",
                          });
                        }
                      }}
                      className="rounded border-dark-border-primary text-dark-accent-primary focus:ring-dark-accent-primary"
                    />
                    <span className="text-sm font-medium capitalize">
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <Textarea
            label="Before and During Trades"
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Entry reasons, Price expectations, Market Conditions, Emotions, Behaviours"
            rows={4}
          />

          <Textarea
            label="Post-Trade Reflection"
            value={formData.reflection}
            onChange={(e) =>
              setFormData({ ...formData, reflection: e.target.value })
            }
            placeholder="What went well?, What should have been avoided? Lessons learnt"
            rows={4}
          />

          {/* Account Selection */}
          {accounts.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-primary mb-3">
                  Link to Account(s){" "}
                  <span className="text-dark-text-tertiary text-xs">
                    (Optional - for goal tracking)
                  </span>
                </label>
                <div className="space-y-3">
                  {accounts.map((account) => {
                    const isSelected = selectedAccountIds.includes(account.id);
                    return (
                      <div
                        key={account.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isSelected
                            ? "border-dark-accent-primary bg-dark-accent-primary/10"
                            : "border-dark-border-primary bg-dark-bg-secondary hover:border-dark-border-secondary"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <input
                              type="checkbox"
                              id={`account-${account.id}`}
                              checked={isSelected}
                              onChange={() => handleAccountToggle(account.id)}
                              className="mt-1 rounded border-dark-border-primary text-dark-accent-primary focus:ring-dark-accent-primary"
                              aria-label={`Select account ${account.name}`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <label
                                  className="text-sm font-medium text-dark-text-primary cursor-pointer"
                                  onClick={() =>
                                    handleAccountToggle(account.id)
                                  }
                                >
                                  {account.name}
                                </label>
                                <span className="text-xs text-dark-text-tertiary">
                                  Balance: $
                                  {Number(account.current_balance || 0).toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="mt-3 ml-7">
                            <Input
                              label="P&L for this account"
                              type="number"
                              step="0.01"
                              value={accountPnls[account.id] || ""}
                              onChange={(e) =>
                                handleAccountPnlChange(
                                  account.id,
                                  e.target.value
                                )
                              }
                              placeholder={
                                calculatePnl !== 0
                                  ? `Auto: ${(
                                      calculatePnl / selectedAccountIds.length
                                    ).toFixed(2)}`
                                  : "Enter P&L"
                              }
                              className="max-w-xs"
                            />
                            {calculatePnl !== 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const autoPnl = (
                                    calculatePnl / selectedAccountIds.length
                                  ).toFixed(2);
                                  handleAccountPnlChange(account.id, autoPnl);
                                }}
                                className="mt-1 text-xs text-dark-accent-primary hover:underline"
                              >
                                Use auto-calculated: $
                                {(
                                  calculatePnl / selectedAccountIds.length
                                ).toFixed(2)}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedAccountIds.length > 0 && (
                  <p className="mt-2 text-xs text-dark-text-tertiary">
                    💡 Tip: P&L will be automatically distributed evenly across
                    selected accounts. You can manually adjust each account's
                    P&L if needed.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="trade-file-upload"
              className="block text-sm font-medium text-dark-text-primary mb-2"
            >
              Attach Files (Screenshots, Charts, etc.)
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-dark-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-dark-accent-primary file:text-white hover:file:bg-blue-600"
              accept="image/*,.pdf,.txt,.csv"
              id="trade-file-upload"
              aria-label="Attach trade files"
              title="Attach trade files"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-dark-text-primary">
                  Selected files ({selectedFiles.length}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filePreviews.map((item, index) => (
                    <div
                      key={index}
                      className="border border-dark-border-primary rounded-lg p-3 bg-dark-bg-secondary"
                    >
                      {item.preview ? (
                        <div className="space-y-2">
                          <img
                            src={item.preview}
                            alt={item.file.name}
                            className="w-full h-32 object-cover rounded border border-dark-border-primary"
                          />
                          <p
                            className="text-xs text-dark-text-secondary truncate"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </p>
                          <p className="text-xs text-dark-text-tertiary">
                            {(item.file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="w-full h-32 flex items-center justify-center bg-dark-bg-tertiary rounded border border-dark-border-primary">
                            <svg
                              className="w-12 h-12 text-dark-text-tertiary"
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
                          <p
                            className="text-xs text-dark-text-secondary truncate"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </p>
                          <p className="text-xs text-dark-text-tertiary">
                            {(item.file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t border-dark-border-primary">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/trade-log")}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Add Trade
            </Button>
          </div>
        </form>
      </Card>

      {selectedStrategy && (
        <Card title="Strategy Playbook">
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-dark-text-primary">
              {selectedStrategy.name}
            </h3>
            {selectedStrategy.description ? (
              <div
                className="prose prose-invert max-w-none text-sm space-y-2"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(selectedStrategy.description),
                }}
              />
            ) : (
              <p className="text-dark-text-tertiary text-sm">
                This strategy does not have a documented playbook yet. Add one
                in the Trading Lab to see it here.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default AddTrade;
