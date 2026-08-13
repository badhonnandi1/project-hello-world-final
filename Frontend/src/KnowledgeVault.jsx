import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Edit3,
  Eye,
  Plus,
  Save,
  Search as SearchIcon,
  Trash2,
  X,
} from "lucide-react";

import {
  createKnowledgeItem,
  deleteKnowledgeItem,
  getKnowledgeItem,
  getKnowledgeItems,
  updateKnowledgeItem,
} from "./badhon";


const categoryOptions = [
  { value: "", label: "All Categories" },
  { value: "achievement", label: "Achievement" },
  { value: "personal_story", label: "Personal Story" },
  { value: "career_lesson", label: "Career Lesson" },
  { value: "company_fact", label: "Company Fact" },
  { value: "product_information", label: "Product Information" },
  { value: "case_study", label: "Case Study" },
  { value: "opinion", label: "Opinion" },
  { value: "important_experience", label: "Important Experience" },
  { value: "other", label: "Other" },
];

const confidentialityOptions = ["public", "private", "internal"];

const emptyFormData = {
  title: "",
  category: "",
  item_date: "",
  content: "",
  tagsText: "",
  confidentiality_level: "private",
};


// This component handles the Knowledge Vault list, create, view, edit, and delete screens.
function KnowledgeVault({ token, onUnauthorized }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [confidentialityFilter, setConfidentialityFilter] = useState("");
  const [mode, setMode] = useState("list");
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(emptyFormData);

  // This function shows API errors and logs out when the token is invalid.
  function handleApiError(apiError) {
    if (apiError.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }

    setError(apiError.message);
  }

  // This function reloads the list using the selected search and filters.
  async function loadItems(overrides = {}) {
    setLoading(true);
    setError("");

    const activeSearch = overrides.search ?? search;
    const activeCategory = overrides.category ?? categoryFilter;
    const activeConfidentiality = overrides.confidentiality ?? confidentialityFilter;

    try {
      const data = await getKnowledgeItems(token, {
        search: activeSearch.trim(),
        category: activeCategory,
        confidentiality_level: activeConfidentiality,
      });
      setItems(data);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setLoading(false);
    }
  }

  // This effect loads items when the Knowledge Vault screen first opens.
  useEffect(() => {
    loadItems();
  }, []);

  // This function changes the screen mode without leaving the dashboard.
  function openListMode() {
    setMode("list");
    setSelectedItem(null);
    setFormData(emptyFormData);
    setError("");
  }

  // This function opens the create form with empty fields.
  function openCreateMode() {
    setMode("create");
    setSelectedItem(null);
    setFormData(emptyFormData);
    setError("");
    setSuccessMessage("");
  }

  // This function opens the edit form and fills it with the selected item.
  function openEditMode(item) {
    setMode("edit");
    setSelectedItem(item);
    setFormData({
      title: item.title || "",
      category: item.category || "",
      item_date: item.item_date || "",
      content: item.content || "",
      tagsText: (item.tags || []).join(", "),
      confidentiality_level: item.confidentiality_level || "private",
    });
    setError("");
    setSuccessMessage("");
  }

  // This function runs a search only when the form is submitted.
  function handleSearch(event) {
    event.preventDefault();
    loadItems({ search });
  }

  // This function reloads items when the category filter changes.
  function handleCategoryFilterChange(event) {
    const value = event.target.value;
    setCategoryFilter(value);
    loadItems({ category: value });
  }

  // This function reloads items when the confidentiality filter changes.
  function handleConfidentialityFilterChange(event) {
    const value = event.target.value;
    setConfidentialityFilter(value);
    loadItems({ confidentiality: value });
  }

  // This function clears the search and filters, then reloads the full list.
  function clearFilters() {
    setSearch("");
    setCategoryFilter("");
    setConfidentialityFilter("");
    loadItems({ search: "", category: "", confidentiality: "" });
  }

  // This function loads one full item before opening view mode.
  async function openViewMode(itemId) {
    setError("");

    try {
      const item = await getKnowledgeItem(token, itemId);
      setSelectedItem(item);
      setMode("view");
    } catch (apiError) {
      handleApiError(apiError);
    }
  }

  // This function updates form state when the user types.
  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  }

  // This function converts comma-separated tags into an array.
  function convertTagsToArray(tagsText) {
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return [...new Set(tags)];
  }

  // This function prepares form data for the backend without adding user_id.
  function buildItemData() {
    return {
      title: formData.title.trim(),
      content: formData.content.trim(),
      category: formData.category || null,
      tags: convertTagsToArray(formData.tagsText),
      item_date: formData.item_date || null,
      confidentiality_level: formData.confidentiality_level,
    };
  }

  // This function creates or updates an item after simple validation.
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setSaving(true);

    try {
      if (mode === "create") {
        await createKnowledgeItem(token, buildItemData());
        setSuccessMessage("Knowledge item created successfully.");
      } else {
        await updateKnowledgeItem(token, selectedItem.item_id, buildItemData());
        setSuccessMessage("Knowledge item updated successfully.");
      }

      openListMode();
      await loadItems();
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setSaving(false);
    }
  }

  // This function safely deletes an item after confirmation.
  async function handleDelete(itemId) {
    const confirmed = window.confirm("Delete this knowledge item?");

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await deleteKnowledgeItem(token, itemId);
      setSuccessMessage("Knowledge item deleted successfully.");
      openListMode();
      await loadItems();
    } catch (apiError) {
      handleApiError(apiError);
    }
  }

  function getCategoryLabel(categoryValue) {
    const option = categoryOptions.find((category) => category.value === categoryValue);
    return option ? option.label : "Uncategorized";
  }

  function getContentPreview(content) {
    if (content.length <= 130) {
      return content;
    }

    return `${content.slice(0, 130)}...`;
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return "Not set";
    }

    return new Date(dateValue).toLocaleDateString();
  }

  function renderMessages() {
    return (
      <div aria-live="polite" className="space-y-3">
        {successMessage && <p className="status-success">{successMessage}</p>}
        {error && <p className="status-error">{error}</p>}
      </div>
    );
  }

  function renderHeader() {
    return (
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Source Library</p>
          <h1 className="page-title">Knowledge Vault</h1>
          <p className="page-subtitle">
            Save and organize your stories, achievements, lessons, opinions, and facts.
          </p>
        </div>

        {mode === "list" && (
          <button className="btn-primary shrink-0" type="button" onClick={openCreateMode}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Item
          </button>
        )}
      </header>
    );
  }

  function renderList() {
    const hasFilters = search || categoryFilter || confidentialityFilter;

    return (
      <>
        <div className="ui-card grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
          <form className="flex min-w-0 gap-2" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="knowledge-search-input">
              Search your saved knowledge
            </label>
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                className="form-input pl-10"
                id="knowledge-search-input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your saved knowledge"
              />
            </div>
            <button className="btn-secondary shrink-0" type="submit">
              Search
            </button>
          </form>

          <select
            className="form-input"
            value={categoryFilter}
            onChange={handleCategoryFilterChange}
            aria-label="Category"
          >
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            className="form-input"
            value={confidentialityFilter}
            onChange={handleConfidentialityFilterChange}
            aria-label="Confidentiality"
          >
            <option value="">All Confidentiality</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="internal">Internal</option>
          </select>

          {hasFilters && (
            <button className="btn-quiet" type="button" onClick={clearFilters}>
              <X aria-hidden="true" className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {loading && <p className="ui-card p-4 text-sm font-medium text-zinc-600">Loading knowledge items...</p>}

        {!loading && items.length === 0 && (
          <div className="ui-card p-8 text-center">
            <BookOpen aria-hidden="true" className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-950">No knowledge items found</p>
            <p className="mt-1 text-sm text-zinc-600">Add an item or clear filters to widen the results.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              className="ui-card flex min-h-[18rem] flex-col justify-between p-5 transition hover:border-cyan-200 hover:shadow-soft"
              key={item.item_id}
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold leading-7 text-zinc-950">{item.title}</h2>
                  <span className="tag-pill capitalize">{item.confidentiality_level || "private"}</span>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-600">{getContentPreview(item.content)}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="tag-pill">{getCategoryLabel(item.category)}</span>
                  <span className="tag-pill">{formatDate(item.item_date)}</span>
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button className="btn-secondary flex-1" type="button" onClick={() => openViewMode(item.item_id)}>
                  <Eye aria-hidden="true" className="h-4 w-4" />
                  View
                </button>
                <button className="btn-secondary flex-1" type="button" onClick={() => openEditMode(item)}>
                  <Edit3 aria-hidden="true" className="h-4 w-4" />
                  Edit
                </button>
                <button className="btn-danger flex-1" type="button" onClick={() => handleDelete(item.item_id)}>
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </>
    );
  }

  function renderForm() {
    const isEditing = mode === "edit";

    return (
      <section className="ui-card max-w-3xl p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">{isEditing ? "Edit Source" : "New Source"}</p>
            <h2 className="text-xl font-semibold text-zinc-950">
              {isEditing ? "Edit Knowledge Item" : "Add Knowledge Item"}
            </h2>
          </div>
          <button className="btn-secondary" type="button" onClick={openListMode}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="field-label" htmlFor="knowledge-title">Title</label>
            <input
              className="form-input"
              id="knowledge-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="field-label" htmlFor="knowledge-category">Category</label>
              <select
                className="form-input"
                id="knowledge-category"
                name="category"
                value={formData.category}
                onChange={handleFormChange}
              >
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.value ? category.label : "Choose a category"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="knowledge-date">Date</label>
              <input
                className="form-input"
                id="knowledge-date"
                name="item_date"
                type="date"
                value={formData.item_date}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="knowledge-content">Content</label>
            <textarea
              className="form-input min-h-48 resize-y leading-6"
              id="knowledge-content"
              name="content"
              rows="8"
              value={formData.content}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="knowledge-tags">Tags</label>
            <input
              className="form-input"
              id="knowledge-tags"
              name="tagsText"
              type="text"
              value={formData.tagsText}
              onChange={handleFormChange}
              placeholder="leadership, growth, customer-success"
            />
          </div>

          <div className="space-y-3">
            <span className="field-label">Confidentiality level</span>
            <div className="flex flex-wrap gap-2" aria-label="Confidentiality level">
              {confidentialityOptions.map((level) => (
                <button
                  className={
                    formData.confidentiality_level === level
                      ? "btn-primary capitalize"
                      : "btn-secondary capitalize"
                  }
                  key={level}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      confidentiality_level: level,
                    })
                  }
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
            <button className="btn-secondary" type="button" onClick={openListMode}>
              <X aria-hidden="true" className="h-4 w-4" />
              Cancel
            </button>
            <button className="btn-primary" type="submit" disabled={saving}>
              <Save aria-hidden="true" className="h-4 w-4" />
              {saving ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderView() {
    return (
      <article className="ui-card max-w-4xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Knowledge Item</p>
            <h2 className="text-2xl font-semibold tracking-normal text-zinc-950">{selectedItem.title}</h2>
          </div>
          <span className="tag-pill capitalize">{selectedItem.confidentiality_level || "private"}</span>
        </div>

        <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-zinc-700">{selectedItem.content}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="tag-pill">Category: {getCategoryLabel(selectedItem.category)}</span>
          <span className="tag-pill">Date: {formatDate(selectedItem.item_date)}</span>
          <span className="tag-pill">Created: {formatDate(selectedItem.created_at)}</span>
          <span className="tag-pill">Updated: {formatDate(selectedItem.updated_at)}</span>
        </div>

        {selectedItem.tags && selectedItem.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedItem.tags.map((tag) => (
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
          <button className="btn-secondary" type="button" onClick={openListMode}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
          <button className="btn-secondary" type="button" onClick={() => openEditMode(selectedItem)}>
            <Edit3 aria-hidden="true" className="h-4 w-4" />
            Edit
          </button>
          <button className="btn-danger" type="button" onClick={() => handleDelete(selectedItem.item_id)}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="space-y-6">
      {renderHeader()}
      {renderMessages()}
      {mode === "list" && renderList()}
      {(mode === "create" || mode === "edit") && renderForm()}
      {mode === "view" && selectedItem && renderView()}
    </section>
  );
}

export default KnowledgeVault;
