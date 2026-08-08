import { useEffect, useState, useRef } from "react";
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
      chatMessages.push({ type: 'ai', text: ans.question_text, id: `q-${ans.answer_id}` });
      if (ans.answer_text) {
        chatMessages.push({ type: 'user', text: ans.answer_text, id: `a-${ans.answer_id}` });
      } else {
        break;
      }
    }
  }

  return (
    <div className="interview-layout">
      <div className="interview-sidebar">
        <div className="interview-sidebar-item">
          <span className="interview-sidebar-title">History</span>
          <span className="interview-sidebar-icon">▾</span>
        </div>
        <div className="interview-sidebar-item">
          <span className="interview-sidebar-title">Linked Accounts</span>
          <span className="interview-sidebar-icon">▾</span>
        </div>
      </div>
      
      <div className="interview-main">
        {error && <div className="error-message" style={{ margin: "10px" }}>{error}</div>}
        
        <div className="interview-messages">
          {loading ? (
             <div className="chat-bubble ai">Loading interview...</div>
          ) : session?.status === "completed" ? (
             <>
               {chatMessages.map(msg => (
                 <div key={msg.id} className={`chat-bubble ${msg.type}`}>
                   {msg.text}
                 </div>
               ))}
               <div className="chat-bubble ai">Thank you! Your interview is complete.</div>
             </>
          ) : (
            chatMessages.map(msg => (
              <div key={msg.id} className={`chat-bubble ${msg.type}`}>
                {msg.text}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {session?.status !== "completed" && !loading && (
          <div className="interview-input-container">
            <form className="interview-input-form" onSubmit={handleSubmit}>
              <input 
                type="text" 
                placeholder="What's on your mind ?" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={submitting || loading}
                className="interview-text-input"
              />
              <button 
                type="submit" 
                disabled={submitting || loading || !inputValue.trim()}
                className="interview-submit-btn"
              >
                +
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuidedInterview;
