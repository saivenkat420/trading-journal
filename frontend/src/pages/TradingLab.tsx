import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { strategiesApi } from "../utils/api";
import { Strategy } from "../types";
import {
  Card,
  LoadingSpinner,
  Button,
  Input,
  RichTextEditor,
  ErrorMessage,
  SuccessMessage,
} from "../components";

function TradingLab() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      setLoading(true);
      const res = await strategiesApi.getAll();
      setStrategies(res.data.data);
    } catch (err: any) {
      console.error("Error loading strategies:", err);
      setError(
        err?.response?.data?.error?.message || "Failed to load strategies"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingStrategy(null);
    setName("");
    setDescription("");
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setName(strategy.name);
    setDescription(strategy.description || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      if (editingStrategy) {
        await strategiesApi.update(editingStrategy.id, {
          name: name.trim(),
          description,
        });
        setSuccess("Strategy updated successfully");
      } else {
        await strategiesApi.create({
          name: name.trim(),
          description,
        });
        setSuccess("Strategy created successfully");
      }
      setIsFormOpen(false);
      resetForm();
      loadStrategies();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to save strategy"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (strategy: Strategy) => {
    if (
      !confirm(`Delete strategy "${strategy.name}"? This cannot be undone.`)
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await strategiesApi.delete(strategy.id);
      setSuccess("Strategy deleted successfully");
      loadStrategies();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to delete strategy"
      );
    }
  };

  const sanitizedStrategies = useMemo(
    () =>
      strategies.map((strategy) => ({
        ...strategy,
        safeDescription: strategy.description
          ? DOMPurify.sanitize(strategy.description)
          : "",
      })),
    [strategies]
  );

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
            Trading Lab
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Design and iterate on your trading strategies, playbooks, and
            experiment ideas.
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          variant="primary"
          className="w-full sm:w-auto"
        >
          Create Strategy
        </Button>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {isFormOpen && (
        <Card title={editingStrategy ? "Edit Strategy" : "Create Strategy"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Strategy Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., London Session Breakout"
              required
            />
            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Playbook / Notes
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Document your plan with checklists, execution rules, psychology reminders, etc."
              />
              <p className="text-xs text-dark-text-tertiary mt-2">
                Tip: Use the toolbar to insert checklists, bullet points, radio
                buttons, and code blocks for a rich trading plan.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-3">
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
                {editingStrategy ? "Update Strategy" : "Create Strategy"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Strategy Library">
        {sanitizedStrategies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-3">
              You haven&apos;t saved any strategies yet.
            </p>
            <p className="text-dark-text-tertiary text-sm">
              Use the &ldquo;Create Strategy&rdquo; button above to add your
              first entry.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sanitizedStrategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-dark-bg-tertiary rounded-lg border border-dark-border-primary p-5 space-y-3 hover:border-dark-border-secondary transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-dark-text-primary">
                      {strategy.name}
                    </h3>
                    <p className="text-xs text-dark-text-tertiary">
                      Last updated:{" "}
                      {new Date(
                        strategy.updated_at || strategy.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openEditForm(strategy)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(strategy)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {strategy.safeDescription ? (
                  <div
                    className="prose prose-invert max-w-none text-sm space-y-2"
                    dangerouslySetInnerHTML={{
                      __html: strategy.safeDescription,
                    }}
                  />
                ) : (
                  <p className="text-dark-text-tertiary text-sm">
                    No playbook content yet. Click edit to add details.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default TradingLab;
