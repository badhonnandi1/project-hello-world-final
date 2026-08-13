import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  createAudienceOpportunity,
  deleteAudienceOpportunity,
  getAudienceOpportunities,
  reanalyzeAudienceOpportunity,
  updateAudienceOpportunity,
} from "./badhon";


const typeOptions = [
  { value: "question", label: "Question" },
  { value: "objection", label: "Objection" },
  { value: "misconception", label: "Misconception" },
  { value: "pain_point", label: "Pain Point" },
  { value: "negative_feedback", label: "Negative Feedback" },
  { value: "other", label: "Other" },
];

const statusOptions = ["New", "Reviewed", "Answered", "Converted to Content"];
const priorityOptions = ["low", "medium", "high"];
const sourcePlatformOptions = [
  "",
  "LinkedIn",
  "Instagram",
  "YouTube",
  "TikTok",
  "X / Twitter",
  "Facebook",
  "Reddit",
  "Website",
  "Email",
  "Other",
];

const emptyFormData = {
  source_text: "",
  source_platform: "",
};

const emptyFilters = {
  status: "",
  type: "",
  priority: "",
};


// This component handles the Audience Opportunities board and AI analysis flow.
function AudienceOpportunities({ token, onUnauthorized }) {
  const [opportunities, setOpportunities] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [formData, setFormData] = useState(emptyFormData);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [reanalyzingId, setReanalyzingId] = useState(null);
  const [changingStatusId, setChangingStatusId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // This function shows API errors and logs out when the token is invalid.
  function handleApiError(apiError) {
    if (apiError.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }

    setError(apiError.message);
  }

  // This function reloads the board with the selected filters.
  async function loadOpportunities(overrides = {}) {
    setLoading(true);
    setError("");

    const activeFilters = {
      status: overrides.status ?? filters.status,
      type: overrides.type ?? filters.type,
      priority: overrides.priority ?? filters.priority,
    };

    try {
      const data = await getAudienceOpportunities(token, activeFilters);
      setOpportunities(data);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setLoading(false);
    }
  }

  // This effect loads opportunities when the screen first opens.
  useEffect(() => {
    loadOpportunities();
  }, []);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm({
      ...editForm,
      [name]: value,
    });
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    const updatedFilters = {
      ...filters,
      [name]: value,
    };

    setFilters(updatedFilters);
    loadOpportunities(updatedFilters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    loadOpportunities(emptyFilters);
  }

  function getTypeLabel(typeValue) {
    const option = typeOptions.find((typeOption) => typeOption.value === typeValue);
    return option ? option.label : "Other";
  }

  function getPriorityClass(priority) {
    if (priority === "high") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    if (priority === "medium") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  function getStatusClass(status) {
    if (status === "Converted to Content") {
      return "border-cyan-200 bg-cyan-50 text-cyan-800";
    }

    if (status === "Answered") {
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    if (status === "Reviewed") {
      return "border-violet-200 bg-violet-50 text-violet-800";
    }

    return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }

  function buildEditData() {
    return {
      source_text: editForm.source_text.trim(),
      source_platform: editForm.source_platform.trim() || null,
      type: editForm.type,
      audience_concern: editForm.audience_concern.trim(),
      suggested_reply: editForm.suggested_reply.trim(),
      suggested_topic: editForm.suggested_topic.trim(),
      suggested_hook: editForm.suggested_hook.trim(),
      priority: editForm.priority,
      status: editForm.status,
    };
  }

  function validateEditForm() {
    if (!editForm.source_text.trim()) {
      setError("Source text is required.");
      return false;
    }

    if (
      !editForm.audience_concern.trim() ||
      !editForm.suggested_reply.trim() ||
      !editForm.suggested_topic.trim() ||
      !editForm.suggested_hook.trim()
    ) {
      setError("Audience concern, reply, topic, and hook are required.");
      return false;
    }

    return true;
  }

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.source_text.trim()) {
      setError("Source text is required.");
      return;
    }

    setCreating(true);

    try {
      await createAudienceOpportunity(token, {
        source_text: formData.source_text.trim(),
        source_platform: formData.source_platform || null,
      });
      setFormData(emptyFormData);
      setSuccessMessage("Opportunity created and analyzed successfully.");
      await loadOpportunities();
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setCreating(false);
    }
  }

  function openEditMode(opportunity) {
    setEditingId(opportunity.id);
    setEditForm({
      source_text: opportunity.source_text || "",
      source_platform: opportunity.source_platform || "",
      type: opportunity.type || "other",
      audience_concern: opportunity.audience_concern || "",
      suggested_reply: opportunity.suggested_reply || "",
      suggested_topic: opportunity.suggested_topic || "",
      suggested_hook: opportunity.suggested_hook || "",
      priority: opportunity.priority || "medium",
      status: opportunity.status || "New",
    });
    setError("");
    setSuccessMessage("");
  }

  function closeEditMode() {
    setEditingId(null);
    setEditForm(null);
    setError("");
  }

  async function handleSaveEdit(opportunityId) {
    setError("");
    setSuccessMessage("");

    if (!validateEditForm()) {
      return;
    }

    setSavingEdit(true);

    try {
      await updateAudienceOpportunity(token, opportunityId, buildEditData());
      setSuccessMessage("Opportunity updated successfully.");
      setEditingId(null);
      setEditForm(null);
      await loadOpportunities();
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleStatusChange(opportunity, statusValue) {
    setError("");
    setSuccessMessage("");
    setChangingStatusId(opportunity.id);

    try {
      await updateAudienceOpportunity(token, opportunity.id, { status: statusValue });
      setSuccessMessage("Status updated successfully.");
      await loadOpportunities();
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setChangingStatusId(null);
    }
  }

  async function handleConvertToContent(opportunity) {
    await handleStatusChange(opportunity, "Converted to Content");
  }

  async function handleReanalyze(opportunityId) {
    setError("");
    setSuccessMessage("");
    setReanalyzingId(opportunityId);

    try {
      await reanalyzeAudienceOpportunity(token, opportunityId);
      setSuccessMessage("Opportunity reanalyzed successfully.");
      if (editingId === opportunityId) {
        closeEditMode();
      }
      await loadOpportunities();
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setReanalyzingId(null);
    }
  }

  async function handleDelete(opportunityId) {
    const confirmed = window.confirm("Delete this opportunity?");

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setDeletingId(opportunityId);

    try {
      await deleteAudienceOpportunity(token, opportunityId);
      setSuccessMessage("Opportunity deleted successfully.");
      if (editingId === opportunityId) {
        closeEditMode();
      }
      await loadOpportunities();
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setDeletingId(null);
    }
  }

  function renderMessages() {
    return (
      <div aria-live="polite" className="space-y-3">
        {successMessage && <p className="status-success">{successMessage}</p>}
        {error && <p className="status-error">{error}</p>}
      </div>
    );
  }

  function renderCreateForm() {
    return (
      <section className="ui-card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="section-title">Analyze Audience Text</h2>
            <p className="text-sm text-zinc-600">Turn audience language into replies and content angles.</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleCreate}>
          <div className="space-y-2">
            <label className="field-label" htmlFor="opportunity-source-text">
              Source text
            </label>
            <textarea
              className="form-input min-h-40 resize-y leading-6"
              id="opportunity-source-text"
              name="source_text"
              rows="6"
              value={formData.source_text}
              onChange={handleFormChange}
              placeholder="Paste a comment, question, objection, negative feedback, or misconception"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <label className="field-label" htmlFor="opportunity-source-platform">
                Source platform
              </label>
              <select
                className="form-input"
                id="opportunity-source-platform"
                name="source_platform"
                value={formData.source_platform}
                onChange={handleFormChange}
              >
                {sourcePlatformOptions.map((platform) => (
                  <option key={platform || "empty-platform"} value={platform}>
                    {platform || "No platform selected"}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={creating}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              {creating ? "Analyzing..." : "Create Opportunity"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderFilters() {
    const hasFilters = filters.status || filters.type || filters.priority;

    return (
      <div className="ui-card grid gap-3 p-3 sm:grid-cols-3 lg:grid-cols-[12rem_12rem_12rem_auto]">
        <select
          aria-label="Status"
          className="form-input"
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
        >
          <option value="">All Statuses</option>
          {statusOptions.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {statusOption}
            </option>
          ))}
        </select>

        <select
          aria-label="Type"
          className="form-input"
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
        >
          <option value="">All Types</option>
          {typeOptions.map((typeOption) => (
            <option key={typeOption.value} value={typeOption.value}>
              {typeOption.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Priority"
          className="form-input"
          name="priority"
          value={filters.priority}
          onChange={handleFilterChange}
        >
          <option value="">All Priorities</option>
          {priorityOptions.map((priorityOption) => (
            <option className="capitalize" key={priorityOption} value={priorityOption}>
              {priorityOption}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button className="btn-quiet sm:col-span-3 lg:col-span-1" type="button" onClick={clearFilters}>
            <X aria-hidden="true" className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>
    );
  }

  function renderField(label, value) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">{value || "Not set"}</p>
      </div>
    );
  }

  function renderEditCard(opportunity) {
    return (
      <article className="ui-card p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Edit Opportunity</p>
            <h2 className="text-lg font-semibold text-zinc-950">Update saved fields</h2>
          </div>
          <button className="btn-quiet px-2" type="button" onClick={closeEditMode}>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="field-label" htmlFor={`edit-source-${opportunity.id}`}>
              Source text
            </label>
            <textarea
              className="form-input min-h-32 resize-y leading-6"
              id={`edit-source-${opportunity.id}`}
              name="source_text"
              rows="5"
              value={editForm.source_text}
              onChange={handleEditChange}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="field-label" htmlFor={`edit-platform-${opportunity.id}`}>
                Source platform
              </label>
              <input
                className="form-input"
                id={`edit-platform-${opportunity.id}`}
                name="source_platform"
                value={editForm.source_platform}
                onChange={handleEditChange}
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor={`edit-type-${opportunity.id}`}>
                Type
              </label>
              <select
                className="form-input"
                id={`edit-type-${opportunity.id}`}
                name="type"
                value={editForm.type}
                onChange={handleEditChange}
              >
                {typeOptions.map((typeOption) => (
                  <option key={typeOption.value} value={typeOption.value}>
                    {typeOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor={`edit-priority-${opportunity.id}`}>
                Priority
              </label>
              <select
                className="form-input capitalize"
                id={`edit-priority-${opportunity.id}`}
                name="priority"
                value={editForm.priority}
                onChange={handleEditChange}
              >
                {priorityOptions.map((priorityOption) => (
                  <option key={priorityOption} value={priorityOption}>
                    {priorityOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor={`edit-status-${opportunity.id}`}>
                Status
              </label>
              <select
                className="form-input"
                id={`edit-status-${opportunity.id}`}
                name="status"
                value={editForm.status}
                onChange={handleEditChange}
              >
                {statusOptions.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor={`edit-concern-${opportunity.id}`}>
              Audience concern
            </label>
            <textarea
              className="form-input min-h-24 resize-y leading-6"
              id={`edit-concern-${opportunity.id}`}
              name="audience_concern"
              rows="3"
              value={editForm.audience_concern}
              onChange={handleEditChange}
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor={`edit-reply-${opportunity.id}`}>
              Suggested reply
            </label>
            <textarea
              className="form-input min-h-24 resize-y leading-6"
              id={`edit-reply-${opportunity.id}`}
              name="suggested_reply"
              rows="3"
              value={editForm.suggested_reply}
              onChange={handleEditChange}
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor={`edit-topic-${opportunity.id}`}>
              Suggested topic
            </label>
            <input
              className="form-input"
              id={`edit-topic-${opportunity.id}`}
              name="suggested_topic"
              value={editForm.suggested_topic}
              onChange={handleEditChange}
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor={`edit-hook-${opportunity.id}`}>
              Suggested hook
            </label>
            <textarea
              className="form-input min-h-24 resize-y leading-6"
              id={`edit-hook-${opportunity.id}`}
              name="suggested_hook"
              rows="3"
              value={editForm.suggested_hook}
              onChange={handleEditChange}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
          <button className="btn-secondary" type="button" onClick={closeEditMode}>
            <X aria-hidden="true" className="h-4 w-4" />
            Cancel
          </button>
          <button
            className="btn-primary"
            type="button"
            disabled={savingEdit}
            onClick={() => handleSaveEdit(opportunity.id)}
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {savingEdit ? "Saving..." : "Save"}
          </button>
        </div>
      </article>
    );
  }

  function renderOpportunityCard(opportunity) {
    const actionIsRunning =
      reanalyzingId === opportunity.id ||
      changingStatusId === opportunity.id ||
      deletingId === opportunity.id;

    return (
      <article
        className="ui-card flex min-h-[30rem] flex-col justify-between p-5 transition hover:border-cyan-200 hover:shadow-soft"
        key={opportunity.id}
      >
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <span className="tag-pill">{getTypeLabel(opportunity.type)}</span>
              <span className={`tag-pill capitalize ${getPriorityClass(opportunity.priority)}`}>
                {opportunity.priority}
              </span>
              <span className={`tag-pill ${getStatusClass(opportunity.status)}`}>
                {opportunity.status}
              </span>
            </div>
            <span className="text-xs font-semibold text-zinc-500">
              {opportunity.source_platform || "No platform"}
            </span>
          </div>

          <blockquote className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
            {opportunity.source_text}
          </blockquote>

          <div className="mt-4 grid gap-3">
            {renderField("Audience concern", opportunity.audience_concern)}
            {renderField("Suggested reply", opportunity.suggested_reply)}
            {renderField("Suggested topic", opportunity.suggested_topic)}
            {renderField("Suggested hook", opportunity.suggested_hook)}
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-zinc-200 pt-5">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="sr-only" htmlFor={`status-${opportunity.id}`}>
              Change status
            </label>
            <select
              className="form-input"
              id={`status-${opportunity.id}`}
              value={opportunity.status}
              disabled={actionIsRunning}
              onChange={(event) => handleStatusChange(opportunity, event.target.value)}
            >
              {statusOptions.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>

            <button
              className="btn-secondary"
              type="button"
              disabled={actionIsRunning || opportunity.status === "Converted to Content"}
              onClick={() => handleConvertToContent(opportunity)}
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Convert
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <button className="btn-secondary" type="button" disabled={actionIsRunning} onClick={() => openEditMode(opportunity)}>
              <Edit3 aria-hidden="true" className="h-4 w-4" />
              Edit
            </button>
            <button className="btn-secondary" type="button" disabled={actionIsRunning} onClick={() => handleReanalyze(opportunity.id)}>
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${reanalyzingId === opportunity.id ? "animate-spin" : ""}`} />
              {reanalyzingId === opportunity.id ? "Working..." : "Reanalyze"}
            </button>
            <button className="btn-danger" type="button" disabled={actionIsRunning} onClick={() => handleDelete(opportunity.id)}>
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {deletingId === opportunity.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  function renderBoard() {
    return (
      <>
        {renderFilters()}

        {loading && (
          <p className="ui-card p-4 text-sm font-medium text-zinc-600">Loading audience opportunities...</p>
        )}

        {!loading && opportunities.length === 0 && (
          <div className="ui-card p-8 text-center">
            <ClipboardList aria-hidden="true" className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-950">No opportunities found</p>
            <p className="mt-1 text-sm text-zinc-600">Create one or clear filters to widen the results.</p>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {opportunities.map((opportunity) =>
            editingId === opportunity.id && editForm
              ? renderEditCard(opportunity)
              : renderOpportunityCard(opportunity)
          )}
        </div>
      </>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="eyebrow">Audience Intelligence</p>
        <h1 className="page-title">Audience Opportunities</h1>
        <p className="page-subtitle">
          Capture objections, questions, pain points, and feedback, then turn them into replies and content ideas.
        </p>
      </header>

      {renderMessages()}

      <div className="grid gap-6 2xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div>{renderCreateForm()}</div>
        <div className="space-y-4">{renderBoard()}</div>
      </div>
    </section>
  );
}

export default AudienceOpportunities;
