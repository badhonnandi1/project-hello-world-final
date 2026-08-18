import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MessageCircle,
  Send,
  Sparkles,
  RefreshCw,
  Briefcase,
  Users,
  Target,
  Globe,
  PenTool,
  Building2,
} from "lucide-react";

import { getCurrentInterviewSession, startInterviewSession, submitInterviewAnswer } from "./badhon";

const REQUIRED_FIELDS = [
  { key: "profession", label: "Profession / Role", icon: Briefcase },
  { key: "company_name", label: "Company / Brand", icon: Building2 },
  { key: "target_audience", label: "Target Audience", icon: Users },
  { key: "goals", label: "Primary Goals", icon: Target },
  { key: "online_identity", label: "Online Identity", icon: Globe },
  { key: "writing_style", label: "Writing Style", icon: PenTool },
];

function GuidedInterview({ token, onUnauthorized }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadSession() {
    setLoading(true);
    setError("");
    try {
      let currentSession;
      try {
        currentSession = await getCurrentInterviewSession(token);
      } catch (err) {
        if (err.status === 404) {
          currentSession = await startInterviewSession(token);
        } else {
          throw err;
        }
      }
      setSession(currentSession);
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
      } else {
        setError(err.message || "Failed to load interview session");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, [token, onUnauthorized]);

  const handleStartNewSession = async () => {
    setLoading(true);
    setError("");
    try {
      const newSession = await startInterviewSession(token);
      setSession(newSession);
      setInputValue("");
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
      } else {
        setError(err.message || "Failed to start new interview session");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || submitting || !session) return;

    // Find the current unanswered question row
    const currentAnswer = session.answers?.find((ans) => !ans.answer_text) || session.answers?.[session.answers.length - 1];
    if (!currentAnswer) return;

    setSubmitting(true);
    setError("");
    try {
      const updatedSession = await submitInterviewAnswer(token, currentAnswer.answer_id, inputValue);
      setSession(updatedSession);
      setInputValue("");
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
      } else {
        setError(err.message || "Failed to submit answer");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Determine current active question
  const currentAnswerRow = session?.answers?.find((ans) => !ans.answer_text);
  const currentQuestionText = currentAnswerRow?.question_text || session?.answers?.[session?.answers?.length - 1]?.question_text;

  // Calculate extracted field count
  const extractedCount = REQUIRED_FIELDS.filter(
    (field) => session && session[field.key] && String(session[field.key]).trim() !== ""
  ).length;
  const progressPercent = Math.round((extractedCount / REQUIRED_FIELDS.length) * 100);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Discovery Flow</p>
          <h1 className="page-title">Guided Interview</h1>
          <p className="page-subtitle">
            Dynamic, AI-driven interview that turns your answers into structured profile memory.
          </p>
        </div>
        {session?.status === "completed" && (
          <button className="btn-secondary self-start sm:self-auto" type="button" onClick={handleStartNewSession}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Start New Interview
          </button>
        )}
      </header>

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Sidebar Status & Profile Progress */}
        <aside className="space-y-4">
          <div className="ui-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                <MessageCircle aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Extracted Details</h2>
                <p className="text-sm text-zinc-600">{extractedCount} of 6 fields identified</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* List of 6 required fields */}
            <div className="mt-5 space-y-2 border-t border-zinc-200 pt-4">
              {REQUIRED_FIELDS.map(({ key, label, icon: Icon }) => {
                const value = session?.[key];
                const isCaptured = Boolean(value && String(value).trim() !== "");
                return (
                  <div key={key} className="flex items-start gap-2.5 text-xs">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        isCaptured ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-2.5 w-2.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-800">{label}</p>
                      {isCaptured ? (
                        <p className="truncate text-zinc-600" title={value}>
                          {value}
                        </p>
                      ) : (
                        <p className="text-zinc-400 italic">Not captured yet</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main One-Question Card */}
        <div className="ui-card flex min-h-[30rem] flex-col overflow-hidden p-6 sm:p-8">
          {error && <p className="status-error mb-4">{error}</p>}

          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center space-y-3 text-center">
              <Sparkles aria-hidden="true" className="h-8 w-8 animate-pulse text-cyan-600" />
              <p className="text-sm font-medium text-zinc-600">Setting up your AI interview turn...</p>
            </div>
          ) : session?.status === "completed" ? (
            /* Session Completed Screen */
            <div className="flex flex-1 flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="max-w-full rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 aria-hidden="true" className="h-6 w-6 text-emerald-600 shrink-0" />
                    <div>
                      <h3 className="text-base font-semibold text-emerald-900">Interview Completed!</h3>
                      <p className="mt-1 text-sm text-emerald-700">
                        Thank you! GhostWriter AI has gathered your complete profile context.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-5">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-3">Captured Profile Summary</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {REQUIRED_FIELDS.map(({ key, label, icon: Icon }) => (
                      <div key={key} className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                          <Icon className="h-3.5 w-3.5 text-cyan-600" />
                          {label}
                        </div>
                        <p className="mt-1 text-sm text-zinc-800 font-medium">
                          {session[key] || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={handleStartNewSession}
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                  Start Another Interview
                </button>
              </div>
            </div>
          ) : (
            /* Active Question Screen (Single Question at a Time) */
            <div className="flex flex-1 flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1.5 font-medium text-cyan-700">
                    <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                    Gemini AI Question
                  </span>
                  <span>Turn {(session?.answers?.length || 1)}</span>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-6 shadow-sm">
                  <h2 className="text-lg sm:text-xl font-medium text-zinc-900 leading-relaxed">
                    {currentQuestionText || "Preparing next question..."}
                  </h2>
                </div>
              </div>

              {submitting && (
                <div className="flex items-center gap-2 text-sm text-cyan-700 animate-pulse">
                  <Sparkles className="h-4 w-4" />
                  Analyzing your answer and extracting profile details...
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="field-label" htmlFor="guided-interview-input">
                    Your Response
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="guided-interview-input"
                      type="text"
                      placeholder="Type your answer here..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={submitting || loading}
                      className="form-input"
                      autoFocus
                    />
                    <button
                      aria-label="Submit answer"
                      type="submit"
                      disabled={submitting || loading || !inputValue.trim()}
                      className="btn-primary h-11 px-5 shrink-0"
                    >
                      <Send aria-hidden="true" className="h-4 w-4 mr-2" />
                      Submit
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default GuidedInterview;
