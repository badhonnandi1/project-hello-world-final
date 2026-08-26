import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Power,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  checkPrivacyGuardrails,
  createPrivacyGuardrail,
  deletePrivacyGuardrail,
  getPrivacyGuardrails,
  togglePrivacyGuardrail,
  updatePrivacyGuardrail,
} from "./prithula";


function PrivacyGuardrails({ token, onUnauthorized }) {
  // ---------------------------------------------------------
  // STATE
  // ---------------------------------------------------------

  const [guardrails, setGuardrails] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // This temporary text is used to test the rule checker.
  // Later, Post Generation Studio can send Gemini-generated text
  // through the same backend checking logic.
  const [checkText, setCheckText] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const emptyForm = {
    rule_name: "",
    rule_type: "confidential",
    rule_value: "",
    severity: "medium",
    action: "warn",
  };

  const [formData, setFormData] = useState(emptyForm);


  // ---------------------------------------------------------
  // LOAD GUARDRAILS
  // ---------------------------------------------------------

  useEffect(() => {
    loadGuardrails();
  }, []);


  async function loadGuardrails() {
    setLoading(true);
    setError("");

    try {
      const data = await getPrivacyGuardrails(token);
      setGuardrails(data);
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


  // ---------------------------------------------------------
  // FORM HANDLING
  // ---------------------------------------------------------

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }


  function openCreateForm() {
    setEditingRule(null);
    setFormData(emptyForm);

    setShowForm(true);
    setMessage("");
    setError("");
  }


  function openEditForm(rule) {
    setEditingRule(rule);

    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      rule_value: rule.rule_value,
      severity: rule.severity,
      action: rule.action,
    });

    setShowForm(true);
    setMessage("");
    setError("");
  }


  function closeForm() {
    setShowForm(false);
    setEditingRule(null);
    setFormData(emptyForm);
  }


  // ---------------------------------------------------------
  // CREATE OR UPDATE RULE
  // ---------------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!formData.rule_name.trim()) {
      setError("Rule name is required.");
      return;
    }

    if (!formData.rule_value.trim()) {
      setError("Rule value is required.");
      return;
    }

    setSaving(true);

    try {
      if (editingRule) {
        const updatedRule = await updatePrivacyGuardrail(
          token,
          editingRule.rule_id,
          {
            rule_name: formData.rule_name.trim(),
            rule_type: formData.rule_type,
            rule_value: formData.rule_value.trim(),
            severity: formData.severity,
            action: formData.action,
          }
        );

        setGuardrails((currentRules) =>
          currentRules.map((rule) =>
            rule.rule_id === updatedRule.rule_id
              ? updatedRule
              : rule
          )
        );

        setMessage("Privacy Guardrail updated successfully.");
      } else {
        const newRule = await createPrivacyGuardrail(
          token,
          {
            rule_name: formData.rule_name.trim(),
            rule_type: formData.rule_type,
            rule_value: formData.rule_value.trim(),
            severity: formData.severity,
            action: formData.action,
          }
        );

        // Add the newly created rule to the beginning because
        // the backend returns rules ordered by newest first.
        setGuardrails((currentRules) => [
          newRule,
          ...currentRules,
        ]);

        setMessage("Privacy Guardrail created successfully.");
      }

      closeForm();
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


  // ---------------------------------------------------------
  // TOGGLE ACTIVE / DISABLED
  // ---------------------------------------------------------

  async function handleToggle(rule) {
    setActionLoadingId(rule.rule_id);
    setError("");
    setMessage("");

    try {
      const updatedRule = await togglePrivacyGuardrail(
        token,
        rule.rule_id
      );

      setGuardrails((currentRules) =>
        currentRules.map((currentRule) =>
          currentRule.rule_id === updatedRule.rule_id
            ? updatedRule
            : currentRule
        )
      );

      setMessage(
        updatedRule.is_active
          ? "Privacy Guardrail enabled successfully."
          : "Privacy Guardrail disabled successfully."
      );
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
      } else {
        setError(error.message);
      }
    } finally {
      setActionLoadingId(null);
    }
  }


  // ---------------------------------------------------------
  // DELETE RULE
  // ---------------------------------------------------------

  async function handleDelete(rule) {
    const confirmed = window.confirm(
      `Delete the rule "${rule.rule_name}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(rule.rule_id);
    setError("");
    setMessage("");

    try {
      await deletePrivacyGuardrail(
        token,
        rule.rule_id
      );

      setGuardrails((currentRules) =>
        currentRules.filter(
          (currentRule) =>
            currentRule.rule_id !== rule.rule_id
        )
      );

      setMessage("Privacy Guardrail deleted successfully.");

      // If the user deletes the rule currently being edited,
      // close the form.
      if (editingRule?.rule_id === rule.rule_id) {
        closeForm();
      }
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
      } else {
        setError(error.message);
      }
    } finally {
      setActionLoadingId(null);
    }
  }


  // ---------------------------------------------------------
  // CHECK TEXT AGAINST ACTIVE RULES
  // ---------------------------------------------------------

  async function handleCheckText() {
    setError("");
    setMessage("");
    setCheckResult(null);

    if (!checkText.trim()) {
      setError("Enter some text before checking Privacy Guardrails.");
      return;
    }

    setChecking(true);

    try {
      const result = await checkPrivacyGuardrails(
        token,
        checkText.trim()
      );

      setCheckResult(result);
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
      } else {
        setError(error.message);
      }
    } finally {
      setChecking(false);
    }
  }


  // ---------------------------------------------------------
  // HELPER FUNCTIONS
  // ---------------------------------------------------------

  function getRuleTypeLabel(ruleType) {
    const labels = {
      confidential: "Confidential",
      forbidden_phrase: "Forbidden Phrase",
      prohibited_topic: "Prohibited Topic",
      competitor: "Competitor",
    };

    return labels[ruleType] || ruleType;
  }


  function getSeverityClass(severity) {
    if (severity === "high") {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    if (severity === "medium") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }


  function getDecisionClass(decision) {
    if (decision === "block") {
      return "border-rose-200 bg-rose-50 text-rose-800";
    }

    if (decision === "warn") {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }

    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }


  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <section className="space-y-6">
        <header>
          <p className="eyebrow">Content Safety</p>
          <h1 className="page-title">Privacy Guardrails</h1>
        </header>

        <div className="ui-card flex min-h-[18rem] items-center justify-center gap-3 p-6 text-sm font-medium text-zinc-600">
          <Loader2
            aria-hidden="true"
            className="h-5 w-5 animate-spin"
          />
          Loading Privacy Guardrails...
        </div>
      </section>
    );
  }


  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <section className="space-y-6">

      {/* -------------------------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------------------------- */}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Content Safety</p>

          <h1 className="page-title">
            Privacy Guardrails
          </h1>

          <p className="page-subtitle">
            Create rules that detect sensitive information,
            forbidden phrases, prohibited topics, and competitor
            references before generated content is used.
          </p>
        </div>

        <button
          className="btn-primary shrink-0"
          type="button"
          onClick={openCreateForm}
          disabled={showForm}
        >
          <Plus
            aria-hidden="true"
            className="h-4 w-4"
          />
          Add Rule
        </button>
      </header>


      {/* -------------------------------------------------- */}
      {/* SUCCESS / ERROR MESSAGES */}
      {/* -------------------------------------------------- */}

      <div
        aria-live="polite"
        className="space-y-3"
      >
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
      </div>


      {/* -------------------------------------------------- */}
      {/* CREATE / EDIT FORM */}
      {/* -------------------------------------------------- */}

      {showForm && (
        <section className="ui-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="section-title">
                {editingRule
                  ? "Edit Privacy Guardrail"
                  : "Create Privacy Guardrail"}
              </h2>

              <p className="mt-1 text-sm text-zinc-600">
                Configure the text or topic that should be checked
                in generated content.
              </p>
            </div>

            <button
              aria-label="Close form"
              className="btn-quiet self-start sm:self-auto"
              type="button"
              onClick={closeForm}
              disabled={saving}
            >
              <X
                aria-hidden="true"
                className="h-4 w-4"
              />
              Cancel
            </button>
          </div>


          <form
            className="mt-5 space-y-5"
            onSubmit={handleSubmit}
          >

            {/* Rule Name */}

            <div className="space-y-2">
              <label
                className="field-label"
                htmlFor="guardrail-rule-name"
              >
                Rule Name
              </label>

              <input
                className="form-input"
                id="guardrail-rule-name"
                name="rule_name"
                type="text"
                placeholder="Example: Do not mention Project Phoenix"
                value={formData.rule_name}
                onChange={handleFormChange}
                disabled={saving}
                maxLength={255}
                required
              />
            </div>


            <div className="grid gap-5 md:grid-cols-2">

              {/* Rule Type */}

              <div className="space-y-2">
                <label
                  className="field-label"
                  htmlFor="guardrail-rule-type"
                >
                  Rule Type
                </label>

                <select
                  className="form-input"
                  id="guardrail-rule-type"
                  name="rule_type"
                  value={formData.rule_type}
                  onChange={handleFormChange}
                  disabled={saving}
                >
                  <option value="confidential">
                    Confidential
                  </option>

                  <option value="forbidden_phrase">
                    Forbidden Phrase
                  </option>

                  <option value="prohibited_topic">
                    Prohibited Topic
                  </option>

                  <option value="competitor">
                    Competitor
                  </option>
                </select>
              </div>


              {/* Severity */}

              <div className="space-y-2">
                <label
                  className="field-label"
                  htmlFor="guardrail-severity"
                >
                  Severity
                </label>

                <select
                  className="form-input"
                  id="guardrail-severity"
                  name="severity"
                  value={formData.severity}
                  onChange={handleFormChange}
                  disabled={saving}
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>
                </select>
              </div>
            </div>


            {/* Rule Value */}

            <div className="space-y-2">
              <label
                className="field-label"
                htmlFor="guardrail-rule-value"
              >
                Rule Value
              </label>

              <textarea
                className="form-input min-h-[9rem] resize-y"
                id="guardrail-rule-value"
                name="rule_value"
                placeholder="Enter the confidential information, phrase, topic, or competitor name to detect..."
                value={formData.rule_value}
                onChange={handleFormChange}
                disabled={saving}
                required
              />

              <p className="text-xs leading-5 text-zinc-500">
                The current checker performs case-insensitive
                matching against this value.
              </p>
            </div>


            {/* Action */}

            <div className="space-y-2">
              <label
                className="field-label"
                htmlFor="guardrail-action"
              >
                Action When Matched
              </label>

              <select
                className="form-input max-w-md"
                id="guardrail-action"
                name="action"
                value={formData.action}
                onChange={handleFormChange}
                disabled={saving}
              >
                <option value="warn">
                  Warn
                </option>

                <option value="block">
                  Block
                </option>
              </select>

              <p className="text-xs leading-5 text-zinc-500">
                Warn allows the content to be shown with a warning.
                Block marks the overall result as blocked when
                this rule is matched.
              </p>
            </div>


            {/* FORM ACTIONS */}

            <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
              <button
                className="btn-secondary"
                type="button"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save
                      aria-hidden="true"
                      className="h-4 w-4"
                    />

                    {editingRule
                      ? "Save Changes"
                      : "Create Rule"}
                  </>
                )}
              </button>
            </div>

          </form>
        </section>
      )}


      {/* -------------------------------------------------- */}
      {/* SAVED RULES */}
      {/* -------------------------------------------------- */}

      <section className="ui-card p-5 sm:p-6">

        <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">
              Saved Rules
            </h2>

            <p className="mt-1 text-sm text-zinc-600">
              {guardrails.length === 1
                ? "1 Privacy Guardrail saved."
                : `${guardrails.length} Privacy Guardrails saved.`}
            </p>
          </div>

          <button
            className="btn-secondary"
            type="button"
            onClick={loadGuardrails}
          >
            Refresh
          </button>
        </div>


        {guardrails.length > 0 ? (
          <div className="mt-5 space-y-4">

            {guardrails.map((rule) => (
              <article
                className={`rounded-lg border p-4 sm:p-5 ${
                  rule.is_active
                    ? "border-zinc-200 bg-white"
                    : "border-zinc-200 bg-zinc-50 opacity-75"
                }`}
                key={rule.rule_id}
              >

                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                  {/* RULE INFORMATION */}

                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <h3 className="text-base font-semibold text-zinc-950">
                        {rule.rule_name}
                      </h3>


                      {/* Active / Disabled */}

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          rule.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {rule.is_active
                          ? "Active"
                          : "Disabled"}
                      </span>


                      {/* Severity */}

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          getSeverityClass(rule.severity)
                        }`}
                      >
                        {rule.severity} severity
                      </span>


                      {/* Action */}

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          rule.action === "block"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {rule.action}
                      </span>

                    </div>


                    <div className="mt-4 grid gap-3 sm:grid-cols-2">

                      <div className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Rule Type
                        </p>

                        <p className="mt-1 text-sm font-medium text-zinc-800">
                          {getRuleTypeLabel(rule.rule_type)}
                        </p>
                      </div>


                      <div className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Rule Value
                        </p>

                        <p className="mt-1 break-words text-sm font-medium text-zinc-800">
                          {rule.rule_value}
                        </p>
                      </div>

                    </div>

                  </div>


                  {/* RULE ACTIONS */}

                  <div className="flex flex-wrap gap-2 xl:justify-end">

                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => openEditForm(rule)}
                      disabled={
                        actionLoadingId === rule.rule_id
                      }
                    >
                      <Edit3
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                      Edit
                    </button>


                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => handleToggle(rule)}
                      disabled={
                        actionLoadingId === rule.rule_id
                      }
                    >
                      {actionLoadingId === rule.rule_id ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <Power
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                      )}

                      {rule.is_active
                        ? "Disable"
                        : "Enable"}
                    </button>


                    <button
                      className="btn-danger"
                      type="button"
                      onClick={() => handleDelete(rule)}
                      disabled={
                        actionLoadingId === rule.rule_id
                      }
                    >
                      <Trash2
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                      Delete
                    </button>

                  </div>

                </div>

              </article>
            ))}

          </div>
        ) : (
          <div className="mt-5 flex min-h-[15rem] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">

            <ShieldCheck
              aria-hidden="true"
              className="h-10 w-10 text-zinc-300"
            />

            <h3 className="mt-4 text-lg font-semibold text-zinc-950">
              No Privacy Guardrails Yet
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">
              Create your first rule to start checking generated
              content for sensitive information and restricted
              content.
            </p>

            <button
              className="btn-primary mt-5"
              type="button"
              onClick={openCreateForm}
            >
              <Plus
                aria-hidden="true"
                className="h-4 w-4"
              />
              Create First Rule
            </button>

          </div>
        )}

      </section>


      {/* -------------------------------------------------- */}
      {/* DEMO RULE CHECKER */}
      {/* -------------------------------------------------- */}

      <section className="ui-card p-5 sm:p-6">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
            <ShieldAlert
              aria-hidden="true"
              className="h-5 w-5"
            />
          </div>

          <div>
            <h2 className="section-title">
              Test Privacy Guardrails
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Test temporary text against all of your active rules.
              This uses the same backend checking logic that can
              later be connected to the Post Generation Studio.
            </p>
          </div>

        </div>


        <div className="mt-5 space-y-4">

          <textarea
            className="form-input min-h-[12rem] resize-y leading-7"
            placeholder="Enter demo text here. For example, text generated by Gemini in the future..."
            value={checkText}
            onChange={(event) => {
              setCheckText(event.target.value);
              setCheckResult(null);
            }}
            disabled={checking}
          />


          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs leading-5 text-zinc-500">
              Only active Privacy Guardrail rules are checked.
            </p>

            <button
              className="btn-primary"
              type="button"
              onClick={handleCheckText}
              disabled={checking || !checkText.trim()}
            >
              {checking ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  Checking...
                </>
              ) : (
                <>
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                  Check Text
                </>
              )}
            </button>

          </div>


          {/* CHECK RESULT */}

          {checkResult && (
            <div
              className={`rounded-lg border p-4 sm:p-5 ${
                getDecisionClass(checkResult.decision)
              }`}
            >

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">

                {checkResult.decision === "allow" ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0"
                  />
                ) : (
                  <AlertTriangle
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0"
                  />
                )}


                <div className="min-w-0 flex-1">

                  <div className="flex flex-wrap items-center gap-2">

                    <h3 className="text-base font-semibold">
                      Guardrail Result
                    </h3>

                    <span className="rounded-full border border-current px-2.5 py-1 text-xs font-bold uppercase">
                      {checkResult.decision}
                    </span>

                  </div>


                  {checkResult.passed ? (
                    <p className="mt-2 text-sm leading-6">
                      No active Privacy Guardrail violations were
                      found. This text is allowed.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6">
                      {checkResult.violations.length === 1
                        ? "1 Privacy Guardrail violation was found."
                        : `${checkResult.violations.length} Privacy Guardrail violations were found.`}
                    </p>
                  )}


                  {/* VIOLATIONS */}

                  {checkResult.violations.length > 0 && (
                    <div className="mt-4 space-y-3">

                      {checkResult.violations.map(
                        (violation) => (
                          <div
                            className="rounded-lg border border-current/20 bg-white/40 p-4"
                            key={violation.rule_id}
                          >

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="text-sm font-semibold">
                                {violation.rule_name}
                              </p>

                              <span className="rounded-full border border-current/30 px-2 py-0.5 text-xs font-semibold">
                                {getRuleTypeLabel(
                                  violation.rule_type
                                )}
                              </span>

                              <span className="rounded-full border border-current/30 px-2 py-0.5 text-xs font-semibold">
                                {violation.severity}
                              </span>

                              <span className="rounded-full border border-current/30 px-2 py-0.5 text-xs font-semibold">
                                {violation.action}
                              </span>

                            </div>

                            <p className="mt-3 text-sm">
                              <span className="font-semibold">
                                Matched value:
                              </span>{" "}
                              {violation.rule_value}
                            </p>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>

      </section>

    </section>
  );
}


export default PrivacyGuardrails;