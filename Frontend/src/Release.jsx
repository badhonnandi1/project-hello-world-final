import React, { useState, useEffect } from "react";
import {
  Send,
  Share2,
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Link,
  PlusCircle,
  UserCheck,
} from "lucide-react";
import {
  getLatestGeneration,
  getBackloggedPlans,
  publishLatestPost,
  publishBackloggedPosts,
  getUserConnections,
  mockConnectAccount,
} from "./badhon";

function LinkedinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export default function Release({ token, onUnauthorized }) {
  // Connected social account details from Zernio
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [mockConnecting, setMockConnecting] = useState(false);

  // Immediate release state
  const [latestGeneration, setLatestGeneration] = useState(null);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [latestError, setLatestError] = useState("");
  const [latestSuccess, setLatestSuccess] = useState("");
  const [publishingLatest, setPublishingLatest] = useState(false);

  // Backlogged batch release state
  const [backloggedPlans, setBackloggedPlans] = useState([]);
  const [loadingBacklogged, setLoadingBacklogged] = useState(true);
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [backloggedError, setBackloggedError] = useState("");
  const [backloggedSuccess, setBackloggedSuccess] = useState("");
  const [publishingBacklogged, setPublishingBacklogged] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchConnections();
    fetchLatestGen();
    fetchBacklogged();
  }, [token]);

  async function fetchConnections() {
    setLoadingConnections(true);
    try {
      const accounts = await getUserConnections(token);
      setConnectedAccounts(accounts || []);
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
        return;
      }
    } finally {
      setLoadingConnections(false);
    }
  }

  async function handleMockConnect(platform) {
    setMockConnecting(true);
    setLatestError("");
    setBackloggedError("");
    try {
      await mockConnectAccount(token, platform);
      await fetchConnections();
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
        return;
      }
      setLatestError(err.message || `Failed to connect ${platform}.`);
    } finally {
      setMockConnecting(false);
    }
  }

  async function fetchLatestGen() {
    setLoadingLatest(true);
    setLatestError("");
    try {
      const data = await getLatestGeneration(token);
      setLatestGeneration(data);
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
        return;
      }
      if (err.status !== 404) {
        setLatestError(err.message || "Failed to load latest generation.");
      } else {
        setLatestGeneration(null);
      }
    } finally {
      setLoadingLatest(false);
    }
  }

  async function fetchBacklogged() {
    setLoadingBacklogged(true);
    setBackloggedError("");
    try {
      const data = await getBackloggedPlans(token);
      setBackloggedPlans(data || []);
      setSelectedPlanIds([]);
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
        return;
      }
      setBackloggedError(err.message || "Failed to load backlogged content plans.");
    } finally {
      setLoadingBacklogged(false);
    }
  }

  async function handleReleaseLatest() {
    if (connectedAccounts.length === 0) return;

    setPublishingLatest(true);
    setLatestError("");
    setLatestSuccess("");

    try {
      await publishLatestPost(token);
      setLatestSuccess("Post successfully published to connected social profiles via Zernio!");
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
        return;
      }
      setLatestError(err.message || "Failed to publish post via Zernio.");
    } finally {
      setPublishingLatest(false);
    }
  }

  function handleSelectAll(e) {
    if (e.target.checked) {
      setSelectedPlanIds(backloggedPlans.map((p) => p.content_plan_id));
    } else {
      setSelectedPlanIds([]);
    }
  }

  function handleTogglePlan(planId) {
    setSelectedPlanIds((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
  }

  async function handleReleaseBacklogged() {
    if (selectedPlanIds.length === 0 || connectedAccounts.length === 0) return;

    setPublishingBacklogged(true);
    setBackloggedError("");
    setBackloggedSuccess("");

    try {
      await publishBackloggedPosts(token, selectedPlanIds);
      setBackloggedSuccess(
        `Successfully published ${selectedPlanIds.length} backlogged post(s) to connected social profiles via Zernio!`
      );
      setBackloggedPlans((prev) =>
        prev.filter((p) => !selectedPlanIds.includes(p.content_plan_id))
      );
      setSelectedPlanIds([]);
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
        return;
      }
      setBackloggedError(err.message || "Failed to publish backlogged posts via Zernio.");
    } finally {
      setPublishingBacklogged(false);
    }
  }

  const hasConnections = connectedAccounts.length > 0;
  const allSelected =
    backloggedPlans.length > 0 && selectedPlanIds.length === backloggedPlans.length;

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <span className="eyebrow">AUTOMATED SOCIAL MEDIA PUBLISHING</span>
        <h1 className="page-title mt-1 flex items-center gap-3">
          <Share2 className="h-7 w-7 text-cyan-600" />
          Release via Zernio
        </h1>
        <p className="page-subtitle">
          Instantly publish your latest AI generations or bulk-release your backlogged content plans straight to your connected social profiles via Zernio.
        </p>
      </div>

      {/* DEV MODE: CONNECTIONS ACTIONS */}
      <section className="ui-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-3">
          <div>
            <span className="eyebrow">ZERNIO INTEGRATION</span>
            <h2 className="section-title text-base mt-0.5 flex items-center gap-2">
              <Link className="h-4 w-4 text-cyan-600" />
              Connections (Dev Mode)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMockConnect("linkedin")}
              disabled={mockConnecting}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <LinkedinIcon className="h-3.5 w-3.5 text-blue-600" />
              <PlusCircle className="h-3 w-3" />
              Mock Connect LinkedIn
            </button>
            <button
              onClick={() => handleMockConnect("instagram")}
              disabled={mockConnecting}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <InstagramIcon className="h-3.5 w-3.5 text-pink-600" />
              <PlusCircle className="h-3 w-3" />
              Mock Connect Instagram
            </button>
          </div>
        </div>

        {/* CONNECTION STATUS BANNER */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-cyan-600" />
              Active Publishing Channels
            </span>
            <button
              onClick={fetchConnections}
              disabled={loadingConnections}
              className="btn-quiet text-[11px] py-1 px-2 flex items-center gap-1 text-zinc-500"
            >
              <RefreshCw className={`h-3 w-3 ${loadingConnections ? "animate-spin" : ""}`} />
              Refresh Profiles
            </button>
          </div>

          {loadingConnections ? (
            <div className="py-4 text-center text-xs text-zinc-400 animate-pulse">
              Querying Zernio for connected profile details...
            </div>
          ) : hasConnections ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {connectedAccounts.map((acc, idx) => {
                const isLinkedin = acc.platform.toLowerCase() === "linkedin";
                const isInstagram = acc.platform.toLowerCase() === "instagram";
                return (
                  <div
                    key={acc.account_id || idx}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-950 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-white border border-emerald-100 shadow-xs shrink-0">
                        {isLinkedin ? (
                          <LinkedinIcon className="h-5 w-5 text-blue-600" />
                        ) : isInstagram ? (
                          <InstagramIcon className="h-5 w-5 text-pink-600" />
                        ) : (
                          <Share2 className="h-5 w-5 text-cyan-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-950 truncate capitalize">
                          {acc.platform}: {acc.display_name || "Connected Profile"}
                        </p>
                        <p className="text-xs font-medium text-emerald-800 truncate">
                          {acc.username ? (acc.username.startsWith("@") ? acc.username : `@${acc.username}`) : "@social_user"}
                        </p>
                      </div>
                    </div>
                    <span className="tag-pill bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold text-[11px] flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Active / Connected
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="status-error flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-rose-900">No Active Social Accounts Found</h4>
                <p className="text-xs text-rose-800 leading-relaxed mt-0.5">
                  Zernio returned 0 active publishing profiles. Click the "Mock Connect" buttons above in Dev Mode to connect LinkedIn or Instagram.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TOP SECTION: IMMEDIATE RELEASE */}
      <section className="ui-card p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <span className="eyebrow">IMMEDIATE RELEASE</span>
            <h2 className="section-title text-lg mt-0.5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              Most Recent AI Generation
            </h2>
          </div>
          <button
            onClick={fetchLatestGen}
            disabled={loadingLatest}
            className="btn-quiet text-xs flex items-center gap-1.5"
            title="Refresh latest generation"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingLatest ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Success Alert */}
        {latestSuccess && (
          <div className="status-success flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{latestSuccess}</span>
          </div>
        )}

        {/* Generic Error Alert */}
        {latestError && (
          <div className="status-error flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{latestError}</span>
          </div>
        )}

        {/* Card Content */}
        {loadingLatest ? (
          <div className="py-8 text-center text-zinc-500 text-sm animate-pulse">
            Loading latest generation...
          </div>
        ) : latestGeneration ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  Generated {new Date(latestGeneration.created_at).toLocaleString()}
                </span>
                <div className="flex items-center gap-1.5">
                  {connectedAccounts.map((acc, idx) => (
                    <span key={acc.account_id || idx} className="tag-pill bg-white text-zinc-800 flex items-center gap-1">
                      {acc.platform.toLowerCase() === "linkedin" ? (
                        <LinkedinIcon className="h-3 w-3 text-blue-600" />
                      ) : (
                        <InstagramIcon className="h-3 w-3 text-pink-600" />
                      )}
                      <span className="capitalize">{acc.platform} ({acc.display_name})</span>
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-zinc-800 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                {latestGeneration.content}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleReleaseLatest}
                disabled={publishingLatest || !hasConnections}
                className="btn-primary px-6 py-3 text-base shadow-md disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
              >
                {publishingLatest ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Releasing to Zernio...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Release
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center border-2 border-dashed border-zinc-200 rounded-lg p-6">
            <Sparkles className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-600 text-sm font-medium">No recent generation found.</p>
            <p className="text-zinc-400 text-xs mt-1">
              Create a new post generation first to release it immediately.
            </p>
          </div>
        )}
      </section>

      {/* BOTTOM SECTION: BACKLOGGED POSTS */}
      <section className="ui-card p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
          <div>
            <span className="eyebrow">BATCH PUBLISHING</span>
            <h2 className="section-title text-lg mt-0.5 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-cyan-600" />
              Backlogged Content Plans
            </h2>
          </div>
          <button
            onClick={fetchBacklogged}
            disabled={loadingBacklogged}
            className="btn-quiet text-xs flex items-center gap-1.5"
            title="Refresh backlogged plans"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingBacklogged ? "animate-spin" : ""}`} />
            Refresh List
          </button>
        </div>

        {/* Success Alert */}
        {backloggedSuccess && (
          <div className="status-success flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{backloggedSuccess}</span>
          </div>
        )}

        {/* Error Alert */}
        {backloggedError && (
          <div className="status-error flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{backloggedError}</span>
          </div>
        )}

        {loadingBacklogged ? (
          <div className="py-8 text-center text-zinc-500 text-sm animate-pulse">
            Loading backlogged plans...
          </div>
        ) : backloggedPlans.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-100/70 px-4 py-2.5 rounded-lg border border-zinc-200">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                />
                Select All ({selectedPlanIds.length} of {backloggedPlans.length} selected)
              </label>

              <button
                onClick={handleReleaseBacklogged}
                disabled={selectedPlanIds.length === 0 || publishingBacklogged || !hasConnections}
                className="btn-primary text-xs px-4 py-2 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
              >
                {publishingBacklogged ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Publishing ({selectedPlanIds.length})...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Release Backlogged Posts
                  </>
                )}
              </button>
            </div>

            <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden bg-white">
              {backloggedPlans.map((plan) => {
                const isSelected = selectedPlanIds.includes(plan.content_plan_id);
                return (
                  <div
                    key={plan.content_plan_id}
                    className={`p-4 flex items-start gap-4 transition ${
                      isSelected ? "bg-cyan-50/40" : "hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTogglePlan(plan.content_plan_id)}
                      className="mt-1 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-950 truncate">
                          {plan.title || "Untitled Content Plan"}
                        </h3>
                        <span className="tag-pill text-[10px] uppercase font-bold shrink-0">
                          {plan.platform || "Social"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                        {plan.content_text}
                      </p>
                      {plan.scheduled_for && (
                        <span className="text-[11px] text-zinc-400 block pt-1">
                          Scheduled for: {new Date(plan.scheduled_for).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center border-2 border-dashed border-zinc-200 rounded-lg p-6">
            <ListChecks className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-zinc-600 text-sm font-medium">No backlogged posts found.</p>
            <p className="text-zinc-400 text-xs mt-1">
              All content plans have either been released or no unposted plans exist.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
