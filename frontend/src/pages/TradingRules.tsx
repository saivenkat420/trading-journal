import { useState, useEffect } from "react";
import { tradingRulesApi } from "../utils/api";
import { TradingRule } from "../types";
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

function TradingRules() {
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TradingRule | null>(null);
  const [filterActive, setFilterActive] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rule_type: "entry",
    is_active: true,
  });

  const ruleTypes = [
    { value: "entry", label: "Entry Rules" },
    { value: "exit", label: "Exit Rules" },
    { value: "risk", label: "Risk Management" },
    { value: "psychology", label: "Psychology" },
    { value: "general", label: "General" },
  ];

  useEffect(() => {
    loadRules();
  }, [filterActive]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterActive !== "all") {
        params.is_active = filterActive === "active";
      }
      const res = await tradingRulesApi.getAll(params);
      setRules(res.data.data);
    } catch (err: any) {
      console.error("Error loading trading rules:", err);
      setError(
        err?.response?.data?.error?.message || "Failed to load trading rules"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      name: "",
      description: "",
      rule_type: "entry",
      is_active: true,
    });
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openEditForm = (rule: TradingRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || "",
      rule_type: rule.rule_type || "general",
      is_active: rule.is_active,
    });
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Rule name is required");
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      if (editingRule) {
        await tradingRulesApi.update(editingRule.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_active: formData.is_active,
        });
        setSuccess("Trading rule updated successfully");
      } else {
        await tradingRulesApi.create({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          rule_type: formData.rule_type,
          is_active: formData.is_active,
        });
        setSuccess("Trading rule created successfully");
      }
      setIsFormOpen(false);
      resetForm();
      loadRules();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to save trading rule"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rule: TradingRule) => {
    try {
      await tradingRulesApi.update(rule.id, {
        is_active: !rule.is_active,
      });
      setSuccess(
        `Rule "${rule.name}" ${!rule.is_active ? "activated" : "deactivated"}`
      );
      loadRules();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to update rule status"
      );
    }
  };

  const handleDelete = async (rule: TradingRule) => {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await tradingRulesApi.delete(rule.id);
      setSuccess("Trading rule deleted successfully");
      loadRules();
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to delete trading rule"
      );
    }
  };

  const getRuleTypeColor = (type: string | undefined) => {
    switch (type) {
      case "entry":
        return "bg-green-500/20 text-green-400";
      case "exit":
        return "bg-red-500/20 text-red-400";
      case "risk":
        return "bg-yellow-500/20 text-yellow-400";
      case "psychology":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-blue-500/20 text-blue-400";
    }
  };

  const groupedRules = rules.reduce((acc, rule) => {
    const type = rule.rule_type || "general";
    if (!acc[type]) acc[type] = [];
    acc[type].push(rule);
    return acc;
  }, {} as Record<string, TradingRule[]>);

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
            Trading Rules
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Define and manage your trading rules and guidelines
          </p>
        </div>
        <Button onClick={openCreateForm} className="w-full sm:w-auto">
          Add Rule
        </Button>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {/* Filter */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Select
            label="Filter by Status"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            options={[
              { value: "all", label: "All Rules" },
              { value: "active", label: "Active Only" },
              { value: "inactive", label: "Inactive Only" },
            ]}
          />
          <div className="text-sm text-dark-text-secondary mt-6">
            Total: {rules.length} rule{rules.length !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>

      {/* Create/Edit Form */}
      {isFormOpen && (
        <Card title={editingRule ? "Edit Trading Rule" : "Create Trading Rule"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Rule Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Never risk more than 2% per trade"
              required
            />

            {!editingRule && (
              <Select
                label="Rule Type"
                value={formData.rule_type}
                onChange={(e) =>
                  setFormData({ ...formData, rule_type: e.target.value })
                }
                options={ruleTypes}
              />
            )}

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detailed explanation of the rule and why it's important..."
              rows={4}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="rounded border-dark-border-primary text-dark-accent-primary focus:ring-dark-accent-primary"
              />
              <label
                htmlFor="is_active"
                className="text-sm text-dark-text-primary"
              >
                Rule is active
              </label>
            </div>

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
                {editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-4">
              No trading rules defined yet.
            </p>
            <p className="text-dark-text-tertiary text-sm mb-4">
              Trading rules help you stay disciplined and consistent in your
              trading approach.
            </p>
            <Button onClick={openCreateForm}>Create Your First Rule</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRules).map(([type, typeRules]) => (
            <Card
              key={type}
              title={`${
                ruleTypes.find((t) => t.value === type)?.label || "General"
              } (${typeRules.length})`}
            >
              <div className="space-y-3">
                {typeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`border rounded-lg p-4 transition-all ${
                      rule.is_active
                        ? "border-dark-border-primary bg-dark-bg-tertiary"
                        : "border-dark-border-primary/50 bg-dark-bg-tertiary/50 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className={`font-semibold ${
                              rule.is_active
                                ? "text-dark-text-primary"
                                : "text-dark-text-secondary line-through"
                            }`}
                          >
                            {rule.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getRuleTypeColor(
                              rule.rule_type
                            )}`}
                          >
                            {rule.rule_type || "general"}
                          </span>
                          {!rule.is_active && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                              Inactive
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-dark-text-secondary">
                            {rule.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(rule)}
                        >
                          {rule.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditForm(rule)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(rule)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default TradingRules;
