import { useEffect, useState, useRef } from "react";
import {
  CheckCircle2,
  Clock3,
  Link2,
  MessageCircle,
  Send,
} from "lucide-react";

import { getCurrentInterviewSession, startInterviewSession, submitInterviewAnswer } from "./badhon";

function GuidedInterview({ token, onUnauthorized }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function loadSession() {
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
    loadSession();
  }, [token, onUnauthorized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || submitting || !session) return;

    const currentQuestionIndex = session.answers.findIndex(ans => !ans.answer_text);
    if (currentQuestionIndex === -1) return;

    const currentQuestion = session.answers[currentQuestionIndex];

    setSubmitting(true);
    setError("");
    try {
      await submitInterviewAnswer(token, currentQuestion.answer_id, inputValue);

      const updatedAnswers = [...session.answers];
      updatedAnswers[currentQuestionIndex] = { ...currentQuestion, answer_text: inputValue };

      setSession({
        ...session,
        answers: updatedAnswers,
        status: updatedAnswers.every(ans => ans.answer_text) ? "completed" : "in_progress"
      });
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

  const chatMessages = [];
  if (session) {
    for (const ans of session.answers) {
      chatMessages.push({ type: "ai", text: ans.question_text, id: `q-${ans.answer_id}` });
      if (ans.answer_text) {
        chatMessages.push({ type: "user", text: ans.answer_text, id: `a-${ans.answer_id}` });
      } else {
        break;
      }
    }
  }

  const answeredCount = session?.answers?.filter((answer) => answer.answer_text).length || 0;
  const totalQuestions = session?.answers?.length || 0;
  const progressLabel = totalQuestions ? `${answeredCount} of ${totalQuestions} answered` : "Session loading";

  return (
    <section className="space-y-6">
      <header>
        <p className="eyebrow">Discovery Flow</p>
        <h1 className="page-title">Guided Interview</h1>
        <p className="page-subtitle">
          Answer focused prompts and turn raw context into structured writing material.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="ui-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                <MessageCircle aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Current Session</h2>
                <p className="text-sm text-zinc-600">{progressLabel}</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: totalQuestions ? `${(answeredCount / totalQuestions) * 100}%` : "0%" }}
              />
            </div>
          </div>

          <div className="ui-card divide-y divide-zinc-200 overflow-hidden">
            <button className="focus-ring flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-zinc-50" type="button">
              <span className="flex items-center gap-3 text-sm font-semibold text-zinc-800">
                <Clock3 aria-hidden="true" className="h-4 w-4 text-zinc-500" />
                History
              </span>
              <span className="text-xs text-zinc-500">Ready</span>
            </button>
            <button className="focus-ring flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-zinc-50" type="button">
              <span className="flex items-center gap-3 text-sm font-semibold text-zinc-800">
                <Link2 aria-hidden="true" className="h-4 w-4 text-zinc-500" />
                Linked Accounts
              </span>
              <span className="text-xs text-zinc-500">Ready</span>
            </button>
          </div>
        </aside>

        <div className="ui-card flex min-h-[34rem] flex-col overflow-hidden">
          {error && <p className="status-error m-4">{error}</p>}

          <div className="flex-1 space-y-4 overflow-y-auto bg-zinc-50/70 p-4 sm:p-6">
            {loading ? (
              <div className="max-w-[85%] rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-700 shadow-sm">
                Loading interview...
              </div>
            ) : session?.status === "completed" ? (
              <>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.type === "user"
                        ? "ml-auto max-w-[85%] rounded-lg bg-zinc-950 p-4 text-sm leading-6 text-white shadow-sm"
                        : "max-w-[85%] rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-700 shadow-sm"
                    }
                  >
                    {msg.text}
                  </div>
                ))}
                <div className="max-w-[85%] rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    Thank you. Your interview is complete.
                  </span>
                </div>
              </>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.type === "user"
                      ? "ml-auto max-w-[85%] rounded-lg bg-zinc-950 p-4 text-sm leading-6 text-white shadow-sm"
                      : "max-w-[85%] rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-700 shadow-sm"
                  }
                >
                  {msg.text}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {session?.status !== "completed" && !loading && (
            <form className="border-t border-zinc-200 bg-white p-3 sm:p-4" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="guided-interview-answer">
                Answer current interview question
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="guided-interview-answer"
                  type="text"
                  placeholder="Share your answer"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={submitting || loading}
                  className="form-input"
                />
                <button
                  aria-label="Submit answer"
                  type="submit"
                  disabled={submitting || loading || !inputValue.trim()}
                  className="btn-primary h-11 w-11 shrink-0 px-0"
                >
                  <Send aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default GuidedInterview;
