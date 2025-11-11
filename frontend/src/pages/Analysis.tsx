import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { analysisApi } from "../utils/api";
import { Analysis } from "../types";
import {
  Card,
  Button,
  LoadingSpinner,
  Input,
  Select,
  Textarea,
  ErrorMessage,
  SuccessMessage,
} from "../components";

type AnalysisTimeframe = "custom" | "weekly" | "monthly";

interface AnalysisFormData {
  timeframe: AnalysisTimeframe;
  custom_title: string;
  start_date: string;
  end_date: string;
  performance_context: string;
  major_news_events: string;
  symbols_analysis: string;
}

const initialFormState: AnalysisFormData = {
  timeframe: "weekly",
  custom_title: "",
  start_date: "",
  end_date: "",
  performance_context: "",
  major_news_events: "",
  symbols_analysis: "",
};

function AnalysisPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AnalysisFormData>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      const res = await analysisApi.getAll();
      setAnalyses(res.data.data);
    } catch (error) {
      console.error("Error loading analyses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelCreate = () => {
    setShowForm(false);
    setFormData(initialFormState);
  };

  const handleInputChange = <K extends keyof AnalysisFormData>(
    field: K,
    value: AnalysisFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      payload.append(
        "performance_context",
        formData.performance_context.trim()
      );
    }

    if (newsEvents.length > 0) {
      payload.append("major_news_events", JSON.stringify(newsEvents));
    }

    if (symbolsAnalysis.length > 0) {
      payload.append("symbols_analysis", JSON.stringify(symbolsAnalysis));
    }

    try {
      setSubmitting(true);
      await analysisApi.create(payload);
      setSuccess("Analysis created successfully!");
      setShowForm(false);
      setFormData(initialFormState);
      await loadAnalyses();
    } catch (err: any) {
      console.error("Error creating analysis:", err);
      setError(
        err?.response?.data?.error?.message || "Failed to create analysis"
      );
    } finally {
      setSubmitting(false);
    }
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
            Market Analysis
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Your market analysis entries
          </p>
        </div>
        {!showForm && (
          <Button onClick={handleStartCreate} className="w-full sm:w-auto">
            Add Analysis
          </Button>
        )}
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {showForm && (
        <Card title="Create Analysis">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Timeframe *"
              value={formData.timeframe}
              onChange={(event) =>
                handleInputChange(
                  "timeframe",
                  event.target.value as AnalysisTimeframe
                )
              }
              options={[
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "custom", label: "Custom" },
              ]}
              required
            />

            {formData.timeframe === "custom" && (
              <Input
                label="Custom Title"
                type="text"
                value={formData.custom_title}
                onChange={(event) =>
                  handleInputChange("custom_title", event.target.value)
                }
                placeholder="e.g., Q1 Macro Outlook"
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date *"
                type="date"
                value={formData.start_date}
                onChange={(event) =>
                  handleInputChange("start_date", event.target.value)
                }
                required
              />
              <Input
                label="End Date *"
                type="date"
                value={formData.end_date}
                onChange={(event) =>
                  handleInputChange("end_date", event.target.value)
                }
                required
              />
            </div>

            <Textarea
              label="Performance Context"
              value={formData.performance_context}
              onChange={(event) =>
                handleInputChange("performance_context", event.target.value)
              }
              placeholder="Summarize key takeaways, market sentiment, or performance notes..."
              rows={4}
            />

            <Textarea
              label="Major News Events"
              value={formData.major_news_events}
              onChange={(event) =>
                handleInputChange("major_news_events", event.target.value)
              }
              placeholder="Enter one event per line (optional)"
              rows={3}
              helperText="Each line will be saved as a separate news item."
            />

            <Textarea
              label="Symbols Analysis"
              value={formData.symbols_analysis}
              onChange={(event) =>
                handleInputChange("symbols_analysis", event.target.value)
              }
              placeholder="Enter symbols or brief notes per line (optional)"
              rows={3}
              helperText="For quick entries, add one symbol or note per line."
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-dark-border-primary">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelCreate}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                Save Analysis
              </Button>
            </div>
          </form>
        </Card>
      )}

      {analyses.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-4">
              No standalone analyses yet. Click "Add Analysis" to create your
              first analysis.
            </p>
            <Button onClick={handleStartCreate}>Add Analysis</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {analyses.map((analysis) => (
            <Card
              key={analysis.id}
              className="hover:shadow-dark-lg transition-shadow duration-200"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-dark-text-primary mb-2">
                    {analysis.custom_title ||
                      `${
                        analysis.timeframe.charAt(0).toUpperCase() +
                        analysis.timeframe.slice(1)
                      } Analysis`}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
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
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-dark-text-secondary">Period</p>
                    <p className="text-dark-text-primary">
                      {new Date(analysis.start_date).toLocaleDateString()} -{" "}
                      {new Date(analysis.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  {analysis.performance_context && (
                    <div>
                      <p className="text-sm text-dark-text-secondary mb-1">
                        Performance Context
                      </p>
                      <p className="text-dark-text-primary text-sm line-clamp-2">
                        {analysis.performance_context}
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-dark-border-primary">
                  <Link
                    to={`/analysis/${analysis.id}`}
                    className="text-dark-accent-primary hover:text-blue-400 text-sm font-medium transition-colors inline-flex items-center gap-1"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default AnalysisPage;
