import { useEffect, useRef, useState } from "react";
import {
  Edit3,
  FileText,
  Mic,
  RefreshCw,
  Save,
  Square,
} from "lucide-react";

import {
  getLatestVoiceInterview,
  transcribeVoiceInterview,
  createVoiceInterview,
  updateVoiceInterview,
} from "./prithula";


function VoiceInterview({ token, onUnauthorized }) {
  const [interview, setInterview] = useState(null);
  const [transcript, setTranscript] = useState("");

  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ---------------------------------------------------------
  // LOAD LATEST INTERVIEW
  // ---------------------------------------------------------

  useEffect(() => {
    loadLatestInterview();
  }, []);

  async function loadLatestInterview() {
    setLoading(true);
    setError("");

    try {
      const latestInterview = await getLatestVoiceInterview(token);

      setInterview(latestInterview);

      if (latestInterview) {
        setTranscript(latestInterview.transcript);
      } else {
        setTranscript("");
      }
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
  // RECORDING
  // ---------------------------------------------------------

  async function startRecording() {
    setError("");
    setMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      let mimeType = "";

      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());

        setError("Your browser does not support a compatible audio format.");
        return;
      }

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType,
        });

        await handleRecordedAudio(audioBlob);
      };

      mediaRecorderRef.current = recorder;

      recorder.start();

      setRecording(true);
      setMessage("Recording...");
    } catch (error) {
      setError(
        "Microphone access was denied or could not be started."
      );
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setMessage("Recording finished. Transcribing...");
    }
  }

  // ---------------------------------------------------------
  // SEND AUDIO TO GEMINI THROUGH BACKEND
  // ---------------------------------------------------------

  async function handleRecordedAudio(audioBlob) {
    setTranscribing(true);
    setError("");

    try {
      const result = await transcribeVoiceInterview(
        token,
        audioBlob
      );

      setTranscript(result.transcript);

      // This is a NEW interview, so the old interview
      // should not be treated as the current saved one yet.
      setInterview(null);

      setEditing(false);
      setMessage(
        "Transcript generated. Review and edit it before saving."
      );
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
      } else {
        setError(error.message);
      }
    } finally {
      setTranscribing(false);
    }
  }

  // ---------------------------------------------------------
  // SAVE NEW INTERVIEW
  // ---------------------------------------------------------

  async function handleSaveNewInterview() {
    if (!transcript.trim()) {
      setError("Transcript cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const savedInterview = await createVoiceInterview(
        token,
        {
          transcript: transcript.trim(),
        }
      );

      setInterview(savedInterview);
      setTranscript(savedInterview.transcript);
      setEditing(false);

      setMessage("Voice interview saved successfully.");
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
  // EDIT EXISTING INTERVIEW
  // ---------------------------------------------------------

  async function handleUpdateInterview() {
    if (!interview) {
      return;
    }

    if (!transcript.trim()) {
      setError("Transcript cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const updatedInterview = await updateVoiceInterview(
        token,
        interview.interview_id,
        {
          transcript: transcript.trim(),
        }
      );

      setInterview(updatedInterview);
      setTranscript(updatedInterview.transcript);
      setEditing(false);

      setMessage("Interview updated successfully.");
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
  // CANCEL EDIT
  // ---------------------------------------------------------

  function cancelEdit() {
    if (interview) {
      setTranscript(interview.transcript);
    }

    setEditing(false);
    setError("");
    setMessage("");
  }

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <section className="space-y-6">
        <header>
          <p className="eyebrow">Voice Capture</p>
          <h1 className="page-title">Voice Interview</h1>
        </header>
        <p className="ui-card p-5 text-sm font-medium text-zinc-600">Loading your latest interview...</p>
      </section>
    );
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <section className="space-y-6">
      <header>
        <p className="eyebrow">Voice Capture</p>
        <h1 className="page-title">Voice Interview</h1>
        <p className="page-subtitle">
          Record your thoughts naturally and let GhostWriter AI convert your voice into a transcript.
        </p>
      </header>

      <div aria-live="polite" className="space-y-3">
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

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="ui-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
                <Mic aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-title">Record Interview</h2>
                <p className="text-sm text-zinc-600">Capture a fresh voice note.</p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-zinc-600">
              Click the button below and speak naturally. You can review the transcript before saving.
            </p>

            {!recording ? (
              <button
                className="btn-primary mt-5 w-full"
                type="button"
                onClick={startRecording}
                disabled={transcribing || saving}
              >
                <Mic aria-hidden="true" className="h-4 w-4" />
                Start Recording
              </button>
            ) : (
              <button
                className="btn-danger mt-5 w-full"
                type="button"
                onClick={stopRecording}
              >
                <Square aria-hidden="true" className="h-4 w-4" />
                Stop Recording
              </button>
            )}

            {recording && (
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-rose-700">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                Recording in progress
              </p>
            )}

            {transcribing && (
              <p className="mt-4 text-sm font-medium text-zinc-600">
                Converting your audio and generating transcript...
              </p>
            )}
          </section>

          <section className="ui-card p-5">
            <h2 className="section-title">Workflow</h2>
            <div className="mt-4 space-y-3">
              {[
                ["Record", recording ? "In progress" : "Ready"],
                ["Transcribe", transcribing ? "Working" : transcript ? "Complete" : "Waiting"],
                ["Save", interview ? "Saved" : transcript ? "Ready" : "Waiting"],
              ].map(([label, status]) => (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2" key={label}>
                  <span className="text-sm font-medium text-zinc-700">{label}</span>
                  <span className="text-xs font-semibold text-zinc-500">{status}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="ui-card min-h-[32rem] p-5 sm:p-6">
          {transcript ? (
            <>
              <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                    <FileText aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="section-title">
                      {interview
                        ? "Latest Interview"
                        : "New Transcript"}
                    </h2>
                    <p className="text-sm text-zinc-600">
                      {editing || !interview ? "Review and refine the transcript." : "Saved transcript is read-only until you edit."}
                    </p>
                  </div>
                </div>
              </div>

              <textarea
                className="form-input mt-5 min-h-[22rem] resize-y leading-7"
                value={transcript}
                onChange={(event) =>
                  setTranscript(event.target.value)
                }
                readOnly={!editing && !!interview}
                rows={12}
              />

              {interview && !editing && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setMessage("");
                      setError("");
                    }}
                  >
                    <Edit3 aria-hidden="true" className="h-4 w-4" />
                    Edit Transcript
                  </button>

                  <button
                    className="btn-primary"
                    type="button"
                    onClick={startRecording}
                    disabled={recording || transcribing}
                  >
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    Record New Interview
                  </button>
                </div>
              )}

              {interview && editing && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn-primary"
                    type="button"
                    onClick={handleUpdateInterview}
                    disabled={saving}
                  >
                    <Save aria-hidden="true" className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}

              {!interview && !transcribing && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={handleSaveNewInterview}
                    disabled={saving}
                  >
                    <Save aria-hidden="true" className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Interview"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
              <Mic aria-hidden="true" className="h-9 w-9 text-zinc-300" />
              <h2 className="mt-4 text-lg font-semibold text-zinc-950">No Interview Yet</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">
                You have not recorded a voice interview yet. Start recording to create your first one.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default VoiceInterview;
