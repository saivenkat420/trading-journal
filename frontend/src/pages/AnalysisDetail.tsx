import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { analysisApi } from "../utils/api";
import { Analysis } from "../types";
import {
  Card,
  Button,
  LoadingSpinner,
  ErrorMessage,
  SuccessMessage,
  Input,
  Select,
  Textarea,
} from "../components";

type AnalysisTimeframe = "custom" | "weekly" | "monthly";

interface EditFormData {
  timeframe: AnalysisTimeframe;
  custom_title: string;
  start_date: string;
  end_date: string;
  performance_context: string;
  major_news_events: string;
  symbols_analysis: string;
}

function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    timeframe: "weekly",
    custom_title: "",
    start_date: "",
    end_date: "",
    performance_context: "",
    major_news_events: "",
    symbols_analysis: "",
  });

  useEffect(() => {
    if (id) {
      loadAnalysis();
    }
  }, [id]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analysisApi.getById(id!);
      const data = res.data.data;
      setAnalysis(data);

      // Prepare form data for editing
      setFormData({
        timeframe: data.timeframe as AnalysisTimeframe,
        custom_title: data.custom_title || "",
        start_date: new Date(data.start_date).toISOString().split("T")[0],
        end_date: new Date(data.end_date).toISOString().split("T")[0],
        performance_context: data.performance_context || "",
        major_news_events: Array.isArray(data.major_news_events)
          ? data.major_news_events
              .map((e: any) => (typeof e === "string" ? e : e.title || ""))
              .join("\n")
          : "",
        symbols_analysis: Array.isArray(data.symbols_analysis)
          ? data.symbols_analysis
              .map((s: any) => (typeof s === "string" ? s : s.symbol || ""))
              .join("\n")
          : "",
      });
    } catch (err: any) {
      console.error("Error loading analysis:", err);
      setError(
        err?.response?.data?.error?.message || "Failed to load analysis"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = <K extends keyof EditFormData>(
    field: K,
    value: EditFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!formData.start_date || !formData.end_date) {
      setError("Start and end dates are required.");
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      setError("End date must be after start date.");
      return;
    }

    const newsEvents = formData.major_news_events
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const symbolsAnalysis = formData.symbols_analysis
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = new FormData();
    payload.append("timeframe", formData.timeframe);
    payload.append("start_date", formData.start_date);
    payload.append("end_date", formData.end_date);

    if (formData.custom_title.trim()) {
      payload.append("custom_title", formData.custom_title.trim());
    }

    if (formData.performance_context.trim()) {
      payload.append("performance_context", formData.performance_context.trim());
    }

    if (newsEvents.length > 0) {
      payload.append("major_news_events", JSON.stringify(newsEvents));
    }

    if (symbolsAnalysis.length > 0) {
      payload.append("symbols_analysis", JSON.stringify(symbolsAnalysis));
    }

    try {
      setSaving(true);
      await analysisApi.update(id!, payload);
      setSuccess("Analysis updated successfully!");
      setIsEditing(false);
      await loadAnalysis();
    } catch (err: any) {
      console.error("Error updating analysis:", err);
      setError(
        err?.response?.data?.error?.message || "Failed to update analysis"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this analysis? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      await analysisApi.delete(id!);
      navigate("/analysis");
    } catch (err: any) {
      console.error("Error deleting analysis:", err);
      setError(
        err?.response?.data?.error?.message || "Failed to delete analysis"
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
              Analysis Details
            </h1>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("/analysis")}
            className="w-full sm:w-auto"
          >
            Back to Analysis
          </Button>
        </div>
        <Card>
          <ErrorMessage message={error || "Analysis not found"} />
        </Card>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text-primary mb-2">
            {analysis.custom_title ||
              `${
                analysis.timeframe.charAt(0).toUpperCase() +
                analysis.timeframe.slice(1)
              } Analysis`}
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            {new Date(analysis.start_date).toLocaleDateString()} -{" "}
            {new Date(analysis.end_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate("/analysis")}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                isLoading={deleting}
                className="w-full sm:w-auto"
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  loadAnalysis();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={saving}>
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
        // Edit Mode
        <Card title="Edit Analysis">
          <div className="space-y-4">
            <Select
              label="Timeframe *"
              value={formData.timeframe}
              onChange={(e) =>
                handleInputChange("timeframe", e.target.value as AnalysisTimeframe)
              }
              options={[
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "custom", label: "Custom" },
              ]}
            />

            {formData.timeframe === "custom" && (
              <Input
                label="Custom Title"
                type="text"
                value={formData.custom_title}
                onChange={(e) =>
                  handleInputChange("custom_title", e.target.value)
                }
                placeholder="e.g., Q1 Macro Outlook"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date *"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  handleInputChange("start_date", e.target.value)
                }
                required
              />
              <Input
                label="End Date *"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange("end_date", e.target.value)}
                required
              />
            </div>

            <Textarea
              label="Performance Context"
              value={formData.performance_context}
              onChange={(e) =>
                handleInputChange("performance_context", e.target.value)
              }
              placeholder="Summarize key takeaways, market sentiment, or performance notes..."
              rows={4}
            />

            <Textarea
              label="Major News Events"
              value={formData.major_news_events}
              onChange={(e) =>
                handleInputChange("major_news_events", e.target.value)
              }
              placeholder="Enter one event per line"
              rows={3}
              helperText="Each line will be saved as a separate news item."
            />

            <Textarea
              label="Symbols Analysis"
              value={formData.symbols_analysis}
              onChange={(e) =>
                handleInputChange("symbols_analysis", e.target.value)
              }
              placeholder="Enter symbols or brief notes per line"
              rows={3}
              helperText="For quick entries, add one symbol or note per line."
            />
          </div>
        </Card>
      ) : (
        // View Mode
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Context */}
            {analysis.performance_context && (
              <Card title="Performance Context">
                <div className="prose prose-invert max-w-none">
                  <p className="text-dark-text-primary whitespace-pre-wrap">
                    {analysis.performance_context}
                  </p>
                </div>
              </Card>
            )}

            {/* Major News Events */}
            {analysis.major_news_events &&
              analysis.major_news_events.length > 0 && (
                <Card title="Major News Events">
                  <div className="space-y-4">
                    {analysis.major_news_events.map(
                      (event: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 bg-dark-bg-tertiary rounded-lg border border-dark-border-primary"
                        >
                          {typeof event === "string" ? (
                            <p className="text-dark-text-primary">{event}</p>
                          ) : (
                            <>
                              {event.date && (
                                <p className="text-sm text-dark-text-secondary mb-1">
                                  {new Date(event.date).toLocaleDateString()}
                                </p>
                              )}
                              {event.title && (
                                <h4 className="text-lg font-semibold text-dark-text-primary mb-2">
                                  {event.title}
                                </h4>
                              )}
                              {event.description && (
                                <p className="text-dark-text-secondary">
                                  {event.description}
                                </p>
                              )}
                              {event.impact && (
                                <p className="text-sm text-dark-text-tertiary mt-2">
                                  Impact: {event.impact}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </Card>
              )}

            {/* Symbols Analysis */}
            {analysis.symbols_analysis &&
              analysis.symbols_analysis.length > 0 && (
                <Card title="Symbols Analysis">
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-dark-border-primary">
                          <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary">
                            Symbol
                          </th>
                          <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary">
                            Analysis
                          </th>
                          <th className="text-left py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-dark-text-secondary">
                            Outlook
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.symbols_analysis.map(
                          (symbolAnalysis: any, index: number) => (
                            <tr
                              key={index}
                              className="border-b border-dark-border-primary hover:bg-dark-bg-tertiary"
                            >
                              <td className="py-3 px-2 sm:px-4">
                                <span className="font-medium text-dark-text-primary text-xs sm:text-sm">
                                  {typeof symbolAnalysis === "string"
                                    ? symbolAnalysis
                                    : symbolAnalysis.symbol ||
                                      symbolAnalysis.name}
                                </span>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-dark-text-secondary text-xs sm:text-sm">
                                {typeof symbolAnalysis === "string"
                                  ? "-"
                                  : symbolAnalysis.analysis ||
                                    symbolAnalysis.notes ||
                                    "-"}
                              </td>
                              <td className="py-3 px-2 sm:px-4">
                                {typeof symbolAnalysis === "string" ? (
                                  "-"
                                ) : symbolAnalysis.outlook ? (
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      symbolAnalysis.outlook === "bullish"
                                        ? "bg-green-500/20 text-green-400"
                                        : symbolAnalysis.outlook === "bearish"
                                        ? "bg-red-500/20 text-red-400"
                                        : "bg-dark-bg-tertiary text-dark-text-secondary"
                                    }`}
                                  >
                                    {symbolAnalysis.outlook}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Analysis Info">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-dark-text-secondary mb-1">
                    Timeframe
                  </p>
                  <span
                    className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      analysis.timeframe === "weekly"
                        ? "bg-blue-500/20 text-blue-400"
                        : analysis.timeframe === "monthly"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-dark-bg-tertiary text-dark-text-secondary"
                    }`}
                  >
                    {analysis.timeframe}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-dark-text-secondary mb-1">
                    Start Date
                  </p>
                  <p className="text-dark-text-primary">
                    {new Date(analysis.start_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-dark-text-secondary mb-1">
                    End Date
                  </p>
                  <p className="text-dark-text-primary">
                    {new Date(analysis.end_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-dark-text-secondary mb-1">
                    Created
                  </p>
                  <p className="text-dark-text-primary">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisDetail;
