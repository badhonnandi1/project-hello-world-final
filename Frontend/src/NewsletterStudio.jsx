import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit3,
  Eye,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import {
  createNewsletter,
  deleteNewsletter,
  generateNewsletter,
  getMyNewsletterCreator,
  getNewsletter,
  getNewsletters,
  joinNewsletterCreator,
  publishNewsletter,
  updateMyNewsletterCreator,
  updateNewsletter,
} from "./badhon";


const emptyCreatorForm = {
  display_name: "",
  bio: "",
  topic: "",
  is_active: true,
};

const emptyNewsletterForm = {
  title: "",
  source_content: "",
};


function formatDate(value) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}


function getStatusClasses(newsletterStatus) {
  if (newsletterStatus === "Published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (newsletterStatus === "Generated") {
    return "border-cyan-200 bg-cyan-50 text-cyan-800";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}


// This page manages creator enrollment and the complete owned-newsletter workflow.
function NewsletterStudio({ token, onUnauthorized }) {
  const [creator, setCreator] = useState(null);
  const [creatorForm, setCreatorForm] = useState(emptyCreatorForm);
  const [editingCreator, setEditingCreator] = useState(false);
  const [newsletters, setNewsletters] = useState([]);
  const [selectedNewsletter, setSelectedNewsletter] = useState(null);
  const [newsletterForm, setNewsletterForm] = useState(emptyNewsletterForm);
  const [mode, setMode] = useState("list");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCreator, setSavingCreator] = useState(false);
  const [savingNewsletter, setSavingNewsletter] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");

  function readableError(apiError) {
    return typeof apiError?.message === "string"
      ? apiError.message
      : "The request could not be completed.";
  }

  function handleApiError(apiError) {
    if (apiError.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }

    setError(readableError(apiError));
  }

  function setCreatorState(savedCreator) {
    setCreator(savedCreator);
    setCreatorForm({
      display_name: savedCreator.display_name || "",
      bio: savedCreator.bio || "",
      topic: savedCreator.topic || "",
      is_active: Boolean(savedCreator.is_active),
    });
  }

  async function loadNewsletters(showRefreshState = true) {
    if (showRefreshState) {
      setRefreshing(true);
    }

    try {
      const savedNewsletters = await getNewsletters(token);
      setNewsletters(savedNewsletters);
      return savedNewsletters;
    } catch (apiError) {
      handleApiError(apiError);
      return [];
    } finally {
      if (showRefreshState) {
        setRefreshing(false);
      }
    }
  }

  async function loadStudio() {
    setLoading(true);
    setError("");

    try {
      const savedCreator = await getMyNewsletterCreator(token);
      setCreatorState(savedCreator);
      await loadNewsletters(false);
    } catch (apiError) {
      if (apiError.status === 404) {
        setCreator(null);
        setCreatorForm(emptyCreatorForm);
        setNewsletters([]);
      } else {
        handleApiError(apiError);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudio();
  }, []);

  function handleCreatorChange(event) {
    const { checked, name, type, value } = event.target;
    setCreatorForm({
      ...creatorForm,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  async function handleCreatorSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (
      !creatorForm.display_name.trim()
      || !creatorForm.bio.trim()
      || !creatorForm.topic.trim()
    ) {
      setError("Display name, bio, and topic are required.");
      return;
    }

    setSavingCreator(true);
    const creatorData = {
      display_name: creatorForm.display_name.trim(),
      bio: creatorForm.bio.trim(),
      topic: creatorForm.topic.trim(),
    };

    try {
      const savedCreator = creator
        ? await updateMyNewsletterCreator(token, {
            ...creatorData,
            is_active: creatorForm.is_active,
          })
        : await joinNewsletterCreator(token, creatorData);
      setCreatorState(savedCreator);
      setEditingCreator(false);
      setSuccessMessage(
        creator
          ? "Creator profile updated successfully."
          : "You joined the creator directory successfully.",
      );
      await loadNewsletters(false);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setSavingCreator(false);
    }
  }

  function cancelCreatorEdit() {
    setCreatorState(creator);
    setEditingCreator(false);
    setError("");
  }

  function openListMode() {
    setMode("list");
    setSelectedNewsletter(null);
    setNewsletterForm(emptyNewsletterForm);
    setPreviewSubject("");
    setError("");
  }

  function openCreateMode() {
    setMode("create");
    setSelectedNewsletter(null);
    setNewsletterForm(emptyNewsletterForm);
    setPreviewSubject("");
    setError("");
    setSuccessMessage("");
  }

  function openEditMode(newsletter) {
    if (newsletter.status === "Published") {
      return;
    }

    setSelectedNewsletter(newsletter);
    setNewsletterForm({
      title: newsletter.title || "",
      source_content: newsletter.source_content || "",
    });
    setMode("edit");
    setPreviewSubject("");
    setError("");
    setSuccessMessage("");
  }

  async function openViewMode(newsletterId) {
    setError("");
    setPreviewSubject("");

    try {
      const savedNewsletter = await getNewsletter(token, newsletterId);
      setSelectedNewsletter(savedNewsletter);
      setMode("view");
    } catch (apiError) {
      handleApiError(apiError);
    }
  }

  function handleNewsletterChange(event) {
    const { name, value } = event.target;
    setNewsletterForm({
      ...newsletterForm,
      [name]: value,
    });
  }

  async function handleNewsletterSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!newsletterForm.title.trim() || !newsletterForm.source_content.trim()) {
      setError("Newsletter title and source content are required.");
      return;
    }

    setSavingNewsletter(true);
    const newsletterData = {
      title: newsletterForm.title.trim(),
      source_content: newsletterForm.source_content.trim(),
    };

    try {
      if (mode === "create") {
        await createNewsletter(token, newsletterData);
        setSuccessMessage("Newsletter draft created successfully.");
      } else {
        await updateNewsletter(token, selectedNewsletter.id, newsletterData);
        setSuccessMessage("Newsletter updated and returned to Draft.");
      }

      openListMode();
      await loadNewsletters(false);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setSavingNewsletter(false);
    }
  }

  async function handleDelete(newsletter) {
    const confirmed = window.confirm(
      `Delete “${newsletter.title}”? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await deleteNewsletter(token, newsletter.id);
      setSuccessMessage("Newsletter deleted successfully.");
      openListMode();
      await loadNewsletters(false);
    } catch (apiError) {
      handleApiError(apiError);
    }
  }

  async function handleGenerate(newsletter) {
    setGeneratingId(newsletter.id);
    setError("");
    setSuccessMessage("");
    setPreviewSubject("");

    try {
      const result = await generateNewsletter(token, newsletter.id);
      setSelectedNewsletter(result.newsletter);
      setPreviewSubject(result.subject);
      setMode("view");
      setSuccessMessage("A new newsletter preview was generated.");
      await loadNewsletters(false);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setGeneratingId(null);
    }
  }

  async function handlePublish(newsletter) {
    const confirmed = window.confirm(
      "Publish this newsletter and email every active subscriber now?",
    );
    if (!confirmed) {
      return;
    }

    setPublishingId(newsletter.id);
    setError("");
    setSuccessMessage("");

    try {
      const result = await publishNewsletter(token, newsletter.id);
      setSelectedNewsletter(result.newsletter);
      setMode("view");
      setPreviewSubject("");
      setSuccessMessage(
        `Newsletter published successfully. Delivered to ${result.delivery_count} subscriber${
          result.delivery_count === 1 ? "" : "s"
        }.`,
      );
      await loadNewsletters(false);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setPublishingId(null);
    }
  }

  function renderCreatorForm(isJoinForm = false) {
    return (
      <form className="ui-card max-w-3xl space-y-5 p-5 sm:p-6" onSubmit={handleCreatorSubmit}>
        <div>
          <p className="eyebrow">{isJoinForm ? "Creator Enrollment" : "Directory Profile"}</p>
          <h2 className="section-title mt-2">
            {isJoinForm ? "Join as a newsletter writer" : "Edit creator profile"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            This public information helps readers understand what you publish.
          </p>
        </div>

        <div className="space-y-2">
          <label className="field-label" htmlFor="creator-display-name">Display Name</label>
          <input
            className="form-input"
            id="creator-display-name"
            name="display_name"
            type="text"
            maxLength="255"
            value={creatorForm.display_name}
            onChange={handleCreatorChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="field-label" htmlFor="creator-bio">Short Bio</label>
          <textarea
            className="form-input min-h-28 resize-y"
            id="creator-bio"
            name="bio"
            maxLength="2000"
            value={creatorForm.bio}
            onChange={handleCreatorChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="field-label" htmlFor="creator-topic">Main Newsletter Topic</label>
          <input
            className="form-input"
            id="creator-topic"
            name="topic"
            type="text"
            maxLength="255"
            value={creatorForm.topic}
            onChange={handleCreatorChange}
            required
          />
        </div>

        {!isJoinForm && (
          <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <input
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
              name="is_active"
              type="checkbox"
              checked={creatorForm.is_active}
              onChange={handleCreatorChange}
            />
            <span>
              <span className="block font-semibold text-zinc-950">Active in creator directory</span>
              <span className="mt-1 block leading-5">
                Inactive creators are hidden from discovery and cannot publish newsletters.
              </span>
            </span>
          </label>
        )}

        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
          {!isJoinForm && (
            <button className="btn-secondary" type="button" onClick={cancelCreatorEdit}>
              <X aria-hidden="true" className="h-4 w-4" />
              Cancel
            </button>
          )}
          <button className="btn-primary" type="submit" disabled={savingCreator}>
            {isJoinForm ? <UserPlus aria-hidden="true" className="h-4 w-4" /> : <Save aria-hidden="true" className="h-4 w-4" />}
            {savingCreator ? "Saving..." : isJoinForm ? "Join as Writer" : "Save Profile"}
          </button>
        </div>
      </form>
    );
  }

  function renderNewsletterForm() {
    const isEditing = mode === "edit";

    return (
      <section className="space-y-5">
        <button className="btn-quiet" type="button" onClick={openListMode}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to newsletters
        </button>

        <form className="ui-card max-w-4xl space-y-5 p-5 sm:p-6" onSubmit={handleNewsletterSubmit}>
          <div>
            <p className="eyebrow">{isEditing ? "Edit Draft" : "New Newsletter"}</p>
            <h2 className="section-title mt-2">
              {isEditing ? "Update source material" : "Create a newsletter draft"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Writers edit the source. Generated email content remains read-only and is replaced when you regenerate.
            </p>
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="newsletter-title">Newsletter Title</label>
            <input
              className="form-input"
              id="newsletter-title"
              name="title"
              type="text"
              maxLength="255"
              value={newsletterForm.title}
              onChange={handleNewsletterChange}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="newsletter-source">Source Content</label>
            <textarea
              className="form-input min-h-64 resize-y"
              id="newsletter-source"
              name="source_content"
              value={newsletterForm.source_content}
              onChange={handleNewsletterChange}
              placeholder="Add the facts, ideas, stories, and context Gemini may use."
              required
            />
          </div>

          {isEditing && selectedNewsletter?.status === "Generated" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Saving source changes will clear the generated preview and return this newsletter to Draft.
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
            <button className="btn-secondary" type="button" onClick={openListMode}>
              Cancel
            </button>
            <button className="btn-primary" type="submit" disabled={savingNewsletter}>
              <Save aria-hidden="true" className="h-4 w-4" />
              {savingNewsletter ? "Saving..." : isEditing ? "Save Changes" : "Create Draft"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderNewsletterView() {
    if (!selectedNewsletter) {
      return null;
    }

    const canGenerate = selectedNewsletter.status !== "Published";
    const canPublish = selectedNewsletter.status === "Generated" && creator.is_active;

    return (
      <section className="space-y-5">
        <button className="btn-quiet" type="button" onClick={openListMode}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to newsletters
        </button>

        <article className="ui-card overflow-hidden">
          <div className="border-b border-zinc-200 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="eyebrow">Newsletter Details</p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-950">{selectedNewsletter.title}</h2>
              </div>
              <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(selectedNewsletter.status)}`}>
                {selectedNewsletter.status}
              </span>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="font-medium text-zinc-500">Created</dt>
                <dd className="mt-1 text-zinc-800">{formatDate(selectedNewsletter.created_at)}</dd>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="font-medium text-zinc-500">Updated</dt>
                <dd className="mt-1 text-zinc-800">{formatDate(selectedNewsletter.updated_at)}</dd>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3">
                <dt className="font-medium text-zinc-500">Published</dt>
                <dd className="mt-1 text-zinc-800">{formatDate(selectedNewsletter.published_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <section>
              <h3 className="section-title">Source Content</h3>
              <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7 text-zinc-700">
                {selectedNewsletter.source_content}
              </p>
            </section>

            <section>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="section-title">Generated Email Preview</h3>
                {previewSubject && (
                  <span className="tag-pill">Subject: {previewSubject}</span>
                )}
              </div>
              {selectedNewsletter.generated_content ? (
                <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-cyan-100 bg-cyan-50/60 p-4 text-sm leading-7 text-zinc-800">
                  {selectedNewsletter.generated_content}
                </p>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
                  Generate a preview when your title and source content are ready.
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 p-5 sm:flex-row sm:flex-wrap sm:justify-end">
            {selectedNewsletter.status !== "Published" && (
              <button className="btn-secondary" type="button" onClick={() => openEditMode(selectedNewsletter)}>
                <Edit3 aria-hidden="true" className="h-4 w-4" />
                Edit Source
              </button>
            )}
            {canGenerate && (
              <button
                className="btn-secondary"
                type="button"
                onClick={() => handleGenerate(selectedNewsletter)}
                disabled={generatingId === selectedNewsletter.id || publishingId !== null}
              >
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                {generatingId === selectedNewsletter.id ? "Generating..." : "Generate Preview"}
              </button>
            )}
            {selectedNewsletter.status === "Generated" && (
              <button
                className="btn-primary"
                type="button"
                onClick={() => handlePublish(selectedNewsletter)}
                disabled={!canPublish || publishingId === selectedNewsletter.id || generatingId !== null}
                title={!creator.is_active ? "Activate your creator profile before publishing." : undefined}
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                {publishingId === selectedNewsletter.id ? "Publishing..." : "Publish & Email"}
              </button>
            )}
            <button className="btn-danger" type="button" onClick={() => handleDelete(selectedNewsletter)}>
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Delete
            </button>
          </div>
        </article>
      </section>
    );
  }

  function renderNewsletterList() {
    return (
      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Your Newsletters</h2>
            <p className="mt-1 text-sm text-zinc-600">Create, generate, review, and publish from one workspace.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="btn-secondary" type="button" onClick={() => loadNewsletters()} disabled={refreshing}>
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button className="btn-primary" type="button" onClick={openCreateMode}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              New Newsletter
            </button>
          </div>
        </div>

        {newsletters.length === 0 ? (
          <div className="ui-card p-8 text-center">
            <Mail aria-hidden="true" className="mx-auto h-10 w-10 text-zinc-300" />
            <h3 className="mt-4 text-base font-semibold text-zinc-950">No newsletters yet</h3>
            <p className="mt-2 text-sm text-zinc-600">Create a draft to begin your first newsletter.</p>
            <button className="btn-primary mt-5" type="button" onClick={openCreateMode}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Create Draft
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {newsletters.map((newsletter) => (
              <article className="ui-card flex flex-col p-5" key={newsletter.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-zinc-950">{newsletter.title}</h3>
                    <p className="mt-1 text-xs text-zinc-500">Updated {formatDate(newsletter.updated_at)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(newsletter.status)}`}>
                    {newsletter.status}
                  </span>
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-600">
                  {newsletter.generated_content || newsletter.source_content}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
                  <div>
                    <dt className="font-semibold text-zinc-600">Created</dt>
                    <dd className="mt-1">{formatDate(newsletter.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-zinc-600">Published</dt>
                    <dd className="mt-1">{formatDate(newsletter.published_at)}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
                  <button className="btn-secondary" type="button" onClick={() => openViewMode(newsletter.id)}>
                    <Eye aria-hidden="true" className="h-4 w-4" />
                    View
                  </button>
                  {newsletter.status !== "Published" && (
                    <button className="btn-quiet" type="button" onClick={() => openEditMode(newsletter)}>
                      <Edit3 aria-hidden="true" className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                  <button className="btn-quiet text-rose-700 hover:bg-rose-50" type="button" onClick={() => handleDelete(newsletter)}>
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (loading) {
    return (
      <div className="ui-card flex min-h-72 items-center justify-center p-6 text-sm font-medium text-zinc-600">
        Loading Newsletter Studio...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="eyebrow">Creator Workspace</p>
        <h1 className="page-title">Newsletter Studio</h1>
        <p className="page-subtitle">
          Shape source material into grounded newsletter previews, then publish to active subscribers.
        </p>
      </header>

      <div aria-live="polite" className="space-y-3">
        {successMessage && <p className="status-success">{successMessage}</p>}
        {error && <p className="status-error">{error}</p>}
      </div>

      {!creator ? (
        renderCreatorForm(true)
      ) : (
        <>
          {editingCreator ? (
            renderCreatorForm(false)
          ) : (
            <section className="ui-card p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-950">{creator.display_name}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      creator.is_active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-zinc-200 bg-zinc-100 text-zinc-600"
                    }`}>
                      {creator.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-cyan-700">{creator.topic}</p>
                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-zinc-600">{creator.bio}</p>
                </div>
                <button className="btn-secondary shrink-0" type="button" onClick={() => setEditingCreator(true)}>
                  <Edit3 aria-hidden="true" className="h-4 w-4" />
                  Edit Profile
                </button>
              </div>
              {!creator.is_active && (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Your directory profile is inactive. You can draft and generate, but publishing is disabled.
                </p>
              )}
            </section>
          )}

          {mode === "list" && renderNewsletterList()}
          {(mode === "create" || mode === "edit") && renderNewsletterForm()}
          {mode === "view" && renderNewsletterView()}
        </>
      )}
    </section>
  );
}


export default NewsletterStudio;
