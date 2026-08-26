import { useState, useEffect } from "react";
import { 
  generateViralTopics, 
  getViralTopics, 
  deleteViralTopic,
  createContentPlan 
} from "./shafin";

export default function ViralTopics({ onBackToDashboard }) {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // State for scheduling a specific topic
  const [schedulingItem, setSchedulingItem] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    setLoading(true);
    try {
      const data = await getViralTopics(token);
      setGenerations(data);
    } catch (err) {
      setError("Failed to load topics.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setSuccessMessage("");
    try {
      const newGeneration = await generateViralTopics(token, null);
      setGenerations([newGeneration, ...generations]);
      setSuccessMessage("New viral topics generated!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to generate topics. Did you complete the interview?");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteGeneration(id) {
    if (!window.confirm("Delete this generation session?")) return;
    try {
      await deleteViralTopic(token, id);
      setGenerations(generations.filter(g => g.id !== id));
      setSuccessMessage("Generation deleted.");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError("Failed to delete.");
    }
  }

  async function handleSchedule(topicItem) {
    if (!scheduleDate) {
      setError("Please select a date first.");
      return;
    }
    
    try {
      // This calls your Module 2 API to create a Content Plan!
      await createContentPlan(token, {
        title: topicItem.title,
        content_text: `${topicItem.reason}\n\nOutline:\n${topicItem.outline.map(o => `- ${o}`).join("\n")}`,
        platform: topicItem.platform.toLowerCase(),
        scheduled_for: scheduleDate,
      });
      
      setSuccessMessage(`"${topicItem.title}" scheduled to your calendar!`);
      setSchedulingItem(null);
      setScheduleDate("");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError("Failed to schedule plan.");
    }
  }

  // Helper to get color based on virality score
  const getScoreColor = (score) => {
    if (score >= 9) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 7) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Helper to get platform color
  const getPlatformColor = (platform) => {
    const p = platform.toLowerCase();
    if (p.includes("linkedin")) return "bg-blue-600 text-white";
    if (p.includes("twitter") || p.includes("x")) return "bg-black text-white";
    if (p.includes("youtube")) return "bg-red-600 text-white";
    if (p.includes("instagram")) return "bg-purple-600 text-white";
    if (p.includes("tiktok")) return "bg-pink-600 text-white";
    return "bg-gray-600 text-white";
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your viral topics...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back to Dashboard Button */}
      {onBackToDashboard && (
        <button 
          onClick={onBackToDashboard} 
          className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium"
        >
          ← Back to Dashboard
        </button>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Viral Topic Generator</h1>
          <p className="text-gray-600 mt-1">AI-powered content ideas based on your interview profile.</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-300 transition"
        >
          {generating ? "Generating Ideas..." : "✨ Generate 8 New Topics"}
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-300">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg border border-green-300">{successMessage}</div>}

      {/* Generations List */}
      {generations.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No topics generated yet. Click the button above to start!</p>
        </div>
      ) : (
        generations.map((gen) => {
          // IMPORTANT: The backend sends topics_data as a JSON string, so we must parse it!
          let topics = [];
          try {
            topics = JSON.parse(gen.topics_data);
          } catch (e) {
            console.error("Failed to parse topics", e);
          }

          return (
            <div key={gen.id} className="mb-10">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <div>
                  <span className="text-sm text-gray-500">Generated on: {new Date(gen.created_at).toLocaleString()}</span>
                  <p className="text-sm font-medium text-gray-700">Profile: {gen.profession_snapshot} • Audience: {gen.audience_snapshot}</p>
                </div>
                <button 
                  onClick={() => handleDeleteGeneration(gen.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {topics.map((topic, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getPlatformColor(topic.platform)}`}>
                          {topic.platform}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${getScoreColor(topic.virality_score)}`}>
                          🔥 {topic.virality_score}/10
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{topic.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{topic.reason}</p>
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Outline:</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {topic.outline.map((point, i) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2">•</span> {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-auto">
                      {schedulingItem === `${gen.id}-${index}` ? (
                        <div className="flex flex-col gap-2">
                          <input 
                            type="date" 
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleSchedule(topic)}
                              className="flex-1 bg-green-600 text-white text-xs py-1 rounded hover:bg-green-700"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => { setSchedulingItem(null); setScheduleDate(""); }}
                              className="flex-1 bg-gray-200 text-gray-700 text-xs py-1 rounded hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSchedulingItem(`${gen.id}-${index}`)}
                          className="w-full bg-indigo-50 text-indigo-700 font-semibold py-2 rounded-lg hover:bg-indigo-100 transition text-sm"
                        >
                          📅 Schedule to Calendar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}