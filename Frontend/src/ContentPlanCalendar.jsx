import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

// Import YOUR personal API functions
import { createContentPlan, getContentPlans, deleteContentPlan } from "./shafin";

// This helper calculates the Monday-Sunday of whatever date you pass it.
function getWeekDays(anchorDate) {
  const date = new Date(anchorDate);
  const day = date.getDay(); 
  // Shift to Monday (1 is Monday, 0 is Sunday so we go back 6 days)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(date.setDate(diff));
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    // Format as "YYYY-MM-DD" for the API
    week.push(d.toISOString().split("T")[0]);
  }
  return week;
}

function ContentPlanCalendar({ token, onUnauthorized }) {
  // 1. STATE
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState(() => getWeekDays(new Date()));
  const [plans, setPlans] = useState([]);
  
  // Form state
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [scheduledDate, setScheduledDate] = useState(weekDays[0]); // Default to Monday

  // UI state
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 2. THE BRAINS
  function handleApiError(apiError) {
    if (apiError.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }
    setError(apiError.message);
  }

  async function loadPlans() {
    setLoading(true);
    setError("");
    try {
      // This is where the magic happens! We send the week boundaries to the backend.
      const data = await getContentPlans(token, {
        week_start: weekDays[0],
        week_end: weekDays[6],
      });
      setPlans(data);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setLoading(false);
    }
  }

  // Reload plans whenever the week changes
  useEffect(() => {
    loadPlans();
  }, [weekDays]);

  // 3. NAVIGATION & ACTIONS
  function goToPreviousWeek() {
    const prevWeek = new Date(anchorDate);
    prevWeek.setDate(anchorDate.getDate() - 7);
    setAnchorDate(prevWeek);
    setWeekDays(getWeekDays(prevWeek));
  }

  function goToNextWeek() {
    const nextWeek = new Date(anchorDate);
    nextWeek.setDate(anchorDate.getDate() + 7);
    setAnchorDate(nextWeek);
    setWeekDays(getWeekDays(nextWeek));
  }

  function goToToday() {
    const today = new Date();
    setAnchorDate(today);
    setWeekDays(getWeekDays(today));
  }

  async function handleCreatePlan(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    
    if (!title.trim() || !contentText.trim()) {
      setError("Title and content are required.");
      return;
    }

    setCreating(true);
    try {
      await createContentPlan(token, {
        title,
        content_text: contentText,
        platform,
        scheduled_for: scheduledDate, // Send the YYYY-MM-DD string
      });
      setSuccessMessage("Plan scheduled successfully!");
      setTitle("");
      setContentText("");
      await loadPlans(); // Refresh the grid
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePlan(planId) {
    if (!window.confirm("Delete this scheduled plan?")) return;
    setError("");
    try {
      await deleteContentPlan(token, planId);
      setSuccessMessage("Plan deleted.");
      await loadPlans();
    } catch (apiError) {
      handleApiError(apiError);
    }
  }

  // 4. THE UI (THE FACE)
  return (
    <section className="space-y-6">
      <header>
        <p className="eyebrow">Content Planning</p>
        <h1 className="page-title">Publishing Calendar</h1>
        <p className="page-subtitle">
          Schedule your posts and coordinate your weekly publishing motion.
        </p>
      </header>

      {successMessage && <p className="status-success">{successMessage}</p>}
      {error && <p className="status-error">{error}</p>}

      {/* --- CREATE FORM --- */}
      <form onSubmit={handleCreatePlan} className="ui-card grid gap-4 p-5 sm:p-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          <label className="field-label" htmlFor="plan-title">Post Title</label>
          <input className="form-input" id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. LinkedIn AI Thread" required />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <label className="field-label" htmlFor="plan-content">Content Text</label>
          <input className="form-input" id="plan-content" value={contentText} onChange={(e) => setContentText(e.target.value)} placeholder="Draft or summary..." required />
        </div>
        <div className="space-y-2">
          <label className="field-label" htmlFor="plan-platform">Platform</label>
          <select className="form-input" id="plan-platform" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">Twitter / X</option>
            <option value="youtube">YouTube</option>
            <option value="blog">Blog</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-1 lg:col-span-2">
          <label className="field-label" htmlFor="plan-date">Date</label>
          <select className="form-input" id="plan-date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}>
            {weekDays.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-1 lg:col-span-2 flex items-end">
           <button className="btn-primary w-full" type="submit" disabled={creating}>
             <Plus className="h-4 w-4" /> {creating ? "Saving..." : "Schedule Post"}
           </button>
        </div>
      </form>

      {/* --- CALENDAR NAVIGATION --- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-secondary" type="button" onClick={goToPreviousWeek}><ChevronLeft className="h-4 w-4" /> Prev</button>
          <button className="btn-secondary" type="button" onClick={goToToday}>Today</button>
          <button className="btn-secondary" type="button" onClick={goToNextWeek}>Next <ChevronRight className="h-4 w-4" /></button>
        </div>
        <p className="text-sm font-semibold text-zinc-950">
          {weekDays[0]} — {weekDays[6]}
        </p>
      </div>

      {/* --- THE 7-DAY GRID --- */}
      {loading ? (
        <p className="ui-card p-4 text-sm font-medium text-zinc-600">Loading calendar...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((day) => {
            // Filter plans for THIS specific day
            const daysPlans = plans.filter((p) => p.scheduled_for && p.scheduled_for.startsWith(day));
            
            return (
              <div key={day} className="ui-card flex min-h-[12rem] flex-col p-3">
                <h3 className="mb-3 border-b border-zinc-200 pb-2 text-center text-sm font-semibold text-zinc-950">
                  {day}
                </h3>
                
                <div className="flex flex-1 flex-col gap-2">
                  {daysPlans.length === 0 && (
                    <p className="text-center text-xs text-zinc-400">No posts</p>
                  )}
                  {daysPlans.map((plan) => (
                    <div key={plan.content_plan_id} className="group relative rounded-lg border border-zinc-200 bg-zinc-50 p-2 transition hover:border-cyan-300">
                      <p className="truncate text-xs font-bold text-zinc-950">{plan.title}</p>
                      <p className="truncate text-[10px] text-zinc-500">{plan.platform}</p>
                      <button 
                        onClick={() => handleDeletePlan(plan.content_plan_id)}
                        className="absolute right-1 top-1 hidden rounded p-1 text-rose-500 hover:bg-rose-100 group-hover:block"
                        type="button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ContentPlanCalendar;