import { useEffect, useRef, useState } from "react";

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
      <section>
        <h1>Voice Interview</h1>
        <p>Loading your latest interview...</p>
      </section>
    );
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <section className="voice-interview-page">

      <h1>Voice Interview</h1>

      <p className="dashboard-description">
        Record your thoughts naturally and let GhostWriter AI
        convert your voice into a transcript.
      </p>

      {message && (
        <p className="knowledge-message">
          {message}
        </p>
      )}

      {error && (
        <p className="knowledge-error">
          {error}
        </p>
      )}

      {/* -------------------------------------------------- */}
      {/* RECORDING CARD */}
      {/* -------------------------------------------------- */}

      <div className="voice-interview-card">

        <h2>Record Interview</h2>

        <p>
          Click the button below and speak naturally.
        </p>

        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={transcribing || saving}
          >
            🎙️ Start Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
          >
            ⏹ Stop Recording
          </button>
        )}

        {recording && (
          <p className="recording-status">
            🔴 Recording in progress...
          </p>
        )}

        {transcribing && (
          <p>
            Converting your audio and generating transcript...
          </p>
        )}

      </div>

      {/* -------------------------------------------------- */}
      {/* TRANSCRIPT CARD */}
      {/* -------------------------------------------------- */}

      {transcript && (
        <div className="voice-interview-card">

          <div className="voice-interview-header">
            <h2>
              {interview
                ? "Latest Interview"
                : "New Transcript"}
            </h2>
          </div>

          <textarea
            className="voice-interview-textarea"
            value={transcript}
            onChange={(event) =>
              setTranscript(event.target.value)
            }
            readOnly={!editing && !!interview}
            rows={12}
          />

          {/* Existing interview */}
          {interview && !editing && (
            <div className="voice-interview-actions">

              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setMessage("");
                  setError("");
                }}
              >
                Edit Transcript
              </button>

              <button
                type="button"
                onClick={startRecording}
                disabled={recording || transcribing}
              >
                🎙️ Record New Interview
              </button>

            </div>
          )}

          {/* Editing existing interview */}
          {interview && editing && (
            <div className="voice-interview-actions">

              <button
                type="button"
                onClick={handleUpdateInterview}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </button>

            </div>
          )}

          {/* New interview after recording */}
          {!interview && !transcribing && (
            <div className="voice-interview-actions">

              <button
                type="button"
                onClick={handleSaveNewInterview}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Interview"}
              </button>

            </div>
          )}

        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* EMPTY STATE */}
      {/* -------------------------------------------------- */}

      {!transcript && !transcribing && (
        <div className="voice-interview-card">

          <h2>No Interview Yet</h2>

          <p>
            You haven't recorded a voice interview yet.
            Start recording to create your first one.
          </p>

        </div>
      )}

    </section>
  );
}

export default VoiceInterview;