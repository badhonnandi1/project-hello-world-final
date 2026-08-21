import { useEffect, useState } from "react";
import {
  ArrowRight,
  Compass,
  Lightbulb,
  Loader2,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { getExploreOpportunities } from "./badhon";

export default function ExploreOpportunities({ token, onUnauthorized, onNavigate }) {
  const [opportunities, setOpportunities] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [needInterview, setNeedInterview] = useState(false);

  // Initial fetch on component mount
  useEffect(() => {
    fetchInitialFeed();
  }, [token]);

  async function fetchInitialFeed() {
    setLoading(true);
    setError("");
    setNeedInterview(false);

    try {
      const data = await getExploreOpportunities(token, 0, 10);
      setOpportunities(data || []);
      setOffset(0);
      if (!data || data.length < 10) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
      } else if (err.status === 400) {
        setNeedInterview(true);
      } else {
        setError(err.message || "Failed to load explore feed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError("");
    const nextOffset = offset + 10;

    try {
      const newItems = await getExploreOpportunities(token, nextOffset, 10);
      if (!newItems || newItems.length === 0) {
        setHasMore(false);
      } else {
        setOpportunities((prev) => [...prev, ...newItems]);
        setOffset(nextOffset);
        if (newItems.length < 10) {
          setHasMore(false);
        }
      }
    } catch (err) {
      if (err.status === 401) {
        onUnauthorized();
      } else {
        setError(err.message || "Failed to load more opportunities.");
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Community Discovery</p>
          <h1 className="page-title flex items-center gap-2.5">
            <Compass className="h-6 w-6 text-cyan-600" />
            Explore Opportunities
          </h1>
          <p className="page-subtitle">
            Discover real-world questions and concerns from audiences similar to yours across the community.
          </p>
        </div>
      </header>

      {/* Need Interview Card (400 fallback) */}
      {needInterview ? (
        <div className="ui-card p-8 text-center space-y-4 max-w-2xl mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
            <MessageCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">Target Audience Required</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 max-w-lg mx-auto">
              To match you with relevant community opportunities, GhostWriter AI needs to understand your target audience first. Please complete your Guided Interview to unlock personalized opportunities.
            </p>
          </div>
          <div className="pt-2">
            <button
              className="btn-primary inline-flex items-center gap-2"
              type="button"
              onClick={() => onNavigate && onNavigate("guided-interview")}
            >
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Complete Guided Interview
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main Feed Loading State */}
          {loading ? (
            <div className="ui-card p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-600" />
              <p className="mt-3 text-sm font-medium text-zinc-600">
                Finding opportunities matched to your audience...
              </p>
            </div>
          ) : error ? (
            <div className="ui-card p-6 border-rose-200 bg-rose-50 text-rose-800">
              <p className="text-sm font-medium">{error}</p>
              <button
                className="btn-secondary mt-3 text-xs"
                type="button"
                onClick={fetchInitialFeed}
              >
                Try Again
              </button>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="ui-card p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="section-title">No Opportunities Found Yet</h3>
              <p className="text-sm text-zinc-600 max-w-md mx-auto">
                No matching community opportunities were found for your target audience right now. Check back soon as other creators share new insights!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {opportunities.map((opp) => (
                <article key={opp.id} className="ui-card p-6 space-y-4 transition hover:shadow-md">
                  {/* Card Eyebrow Platform */}
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">
                      {opp.source_platform ? opp.source_platform : "Community"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {opp.created_at ? new Date(opp.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>

                  {/* Section Title - Audience Concern */}
                  <div>
                    <h3 className="section-title text-lg text-zinc-950">
                      {opp.audience_concern}
                    </h3>
                  </div>

                  {/* Body Text - Source Text */}
                  <p className="text-sm leading-relaxed text-zinc-600 bg-zinc-50 border border-zinc-200 p-3.5 rounded-md">
                    "{opp.source_text}"
                  </p>

                  {/* Suggested Topic */}
                  {opp.suggested_topic && (
                    <div className="flex items-start gap-2 pt-1">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-cyan-100 text-cyan-700">
                        <Lightbulb className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 block">
                          Suggested Topic
                        </span>
                        <p className="text-sm font-medium text-zinc-800">
                          {opp.suggested_topic}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              ))}

              {/* Pagination / Load More */}
              <div className="pt-4 text-center">
                {hasMore ? (
                  <button
                    className="btn-secondary px-6 py-2.5 inline-flex items-center gap-2"
                    type="button"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
                        Loading More...
                      </>
                    ) : (
                      "Load More Opportunities"
                    )}
                  </button>
                ) : (
                  <p className="text-xs font-medium text-zinc-500">
                    You've reached the end of the explore feed.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
