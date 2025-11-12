import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { useParams, useNavigate, Link } from "react-router-dom";
import { tradesApi, strategiesApi, default as api, API_BASE_URL } from "../utils/api";
import { calculateTradePnl } from "../utils/pnlCalculator";
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  ErrorMessage,
  SuccessMessage,
  LoadingSpinner,
} from "../components";

interface TradeFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [files, setFiles] = useState<TradeFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [trade, setTrade] = useState<any>(null);
  const [formData, setFormData] = useState({
    symbol: "",
    asset_class: "futures",
    trade_type: "long",
    position_size: "",
    entry_price: "",
    exit_price: "",
    date: "",
    strategy_id: "",
    notes: "",
    reflection: "",
    status: "open",
    account_pnls: {} as Record<string, number>,
    session: "",
    confidence_level: "",
    fees: "",
    contract_size: "",
    point_value: "",
    unit_size: "",
  });
  const confidenceOptions = [
    { value: "good", label: "Good" },
    { value: "average", label: "Average" },
    { value: "bad", label: "Bad" },
  ];
  const sessionOptions = [
    { value: "asia", label: "Asia" },
    { value: "london", label: "London" },
    { value: "newyork", label: "New York" },
    { value: "newyork_pm", label: "New York (PM)" },
  ];
  const sessionLabelMap = sessionOptions.reduce<Record<string, string>>(
    (acc, option) => {
      acc[option.value] = option.label;
      return acc;
    },
    {}
  );

  useEffect(() => {
    if (id) {
      loadTrade();
      loadOptions();
    }
  }, [id]);

  const loadTrade = async () => {
    try {
      setLoading(true);
      const response = await tradesApi.getById(id!);
      const tradeData = response.data.data;
      setTrade(tradeData);

      // Set form data with P/L calculation fields
      const assetClass = tradeData.asset_class || "futures";
      const defaults: any = {
        fees: "",
        contract_size: "",
        point_value: "",
        unit_size: "",
      };

      // Set defaults based on asset class
      if (assetClass === "forex") {
        defaults.contract_size = "10";
      } else if (assetClass === "futures") {
        defaults.point_value = "20";
      } else if (assetClass === "commodity") {
        defaults.contract_size = "100";
      }

      setFormData({
        symbol: tradeData.symbol || "",
        asset_class: assetClass,
        trade_type: tradeData.trade_type || "long",
        position_size: tradeData.position_size?.toString() || "",
        entry_price:
          tradeData.entry_price !== null && tradeData.entry_price !== undefined
            ? tradeData.entry_price.toString()
            : "",
        exit_price: tradeData.exit_price?.toString() || "",
        date: tradeData.date || "",
        strategy_id: tradeData.strategy_id || "",
        notes: tradeData.notes || "",
        reflection: tradeData.reflection || "",
        status: tradeData.status || "open",
        account_pnls:
          tradeData.accounts?.reduce((acc: any, a: any) => {
            acc[a.account_id] = a.pnl;
            return acc;
          }, {}) || {},
        session: tradeData.session || "",
        confidence_level: tradeData.confidence_level || "",
        fees: tradeData.fees?.toString() || defaults.fees,
        contract_size:
          tradeData.contract_size?.toString() || defaults.contract_size,
        point_value: tradeData.point_value?.toString() || defaults.point_value,
        unit_size: tradeData.unit_size?.toString() || defaults.unit_size,
      });

      // Load files if available - handle both array and JSON string
      if (tradeData.files) {
        let filesArray = tradeData.files;
        // If files is a string, parse it
        if (typeof filesArray === 'string') {
          try {
            filesArray = JSON.parse(filesArray);
          } catch (e) {
            console.error('Error parsing files:', e);
            filesArray = [];
          }
        }
        // Ensure it's an array and filter out empty objects
        if (Array.isArray(filesArray)) {
          const validFiles = filesArray.filter((f: any) => f && f.id);
          setFiles(validFiles);
        } else {
          setFiles([]);
        }
      } else {
        setFiles([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load trade");
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const strategiesRes = await strategiesApi.getAll();
      setStrategies(strategiesRes.data.data);
    } catch (err) {
      console.error("Error loading options:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const submitData: any = {
        ...formData,
        position_size: parseFloat(formData.position_size),
        entry_price: formData.entry_price
          ? parseFloat(formData.entry_price)
          : undefined,
        exit_price: formData.exit_price
          ? parseFloat(formData.exit_price)
          : undefined,
        strategy_id: formData.strategy_id || undefined,
      };

      // Add P/L calculation fields
      if (formData.fees) {
        submitData.fees = parseFloat(formData.fees);
      }
      if (formData.contract_size) {
        submitData.contract_size = parseFloat(formData.contract_size);
      }
      if (formData.point_value) {
        submitData.point_value = parseFloat(formData.point_value);
      }
      if (formData.unit_size) {
        submitData.unit_size = parseFloat(formData.unit_size);
      }

      await tradesApi.update(id!, submitData);
      setSuccess("Trade updated successfully!");
      setIsEditing(false);
      loadTrade();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to update trade");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this trade? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await tradesApi.delete(id!);
      navigate("/trade-log");
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to delete trade");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploadingFiles(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach((file) => {
        formData.append("files", file);
      });

      // Add trade data
      formData.append("symbol", trade.symbol);
      formData.append("asset_class", trade.asset_class);
      formData.append("trade_type", trade.trade_type);
      formData.append("position_size", trade.position_size.toString());
      if (trade.entry_price !== null && trade.entry_price !== undefined) {
        formData.append("entry_price", trade.entry_price.toString());
      }
      formData.append("date", trade.date);

      // Use the update endpoint with files
      await tradesApi.update(id!, formData);

      setSuccess("Files uploaded successfully!");
      loadTrade();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || 
        err?.message || 
        "Failed to upload files"
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) {
      return;
    }

    try {
      await api.delete(`/files/trades/${fileId}`);

      setSuccess("File deleted successfully!");
      loadTrade();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || 
        err?.message || 
        "Failed to delete file"
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

  const getFileUrl = (filePath: string) => {
    const token = localStorage.getItem("auth_token");
    const encodedFilename = encodeURIComponent(filePath);
    // API_BASE_URL already includes /api, so use it directly
    if (token) {
      return `${API_BASE_URL}/files/serve/${encodedFilename}?token=${encodeURIComponent(
        token
      )}`;
    }
    return `${API_BASE_URL}/files/serve/${encodedFilename}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-text-secondary mb-4">Trade not found</p>
        <Link to="/trade-log">
          <Button>Back to Trade Log</Button>
        </Link>
      </div>
    );
  }

  // Use centralized P/L calculator for consistency
  const pnl = calculateTradePnl(trade);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
            Trade Details
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            {trade.symbol} • {trade.asset_class} • {trade.trade_type}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)} variant="secondary">
                Edit
              </Button>
              <Button onClick={handleDelete} variant="danger">
                Delete
              </Button>
              <Link to="/trade-log">
                <Button variant="outline">Back</Button>
              </Link>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSubmit} isLoading={saving}>
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {isEditing ? (
        <Card title="Edit Trade">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Symbol *"
                type="text"
                value={formData.symbol}
                onChange={(e) =>
                  setFormData({ ...formData, symbol: e.target.value })
                }
                required
              />

              <Select
                label="Asset Class *"
                value={formData.asset_class}
                onChange={(e) => {
                  const newAssetClass = e.target.value;
                  // Set default values based on asset class
                  const defaults: any = {
                    fees: formData.fees || "",
                    contract_size: formData.contract_size || "",
                    point_value: formData.point_value || "",
                    unit_size: formData.unit_size || "",
                  };

                  if (newAssetClass === "forex") {
                    defaults.contract_size = formData.contract_size || "10"; // Default Contract Size = 10
                  } else if (newAssetClass === "futures") {
                    defaults.point_value = formData.point_value || "20"; // Default Point Value = 20
                  } else if (newAssetClass === "commodity") {
                    defaults.contract_size = formData.contract_size || "100"; // Default Contract Size = 100
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
                  ...sessionOptions,
                ]}
                required
              />

              <Select
                label="Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                options={[
                  { value: "open", label: "Open" },
                  { value: "closed", label: "Closed" },
                  { value: "reviewed", label: "Reviewed" },
                ]}
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

            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-text-primary mb-2">
                Confidence Level *
              </label>
              <div className="flex flex-wrap gap-2">
                {confidenceOptions.map((option) => {
                  const isSelected = formData.confidence_level === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center space-x-2 cursor-pointer p-2 border rounded transition-all duration-200 ${
                        isSelected
                          ? "bg-dark-accent-primary/20 border-dark-accent-primary text-dark-accent-primary"
                          : "border-dark-border-primary text-dark-text-secondary hover:border-dark-border-secondary hover:bg-dark-bg-tertiary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            confidence_level: e.target.checked
                              ? option.value
                              : "",
                          });
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
              rows={4}
            />

            <Textarea
              label="Post-Trade Reflection"
              value={formData.reflection}
              onChange={(e) =>
                setFormData({ ...formData, reflection: e.target.value })
              }
              rows={4}
            />
          </form>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card title="Trade Information">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Symbol
                  </span>
                  <p className="text-lg font-semibold text-dark-text-primary">
                    {trade.symbol}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Asset Class
                  </span>
                  <p className="text-dark-text-primary">{trade.asset_class}</p>
                </div>
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Trade Type
                  </span>
                  <p className="text-dark-text-primary capitalize">
                    {trade.trade_type}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-dark-text-secondary">Date</span>
                  <p className="text-dark-text-primary">
                    {new Date(trade.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Status
                  </span>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      trade.status === "open"
                        ? "bg-yellow-100 text-yellow-800"
                        : trade.status === "closed"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {trade.status}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Session
                  </span>
                  <p className="text-dark-text-primary">
                    {trade.session
                      ? sessionLabelMap[trade.session] || trade.session
                      : "-"}
                  </p>
                </div>
                {trade.strategy_name && (
                  <div>
                    <span className="text-sm text-dark-text-secondary">
                      Strategy
                    </span>
                    <p className="text-dark-text-primary">
                      {trade.strategy_name}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Price Information">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Position Size
                  </span>
                  <p className="text-lg font-semibold text-dark-text-primary">
                    {trade.position_size}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Entry Price
                  </span>
                  <p className="text-dark-text-primary">
                    {trade.entry_price !== null &&
                    trade.entry_price !== undefined
                      ? formatCurrency(trade.entry_price)
                      : "-"}
                  </p>
                </div>
                {trade.exit_price !== null &&
                  trade.exit_price !== undefined && (
                    <div>
                      <span className="text-sm text-dark-text-secondary">
                        Exit Price
                      </span>
                      <p className="text-dark-text-primary">
                        {formatCurrency(trade.exit_price)}
                      </p>
                    </div>
                  )}
                {pnl !== null && (
                  <div>
                    <span className="text-sm text-dark-text-secondary">
                      P&L
                    </span>
                    <p
                      className={`text-lg font-semibold ${
                        pnl >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(pnl)}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Confidence Level">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-dark-text-secondary">
                    Confidence
                  </span>
                  <p className="text-lg font-semibold text-dark-text-primary">
                    {trade.confidence_level
                      ? confidenceOptions.find(
                          (opt) => opt.value === trade.confidence_level
                        )?.label ?? trade.confidence_level
                      : "-"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {(trade.notes || trade.reflection) && (
            <Card title="Notes & Reflection">
              <div className="space-y-4">
                {trade.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark-text-primary mb-2">
                      Before and During Trades
                    </h3>
                    <p className="text-dark-text-secondary whitespace-pre-wrap">
                      {trade.notes}
                    </p>
                  </div>
                )}
                {trade.reflection && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark-text-primary mb-2">
                      Post-Trade Reflection
                    </h3>
                    <p className="text-dark-text-secondary whitespace-pre-wrap">
                      {trade.reflection}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card title="Attached Files">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="file-upload"
                  className="block text-sm font-medium text-dark-text-primary mb-2"
                >
                  Upload Files
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploadingFiles}
                  aria-label="Upload trade files"
                  title="Upload trade files"
                  className="block w-full text-sm text-dark-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-dark-accent-primary file:text-white hover:file:bg-blue-600"
                  accept="image/*,.pdf,.txt,.csv"
                />
                {uploadingFiles && (
                  <p className="text-sm text-dark-text-secondary mt-2">
                    Uploading...
                  </p>
                )}
              </div>

              {files.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="border border-dark-border-primary rounded p-3 hover:bg-dark-bg-tertiary transition-colors"
                    >
                      {file.file_type?.startsWith("image/") ? (
                        <img
                          src={getFileUrl(file.file_path)}
                          alt={file.file_name}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      ) : (
                        <div className="w-full h-32 bg-dark-bg-tertiary rounded mb-2 flex items-center justify-center">
                          <span className="text-4xl">📄</span>
                        </div>
                      )}
                      <p
                        className="text-xs text-dark-text-primary truncate mb-2"
                        title={file.file_name}
                      >
                        {file.file_name}
                      </p>
                      <div className="flex gap-2 items-center">
                        <a
                          href={getFileUrl(file.file_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-dark-accent-primary hover:underline"
                        >
                          View
                        </a>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleFileDelete(file.id)}
                          className="text-xs px-2 py-1"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-text-secondary text-sm">
                  No files attached
                </p>
              )}
            </div>
          </Card>
        </>
      )}

      {!isEditing && trade.strategy_id && (
        <Card title="Strategy">
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-dark-text-primary">
              {trade.strategy_name || "Strategy"}
            </h3>
            {trade.strategy_description ? (
              <div
                className="prose prose-invert max-w-none text-sm space-y-2"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(trade.strategy_description),
                }}
              />
            ) : (
              <p className="text-dark-text-tertiary text-sm">
                This strategy does not have any playbook notes yet. Update it
                from the Trading Lab page.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export default TradeDetail;
