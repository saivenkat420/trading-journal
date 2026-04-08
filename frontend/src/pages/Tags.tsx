import { useState, useEffect } from "react";
import { tagsApi } from "../utils/api";
import { Tag } from "../types";
import {
  Card,
  LoadingSpinner,
  Button,
  Input,
  ErrorMessage,
  SuccessMessage,
} from "../components";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
  });

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const res = await tagsApi.getAll();
      setTags(res.data.data);
    } catch (err: any) {
      console.error("Error loading tags:", err);
      setError(err?.response?.data?.error?.message || "Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingTag(null);
    setFormData({
      name: "",
      color: "#3b82f6",
    });
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openEditForm = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || "#3b82f6",
    });
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Tag name is required");
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      if (editingTag) {
        await tagsApi.update(editingTag.id, {
          name: formData.name.trim(),
          color: formData.color,
        });
        setSuccess("Tag updated successfully");
      } else {
        await tagsApi.create({
          name: formData.name.trim(),
          color: formData.color,
        });
        setSuccess("Tag created successfully");
      }
      setIsFormOpen(false);
      resetForm();
      loadTags();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await tagsApi.delete(tag.id);
      setSuccess("Tag deleted successfully");
      loadTags();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to delete tag");
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
            Tags
          </h1>
          <p className="text-sm sm:text-base text-dark-text-secondary">
            Create and manage tags to categorize your trades
          </p>
        </div>
        <Button onClick={openCreateForm} className="w-full sm:w-auto">
          Create Tag
        </Button>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />
      )}

      {/* Create/Edit Form */}
      {isFormOpen && (
        <Card title={editingTag ? "Edit Tag" : "Create Tag"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Tag Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Breakout, Reversal, News Trade"
              required
            />

            <div>
              <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? "border-white scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-10 h-10 rounded cursor-pointer"
                  aria-label="Custom color picker"
                />
                <Input
                  label=""
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-dark-bg-tertiary rounded-lg">
              <span className="text-sm text-dark-text-secondary">Preview:</span>
              <span
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: formData.color }}
              >
                {formData.name || "Tag Name"}
              </span>
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
                {editingTag ? "Update Tag" : "Create Tag"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tags List */}
      {tags.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-dark-text-secondary mb-4">No tags created yet.</p>
            <p className="text-dark-text-tertiary text-sm mb-4">
              Tags help you categorize and filter your trades for better
              analysis.
            </p>
            <Button onClick={openCreateForm}>Create Your First Tag</Button>
          </div>
        </Card>
      ) : (
        <Card title={`All Tags (${tags.length})`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="border border-dark-border-primary rounded-lg p-4 bg-dark-bg-tertiary hover:border-dark-border-secondary transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color || "#3b82f6" }}
                    />
                    <span className="font-medium text-dark-text-primary">
                      {tag.name}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(tag)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(tag)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color || "#3b82f6" }}
                  >
                    {tag.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default Tags;
