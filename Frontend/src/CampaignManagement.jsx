import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Calendar,
  Clock,
  Plus,
  Check,
  Loader2,
  Megaphone,
  X,
  Bot,
  User,
  Share2,
} from "lucide-react";
import {
  sendCampaignChat,
  saveCampaign,
  getCampaigns,
} from "./badhon";

export default function CampaignManagement({ token, onUnauthorized }) {
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    posting_frequency: "Daily",
  });

  // AI Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI Campaign Assistant. Tell me what product, goal, or campaign you'd like to launch, and I'll help you plan out the details and generate social media posts!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Generated posts state
  const [generatedPosts, setGeneratedPosts] = useState([]);

  // Saved campaigns list state
  const [savedCampaigns, setSavedCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const chatEndRef = useRef(null);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // Load existing campaigns on mount
  useEffect(() => {
    fetchSavedCampaigns();
  }, [token]);

  const fetchSavedCampaigns = async () => {
    setIsLoadingCampaigns(true);
    setErrorMsg("");
    try {
      const data = await getCampaigns(token);
      setSavedCampaigns(data || []);
    } catch (err) {
      if (err.status === 401 && onUnauthorized) {
        onUnauthorized();
      } else {
        setErrorMsg(err.message || "Failed to fetch saved campaigns.");
      }
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setErrorMsg("");

    const updatedMessages = [
      ...chatMessages,
      { role: "user", content: userMessage },
    ];
    setChatMessages(updatedMessages);
    setIsSendingChat(true);

    try {
      const res = await sendCampaignChat(token, {
        messages: updatedMessages,
        current_form: formData,
      });

      // Append assistant reply
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply_text },
      ]);

      // Auto-fill form from extracted_data
      if (res.extracted_data) {
        setFormData((prev) => ({
          ...prev,
          name: res.extracted_data.campaign_name || prev.name,
          start_date: res.extracted_data.start_date || prev.start_date,
          end_date: res.extracted_data.end_date || prev.end_date,
          posting_frequency:
            res.extracted_data.posting_frequency || prev.posting_frequency,
        }));
      }

      // Update generated posts if returned
      if (res.generated_posts && res.generated_posts.length > 0) {
        setGeneratedPosts(res.generated_posts);
      }
    } catch (err) {
      if (err.status === 401 && onUnauthorized) {
        onUnauthorized();
      } else {
        setErrorMsg(err.message || "Failed to get AI response.");
      }
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!formData.name.trim()) {
      setErrorMsg("Campaign Name is required to save.");
      return;
    }

    setIsSavingCampaign(false);
    setIsSavingCampaign(true);
    setSaveSuccessMsg("");
    setErrorMsg("");

    const payload = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      posting_frequency: formData.posting_frequency,
      status: "active",
      posts: generatedPosts.map((post) => ({
        content: post.content,
        platform: post.platform || "Social Media",
        scheduled_time: post.scheduled_time || "Day 1",
        status: "draft",
      })),
    };

    try {
      await saveCampaign(token, payload);
      setSaveSuccessMsg("Campaign saved successfully!");
      fetchSavedCampaigns();
      // Reset form state optionally
      setTimeout(() => setSaveSuccessMsg(""), 4000);
    } catch (err) {
      if (err.status === 401 && onUnauthorized) {
        onUnauthorized();
      } else {
        setErrorMsg(err.message || "Failed to save campaign.");
      }
    } finally {
      setIsSavingCampaign(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <span className="eyebrow">Campaign Manager</span>
        <h1 className="page-title mt-1 flex items-center gap-2">
          <Megaphone className="h-7 w-7 text-cyan-600" />
          Campaign Management
        </h1>
        <p className="page-subtitle">
          Design, plan, and generate multi-post social media campaigns with your AI assistant.
        </p>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Form & Saved Campaigns */}
        <div className="space-y-6 lg:col-span-7">
          {/* Campaign Form Card */}
          <div className="ui-card p-6">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h2 className="section-title">Create New Campaign</h2>
                <p className="text-xs text-zinc-500">
                  Fill out the parameters or use AI assistance to auto-complete.
                </p>
              </div>
              {!isChatOpen && (
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 transition focus-ring shadow-sm"
                >
                  <Sparkles className="h-4 w-4 text-cyan-600" />
                  ✨ Plan with AI
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="status-error mb-4">
                {errorMsg}
              </div>
            )}
            {saveSuccessMsg && (
              <div className="status-success mb-4 flex items-center gap-2">
                <Check className="h-4 w-4" />
                {saveSuccessMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="field-label mb-1 block">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Product Launch 2026"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange("start_date", e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="field-label mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange("end_date", e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="field-label mb-1 block">Posting Frequency</label>
                <select
                  value={formData.posting_frequency}
                  onChange={(e) => handleInputChange("posting_frequency", e.target.value)}
                  className="form-input"
                >
                  <option value="Daily">Daily</option>
                  <option value="3 times a week">3 times a week</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-zinc-100">
                <button
                  type="button"
                  onClick={handleSaveCampaign}
                  disabled={isSavingCampaign || !formData.name.trim()}
                  className="btn-primary"
                >
                  {isSavingCampaign ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Save Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* AI Generated Posts Preview */}
          {generatedPosts.length > 0 && (
            <div className="ui-card p-6">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-600" />
                AI Generated Social Media Posts ({generatedPosts.length})
              </h2>
              <div className="space-y-4">
                {generatedPosts.map((post, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="tag-pill bg-cyan-50 border-cyan-200 text-cyan-800">
                        {post.platform || "Social Media"}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.scheduled_time || `Post #${idx + 1}`}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-800 whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saved Campaigns List */}
          <div className="ui-card p-6">
            <h2 className="section-title mb-4">Saved Campaigns</h2>
            {isLoadingCampaigns ? (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading campaigns...
              </div>
            ) : savedCampaigns.length === 0 ? (
              <p className="text-sm text-zinc-500">No campaigns created yet.</p>
            ) : (
              <div className="space-y-4">
                {savedCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-zinc-900">{camp.name}</h3>
                      <span className="tag-pill text-xs font-semibold capitalize">
                        {camp.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-zinc-600">
                      {camp.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                          {camp.start_date} {camp.end_date ? `- ${camp.end_date}` : ""}
                        </span>
                      )}
                      {camp.posting_frequency && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          {camp.posting_frequency}
                        </span>
                      )}
                    </div>

                    {camp.posts && camp.posts.length > 0 && (
                      <div className="mt-3 border-t border-zinc-100 pt-3">
                        <span className="text-xs font-semibold text-zinc-700 block mb-2">
                          Posts ({camp.posts.length}):
                        </span>
                        <div className="space-y-2">
                          {camp.posts.map((p) => (
                            <div
                              key={p.id}
                              className="rounded bg-zinc-50 p-2.5 text-xs text-zinc-800 border border-zinc-100"
                            >
                              <span className="font-semibold text-cyan-700 mr-2">
                                [{p.platform || "Post"}]
                              </span>
                              {p.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Expanded AI Chatbox */}
        <div className="lg:col-span-5">
          {!isChatOpen ? (
            <div className="ui-card flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 border border-cyan-100 text-cyan-600">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="section-title text-lg">AI Campaign Assistant</h3>
              <p className="mt-2 text-sm text-zinc-600 max-w-xs">
                Click below to launch an interactive session where Gemini helps build your campaign strategy step-by-step.
              </p>
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="mt-6 rounded-full border border-cyan-200 bg-cyan-50 px-6 py-2.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 transition shadow-sm inline-flex items-center gap-2 focus-ring"
              >
                <Sparkles className="h-4 w-4 text-cyan-600" />
                ✨ Plan with AI
              </button>
            </div>
          ) : (
            <div className="ui-card flex flex-col h-[650px] shadow-md border-cyan-100 overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between bg-zinc-900 px-4 py-3.5 text-white">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Campaign AI Assistant</h3>
                    <p className="text-[11px] text-cyan-300">Powered by Gemini</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                  title="Close Assistant"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2.5 ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        msg.role === "user"
                          ? "bg-zinc-800 text-white"
                          : "bg-cyan-600 text-white"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        msg.role === "user"
                          ? "bg-zinc-950 text-white rounded-tr-none"
                          : "bg-white text-zinc-900 border border-zinc-200 rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 italic">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                    Gemini is thinking and extracting details...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="border-t border-zinc-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your message or answer..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="form-input flex-1 py-2 text-sm"
                    disabled={isSendingChat}
                  />
                  <button
                    type="submit"
                    disabled={isSendingChat || !chatInput.trim()}
                    className="btn-primary px-3 py-2 text-xs"
                  >
                    {isSendingChat ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
