import { useEffect, useState } from "react";

import {
  createKnowledgeItem,
  deleteKnowledgeItem,
  getKnowledgeItem,
  getKnowledgeItems,
  updateKnowledgeItem,
} from "./api";


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
      <>
        {successMessage && <p className="knowledge-message">{successMessage}</p>}
        {error && <p className="knowledge-error">{error}</p>}
      </>
    );
  }

  function renderHeader() {
    return (
      <header className="knowledge-header">
        <div>
          <h1>Knowledge Vault</h1>
          <p className="dashboard-description">
            Save and organize your stories, achievements, lessons, opinions, and facts.
          </p>
        </div>

        {mode === "list" && (
          <button className="knowledge-add-button" type="button" onClick={openCreateMode}>
            ⊕ Add Item
          </button>
        )}
      </header>
    );
  }

  function renderList() {
    const hasFilters = search || categoryFilter || confidentialityFilter;

    return (
      <>
        <div className="knowledge-toolbar">
          <form className="knowledge-search-form" onSubmit={handleSearch}>
            <label className="visually-hidden" htmlFor="knowledge-search-input">
              Search your saved knowledge
            </label>
            <div className="knowledge-search-input">
              <span aria-hidden="true">🔍</span>
              <input
                id="knowledge-search-input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your saved knowledge"
              />
            </div>
            <button type="submit">Search</button>
          </form>

          <select
            className="knowledge-filter"
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
            className="knowledge-filter"
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
            <button className="knowledge-clear-button" type="button" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>

        {loading && <p>Loading knowledge items...</p>}

        {!loading && items.length === 0 && <p className="knowledge-empty">No knowledge items found.</p>}

        <div className="knowledge-list">
          {items.map((item) => (
            <article className="knowledge-card" key={item.item_id}>
              <div>
                <div className="knowledge-card-header">
                  <h2>{item.title}</h2>
                  <span>{item.confidentiality_level || "private"}</span>
                </div>

                <p className="knowledge-card-content">{getContentPreview(item.content)}</p>

                <div className="knowledge-metadata">
                  <span>{getCategoryLabel(item.category)}</span>
                  <span>{formatDate(item.item_date)}</span>
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="knowledge-tags">
                    {item.tags.map((tag) => (
                      <span className="knowledge-tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="knowledge-card-actions">
                <button type="button" onClick={() => openViewMode(item.item_id)}>
                  View
                </button>
                <button type="button" onClick={() => openEditMode(item)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(item.item_id)}>
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
      <section className="knowledge-form-card">
        <h2>{isEditing ? "Edit Knowledge Item" : "Add Knowledge Item"}</h2>

        <form className="knowledge-form" onSubmit={handleSubmit}>
          <div className="knowledge-form-group">
            <label htmlFor="knowledge-title">Title</label>
            <input
              id="knowledge-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="knowledge-form-group">
            <label htmlFor="knowledge-category">Category</label>
            <select
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

          <div className="knowledge-form-group">
            <label htmlFor="knowledge-date">Date</label>
            <input
              id="knowledge-date"
              name="item_date"
              type="date"
              value={formData.item_date}
              onChange={handleFormChange}
            />
          </div>

          <div className="knowledge-form-group">
            <label htmlFor="knowledge-content">Content</label>
            <textarea
              id="knowledge-content"
              name="content"
              rows="8"
              value={formData.content}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="knowledge-form-group">
            <label htmlFor="knowledge-tags">Tags</label>
            <input
              id="knowledge-tags"
              name="tagsText"
              type="text"
              value={formData.tagsText}
              onChange={handleFormChange}
              placeholder="leadership, growth, customer-success"
            />
          </div>

          <div className="knowledge-form-group">
            <span className="knowledge-label">Confidentiality level</span>
            <div className="confidentiality-buttons">
              {confidentialityOptions.map((level) => (
                <button
                  className={
                    formData.confidentiality_level === level
                      ? "confidentiality-button active"
                      : "confidentiality-button"
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
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="knowledge-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Submit"}
            </button>
            <button type="button" onClick={openListMode}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderView() {
    return (
      <article className="knowledge-detail-card">
        <h2>{selectedItem.title}</h2>
        <p>{selectedItem.content}</p>

        <div className="knowledge-metadata">
          <span>Category: {getCategoryLabel(selectedItem.category)}</span>
          <span>Date: {formatDate(selectedItem.item_date)}</span>
          <span>Confidentiality: {selectedItem.confidentiality_level || "private"}</span>
          <span>Created: {formatDate(selectedItem.created_at)}</span>
          <span>Updated: {formatDate(selectedItem.updated_at)}</span>
        </div>

        {selectedItem.tags && selectedItem.tags.length > 0 && (
          <div className="knowledge-tags">
            {selectedItem.tags.map((tag) => (
              <span className="knowledge-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="knowledge-card-actions">
          <button type="button" onClick={openListMode}>
            Back
          </button>
          <button type="button" onClick={() => openEditMode(selectedItem)}>
            Edit
          </button>
          <button type="button" onClick={() => handleDelete(selectedItem.item_id)}>
            Delete
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="knowledge-vault-page">
      {renderHeader()}
      {renderMessages()}
      {mode === "list" && renderList()}
      {(mode === "create" || mode === "edit") && renderForm()}
      {mode === "view" && selectedItem && renderView()}
    </section>
  );
}

export default KnowledgeVault;
