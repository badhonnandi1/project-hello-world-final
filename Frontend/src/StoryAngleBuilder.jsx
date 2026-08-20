import { useState } from "react";
import {
  BookOpen,
  Copy,
  FileText,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { createKnowledgeItem, generateStoryAngle } from "./badhon";


const categoryOptions = [
  { value: "", label: "All categories" },
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

const confidentialityOptions = [
  { value: "", label: "All levels" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "internal", label: "Internal" },
];

const initialForm = {
  topic: "",
  audience: "",
  goal: "",
  category: "",
  confidentiality_level: "",
  max_sources: 4,
};


function StoryAngleBuilder({ token, onUnauthorized }) {
  const [formData, setFormData] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleApiError(apiError) {
    if (apiError.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }

    setError(apiError.message);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  }

  function buildPayload() {
    return {
      topic: formData.topic.trim(),
      audience: formData.audience.trim() || null,
      goal: formData.goal.trim() || null,
      category: formData.category || null,
      confidentiality_level: formData.confidentiality_level || null,
      max_sources: Number(formData.max_sources),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.topic.trim()) {
      setError("Topic is required.");
      return;
    }

    setLoading(true);

    try {
      const data = await generateStoryAngle(token, buildPayload());
      setResult(data);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setLoading(false);
    }
  }

  function buildSavedAngleContent() {
    const sourceTitles = (result.sources || [])
      .map((source) => `- ${source.title}`)
      .join("\n");

    return [
      `Topic: ${result.topic}`,
      `Hook: ${result.answer.hook}`,
      `Angle: ${result.answer.angle}`,
      "",
      "Outline:",
      ...result.answer.outline.map((item) => `- ${item}`),
      "",
      `CTA: ${result.answer.cta}`,
      "",
      "Draft seed:",
      result.answer.draft_seed,
      "",
      "Retrieved sources:",
      sourceTitles || "- No matching sources found",
    ].join("\n");
  }

  async function handleSaveAngle() {
    if (!result) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      await createKnowledgeItem(token, {
        title: `Story angle: ${result.answer.title}`,
        content: buildSavedAngleContent(),
        category: "other",
        tags: ["rag", "story-angle", result.topic.toLowerCase()],
        item_date: null,
        confidentiality_level: "private",
      });
      setSuccessMessage("Story angle saved to your Knowledge Vault.");
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyAngle() {
    if (!result || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(buildSavedAngleContent());
    setSuccessMessage("Story angle copied.");
  }

  function renderMessages() {
    return (
      <div aria-live="polite" className="space-y-3">
        {successMessage && <p className="status-success">{successMessage}</p>}
        {error && <p className="status-error">{error}</p>}
      </div>
    );
  }

  function renderSource(source) {
    return (
      <article className="ui-card p-4" key={source.item_id}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">{source.title}</h3>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              Match score: {source.match_score}%
            </p>
          </div>
          <span className="tag-pill capitalize">{source.confidentiality_level || "private"}</span>
        </div>

        <p className="mt-3 text-sm leading-6 text-zinc-600">{source.snippet}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {source.category && <span className="tag-pill">{source.category}</span>}
          {(source.tags || []).slice(0, 4).map((tag) => (
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-800" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        {source.match_reasons.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs leading-5 text-zinc-500">
            {source.match_reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </article>
    );
  }

  function renderResult() {
    if (!result) {
      return (
        <section className="ui-card flex min-h-[28rem] items-center justify-center p-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <WandSparkles aria-hidden="true" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-zinc-950">Build an angle from saved knowledge</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Enter a topic and the builder will retrieve useful vault items, then turn them into a grounded LinkedIn angle.
            </p>
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-4">
        <article className="ui-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Generated Angle</p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-950">{result.answer.title}</h2>
            </div>
            <span className="tag-pill">{result.source_count} sources</span>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Hook</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-zinc-950">{result.answer.hook}</p>
            </div>

            <div>
              <p className="field-label">Angle</p>
              <p className="mt-2 text-sm leading-7 text-zinc-700">{result.answer.angle}</p>
            </div>

            <div>
              <p className="field-label">Outline</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-700">
                {result.answer.outline.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>

            <div>
              <p className="field-label">Draft Seed</p>
              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-700">
                {result.answer.draft_seed}
              </p>
            </div>

            <div>
              <p className="field-label">CTA</p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">{result.answer.cta}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
            <button className="btn-secondary" type="button" onClick={handleCopyAngle}>
              <Copy aria-hidden="true" className="h-4 w-4" />
              Copy
            </button>
            <button className="btn-primary" type="button" onClick={handleSaveAngle} disabled={saving}>
              <Save aria-hidden="true" className="h-4 w-4" />
              {saving ? "Saving..." : "Save to Vault"}
            </button>
          </div>
        </article>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen aria-hidden="true" className="h-4 w-4 text-cyan-700" />
            <h2 className="section-title">Retrieved Sources</h2>
          </div>

          {result.sources.length === 0 ? (
            <p className="ui-card p-4 text-sm text-zinc-600">
              No matching vault items found. Add a related Knowledge Vault item and run the builder again.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">{result.sources.map(renderSource)}</div>
          )}
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="eyebrow">RAG Workspace</p>
        <h1 className="page-title">Story Angle Builder</h1>
        <p className="page-subtitle">
          Retrieve relevant Knowledge Vault items and turn them into a source-backed LinkedIn post angle.
        </p>
      </header>

      {renderMessages()}

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <form className="ui-card h-fit space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 border-b border-zinc-200 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="section-title">Angle Brief</h2>
              <p className="text-sm text-zinc-600">Simple topic in, grounded angle out.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="angle-topic">Topic</label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                className="form-input pl-10"
                id="angle-topic"
                name="topic"
                type="text"
                value={formData.topic}
                onChange={handleChange}
                placeholder="e.g. first internship lesson"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="angle-audience">Audience</label>
            <input
              className="form-input"
              id="angle-audience"
              name="audience"
              type="text"
              value={formData.audience}
              onChange={handleChange}
              placeholder="e.g. junior developers"
            />
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="angle-goal">Post Goal</label>
            <input
              className="form-input"
              id="angle-goal"
              name="goal"
              type="text"
              value={formData.goal}
              onChange={handleChange}
              placeholder="e.g. teach a practical lesson"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="space-y-2">
              <label className="field-label" htmlFor="angle-category">Source Category</label>
              <select
                className="form-input"
                id="angle-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="angle-confidentiality">Confidentiality</label>
              <select
                className="form-input"
                id="angle-confidentiality"
                name="confidentiality_level"
                value={formData.confidentiality_level}
                onChange={handleChange}
              >
                {confidentialityOptions.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="field-label" htmlFor="angle-max-sources">Sources to retrieve</label>
            <select
              className="form-input"
              id="angle-max-sources"
              name="max_sources"
              value={formData.max_sources}
              onChange={handleChange}
            >
              {[2, 3, 4, 5, 6].map((count) => (
                <option key={count} value={count}>
                  {count} sources
                </option>
              ))}
            </select>
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? (
              <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <FileText aria-hidden="true" className="h-4 w-4" />
            )}
            {loading ? "Building..." : "Build Angle"}
          </button>
        </form>

        {renderResult()}
      </div>
    </section>
  );
}

export default StoryAngleBuilder;
