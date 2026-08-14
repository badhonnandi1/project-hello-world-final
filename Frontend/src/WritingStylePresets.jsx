import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  getWritingStylePresets,
  previewWritingStylePreset,
  createWritingStylePreset,
  updateWritingStylePreset,
  deleteWritingStylePreset,
} from "./prithula";


// ---------------------------------------------------------
// AVAILABLE ARCHETYPES
// ---------------------------------------------------------

const ARCHETYPES = [
  {
    name: "Analytical Leader",
    description:
      "Professional, analytical, confident, and focused on reasoning and evidence.",
  },
  {
    name: "Educational Expert",
    description:
      "Clear, informative, helpful, and focused on explaining useful ideas.",
  },
  {
    name: "Story-Driven Founder",
    description:
      "Personal, conversational, engaging, and focused on experiences and lessons.",
  },
  {
    name: "Concise Operator",
    description:
      "Direct, practical, efficient, and focused on actions and outcomes.",
  },
  {
    name: "Community Builder",
    description:
      "Inclusive, collaborative, conversational, and focused on shared learning.",
  },
];


// ---------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------

function WritingStylePresets({ token, onUnauthorized }) {
  const [presets, setPresets] = useState([]);

  const [selectedArchetypes, setSelectedArchetypes] = useState([]);

  const [presetName, setPresetName] = useState("");
  const [previewTopic, setPreviewTopic] = useState("");

  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingPresetId, setEditingPresetId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showCreator, setShowCreator] = useState(false);


  // -------------------------------------------------------
  // LOAD SAVED PRESETS
  // -------------------------------------------------------

  useEffect(() => {
    loadPresets();
  }, []);


  async function loadPresets() {
    setLoading(true);
    setError("");

    try {
      const data = await getWritingStylePresets(token);
      setPresets(data);
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }


  // -------------------------------------------------------
  // TOTAL PERCENTAGE
  // -------------------------------------------------------

  const totalPercentage = useMemo(() => {
    return selectedArchetypes.reduce(
      (total, item) => total + item.percentage,
      0
    );
  }, [selectedArchetypes]);


  const percentagesValid =
    selectedArchetypes.length > 0 &&
    totalPercentage === 100;


  // -------------------------------------------------------
  // SELECT / REMOVE ARCHETYPE
  // -------------------------------------------------------

  function toggleArchetype(archetypeName) {
    setError("");
    setMessage("");

    const alreadySelected = selectedArchetypes.some(
      (item) => item.archetype === archetypeName
    );

    if (alreadySelected) {
      setSelectedArchetypes((current) =>
        current.filter((item) => item.archetype !== archetypeName)
      );

      return;
    }

    setSelectedArchetypes((current) => [
      ...current,
      {
        archetype: archetypeName,
        percentage: 0,
      },
    ]);
  }


  // -------------------------------------------------------
  // CHANGE PERCENTAGE
  // -------------------------------------------------------

  function changePercentage(archetypeName, value) {
    const percentage = Math.max(
      0,
      Math.min(100, Number(value) || 0)
    );

    setSelectedArchetypes((current) =>
      current.map((item) =>
        item.archetype === archetypeName
          ? {
              ...item,
              percentage,
            }
          : item
      )
    );

    setError("");
    setMessage("");
  }


  // -------------------------------------------------------
  // GENERATE PREVIEW
  // -------------------------------------------------------

  async function handlePreview() {
    setError("");
    setMessage("");
    setPreview(null);

    if (!selectedArchetypes.length) {
      setError("Please select at least one writing archetype.");
      return;
    }

    if (totalPercentage !== 100) {
      setError("Archetype percentages must total exactly 100%.");
      return;
    }

    if (!previewTopic.trim()) {
      setError("Please enter a topic for the preview.");
      return;
    }

    setPreviewLoading(true);

    try {
      const result = await previewWritingStylePreset(token, {
        topic: previewTopic.trim(),
        archetypes: selectedArchetypes,
      });

      setPreview(result);
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
      } else {
        setError(error.message);
      }
    } finally {
      setPreviewLoading(false);
    }
  }


  // -------------------------------------------------------
  // SAVE PRESET
  // -------------------------------------------------------

  async function handleSave() {
    setError("");
    setMessage("");

    if (!presetName.trim()) {
      setError("Please enter a name for the preset.");
      return;
    }

    if (!percentagesValid) {
      setError("Archetype percentages must total exactly 100%.");
      return;
    }

    if (!preview) {
      setError("Generate a preview before saving the preset.");
      return;
    }

    setSaving(true);

    const presetData = {
      preset_name: presetName.trim(),
      preview_topic: preview.topic,
      preview_content: preview.preview_content,
      archetypes: selectedArchetypes,
    };

    try {
      if (editingPresetId) {
        const updated = await updateWritingStylePreset(
          token,
          editingPresetId,
          presetData
        );

        setPresets((current) =>
          current.map((item) =>
            item.preset_id === editingPresetId ? updated : item
          )
        );

        setMessage("Preset updated successfully.");
      } else {
        const created = await createWritingStylePreset(
          token,
          presetData
        );

        setPresets((current) => [created, ...current]);

        setMessage("Preset saved successfully.");
      }

      resetCreator();
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
      } else {
        setError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }


  // -------------------------------------------------------
  // EDIT PRESET
  // -------------------------------------------------------

  function handleEdit(preset) {
    setEditingPresetId(preset.preset_id);

    setPresetName(preset.preset_name);

    setPreviewTopic(preset.preview_topic || "");

    setSelectedArchetypes(
      preset.archetypes.map((item) => ({
        archetype: item.archetype,
        percentage: item.percentage,
      }))
    );

    setPreview(
      preset.preview_topic && preset.preview_content
        ? {
            topic: preset.preview_topic,
            preview_content: preset.preview_content,
            archetypes: preset.archetypes,
          }
        : null
    );

    setShowCreator(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  // -------------------------------------------------------
  // DELETE PRESET
  // -------------------------------------------------------

  async function handleDelete(presetId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this writing style preset?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteWritingStylePreset(token, presetId);

      setPresets((current) =>
        current.filter((item) => item.preset_id !== presetId)
      );

      setMessage("Preset deleted successfully.");
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
      } else {
        setError(error.message);
      }
    }
  }


  // -------------------------------------------------------
  // RESET CREATOR
  // -------------------------------------------------------

  function resetCreator() {
    setPresetName("");
    setPreviewTopic("");
    setSelectedArchetypes([]);
    setPreview(null);
    setEditingPresetId(null);
    setShowCreator(false);
  }


  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <section className="space-y-6">

      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Content Workflow</p>

          <h1 className="page-title">
            Writing Style Presets
          </h1>

          <p className="page-subtitle">
            Create reusable writing styles by combining different
            writing archetypes and controlling their influence.
          </p>
        </div>

        <button
          className="btn-primary shrink-0"
          type="button"
          onClick={() => {
            setShowCreator(true);
            setMessage("");
            setError("");
          }}
        >
          <Plus className="h-4 w-4" />
          Create Preset
        </button>
      </header>


      {/* MESSAGES */}
      {message && (
        <p className="status-success">
          {message}
        </p>
      )}

      {error && (
        <p className="status-error">
          {error}
        </p>
      )}


      {/* CREATOR */}
      {showCreator && (
        <div className="ui-card overflow-hidden">

          {/* CREATOR HEADER */}
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 sm:p-6">
            <div>
              <p className="eyebrow">
                {editingPresetId
                  ? "Edit Preset"
                  : "Create Preset"}
              </p>

              <h2 className="mt-1 section-title">
                Build Your Writing Style
              </h2>

              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Select one or more archetypes and decide how strongly
                each style should influence the preset.
              </p>
            </div>

            <button
              className="btn-quiet"
              type="button"
              onClick={resetCreator}
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>


          <div className="space-y-8 p-5 sm:p-6">

            {/* STEP 1 */}
            <section>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Step 1
                </p>

                <h3 className="mt-1 text-base font-semibold text-zinc-950">
                  Choose your writing archetypes
                </h3>
              </div>


              <div className="grid gap-3 md:grid-cols-2">
                {ARCHETYPES.map((archetype) => {
                  const selected = selectedArchetypes.some(
                    (item) =>
                      item.archetype === archetype.name
                  );

                  const selectedData =
                    selectedArchetypes.find(
                      (item) =>
                        item.archetype === archetype.name
                    );

                  return (
                    <div
                      className={`rounded-lg border p-4 transition ${
                        selected
                          ? "border-cyan-300 bg-cyan-50/50"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                      key={archetype.name}
                    >
                      <button
                        className="flex w-full items-start gap-3 text-left"
                        type="button"
                        onClick={() =>
                          toggleArchetype(archetype.name)
                        }
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            selected
                              ? "border-cyan-600 bg-cyan-600 text-white"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {selected && (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </span>

                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-zinc-950">
                            {archetype.name}
                          </span>

                          <span className="mt-1 block text-sm leading-5 text-zinc-600">
                            {archetype.description}
                          </span>
                        </span>
                      </button>


                      {selected && (
                        <div className="mt-4 border-t border-cyan-100 pt-4">
                          <label
                            className="field-label"
                            htmlFor={`percentage-${archetype.name}`}
                          >
                            Influence percentage
                          </label>

                          <div className="mt-2 flex items-center gap-3">
                            <input
                              className="form-input"
                              id={`percentage-${archetype.name}`}
                              type="number"
                              min="0"
                              max="100"
                              value={selectedData.percentage}
                              onChange={(event) =>
                                changePercentage(
                                  archetype.name,
                                  event.target.value
                                )
                              }
                            />

                            <span className="text-sm font-semibold text-zinc-500">
                              %
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>


            {/* STYLE BALANCE */}
            <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    Style Balance
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    All selected archetypes must total 100%.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    totalPercentage === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {totalPercentage}%
                </span>
              </div>


              {selectedArchetypes.length > 0 && (
                <div className="mt-4 space-y-3">
                  {selectedArchetypes.map((item) => (
                    <div key={item.archetype}>
                      <div className="mb-1 flex justify-between text-xs font-medium text-zinc-600">
                        <span>{item.archetype}</span>
                        <span>{item.percentage}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-cyan-600 transition-all"
                          style={{
                            width: `${item.percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}


              {selectedArchetypes.length > 0 &&
                totalPercentage !== 100 && (
                  <p className="mt-4 text-sm font-medium text-rose-700">
                    {totalPercentage < 100
                      ? `Add ${
                          100 - totalPercentage
                        }% more.`
                      : `Reduce ${
                          totalPercentage - 100
                        }%.`}
                  </p>
                )}
            </section>


            {/* STEP 2 */}
            <section>
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Step 2
                </p>

                <h3 className="mt-1 text-base font-semibold text-zinc-950">
                  Enter a topic for the style preview
                </h3>

                <p className="mt-1 text-sm text-zinc-600">
                  The system will generate a short rule-based
                  example using your selected style.
                </p>
              </div>

              <textarea
                className="form-input min-h-28 resize-y"
                placeholder="Example: How AI is changing software development"
                value={previewTopic}
                onChange={(event) =>
                  setPreviewTopic(event.target.value)
                }
              />
            </section>


            {/* PREVIEW BUTTON */}
            <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
              <button
                className="btn-primary"
                type="button"
                disabled={
                  previewLoading ||
                  !percentagesValid ||
                  !previewTopic.trim()
                }
                onClick={handlePreview}
              >
                <Sparkles className="h-4 w-4" />

                {previewLoading
                  ? "Generating Preview..."
                  : "Generate Style Preview"}
              </button>
            </div>


            {/* PREVIEW RESULT */}
            {preview && (
              <section className="rounded-lg border border-cyan-200 bg-cyan-50/40">

                <div className="border-b border-cyan-100 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
                      <Palette className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                        Style Preview
                      </p>

                      <h3 className="mt-1 text-base font-semibold text-zinc-950">
                        Generated writing sample
                      </h3>
                    </div>
                  </div>
                </div>


                <div className="space-y-5 p-5">

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Topic
                    </p>

                    <p className="mt-1 text-sm font-medium text-zinc-950">
                      {preview.topic}
                    </p>
                  </div>


                  <div className="rounded-lg border border-zinc-200 bg-white p-5">
                    <p className="whitespace-pre-line text-sm leading-7 text-zinc-700">
                      {preview.preview_content}
                    </p>
                  </div>


                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Style Composition
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {preview.archetypes.map((item) => (
                        <span
                          className="tag-pill"
                          key={item.archetype}
                        >
                          {item.archetype} · {item.percentage}%
                        </span>
                      ))}
                    </div>
                  </div>


                  {/* SAVE */}
                  <div className="border-t border-zinc-200 pt-5">

                    <label
                      className="field-label"
                      htmlFor="preset-name"
                    >
                      Preset Name
                    </label>

                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                      <input
                        className="form-input"
                        id="preset-name"
                        placeholder="Example: Executive Thought Leadership"
                        value={presetName}
                        onChange={(event) =>
                          setPresetName(event.target.value)
                        }
                      />

                      <button
                        className="btn-primary shrink-0"
                        type="button"
                        disabled={saving}
                        onClick={handleSave}
                      >
                        <Save className="h-4 w-4" />

                        {saving
                          ? "Saving..."
                          : editingPresetId
                            ? "Update Preset"
                            : "Save Preset"}
                      </button>
                    </div>
                  </div>

                </div>
              </section>
            )}

          </div>
        </div>
      )}


      {/* SAVED PRESETS */}
      <section>

        <div className="mb-4">
          <p className="eyebrow">
            Saved Styles
          </p>

          <h2 className="mt-1 section-title">
            Your Writing Presets
          </h2>
        </div>


        {loading ? (
          <div className="ui-card flex min-h-40 items-center justify-center p-6 text-sm font-medium text-zinc-600">
            Loading presets...
          </div>
        ) : presets.length === 0 ? (
          <div className="ui-card p-8 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
              <Palette className="h-5 w-5" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-zinc-950">
              No writing style presets yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
              Create your first preset by combining one or more
              writing archetypes.
            </p>

            <button
              className="btn-primary mt-5"
              type="button"
              onClick={() => setShowCreator(true)}
            >
              <Plus className="h-4 w-4" />
              Create Your First Preset
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">

            {presets.map((preset) => (
              <article
                className="ui-card p-5"
                key={preset.preset_id}
              >

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <h3 className="text-base font-semibold text-zinc-950">
                      {preset.preset_name}
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500">
                      Created{" "}
                      {new Date(
                        preset.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      className="btn-quiet"
                      type="button"
                      title="Edit preset"
                      onClick={() =>
                        handleEdit(preset)
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      className="btn-quiet text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      type="button"
                      title="Delete preset"
                      onClick={() =>
                        handleDelete(preset.preset_id)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                </div>


                <div className="mt-4 flex flex-wrap gap-2">
                  {preset.archetypes.map((item) => (
                    <span
                      className="tag-pill"
                      key={item.id}
                    >
                      {item.archetype} · {item.percentage}%
                    </span>
                  ))}
                </div>


                {preset.preview_topic && (
                  <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">

                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Preview Topic
                    </p>

                    <p className="mt-1 text-sm font-medium text-zinc-800">
                      {preset.preview_topic}
                    </p>

                  </div>
                )}

              </article>
            ))}

          </div>
        )}

      </section>

    </section>
  );
}

export default WritingStylePresets;