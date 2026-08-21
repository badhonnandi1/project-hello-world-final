import { useEffect, useMemo, useState } from "react";
import {
  MailCheck,
  MailPlus,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";

import {
  createNewsletterSubscription,
  deleteNewsletterSubscription,
  getMyNewsletterCreator,
  getNewsletterCreators,
  getNewsletterSubscriptions,
  updateNewsletterSubscription,
} from "./badhon";


function formatPublishedDate(value) {
  if (!value) {
    return "Publication date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}


// This page combines active-creator discovery with the current user's subscriptions.
function NewsletterSubscriptions({ token, onUnauthorized }) {
  const [creators, setCreators] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [ownCreatorId, setOwnCreatorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mutationKey, setMutationKey] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const subscriptionsByCreatorId = useMemo(
    () => new Map(subscriptions.map((subscription) => [subscription.creator_id, subscription])),
    [subscriptions],
  );

  function readableError(apiError) {
    return typeof apiError?.message === "string"
      ? apiError.message
      : "The request could not be completed.";
  }

  function handleApiError(apiError) {
    if (apiError.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }

    setError(readableError(apiError));
  }

  async function loadOwnCreatorId() {
    try {
      const creator = await getMyNewsletterCreator(token);
      return creator.id;
    } catch (apiError) {
      if (apiError.status === 404) {
        return null;
      }

      throw apiError;
    }
  }

  async function loadDirectory(initialLoad = false) {
    if (initialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");

    try {
      const [savedCreators, savedSubscriptions, savedOwnCreatorId] = await Promise.all([
        getNewsletterCreators(token),
        getNewsletterSubscriptions(token),
        loadOwnCreatorId(),
      ]);
      setCreators(savedCreators);
      setSubscriptions(savedSubscriptions);
      setOwnCreatorId(savedOwnCreatorId);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDirectory(true);
  }, []);

  async function handleSubscribe(creator) {
    setMutationKey(`subscribe-${creator.id}`);
    setError("");
    setSuccessMessage("");

    try {
      await createNewsletterSubscription(token, creator.id);
      setSuccessMessage(`Subscribed to ${creator.display_name}.`);
      await loadDirectory(false);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setMutationKey("");
    }
  }

  async function handleStatusChange(subscription, nextStatus) {
    setMutationKey(`status-${subscription.id}`);
    setError("");
    setSuccessMessage("");

    try {
      await updateNewsletterSubscription(token, subscription.id, { status: nextStatus });
      setSuccessMessage(
        nextStatus === "active"
          ? `Resumed ${subscription.creator.display_name}.`
          : `Paused ${subscription.creator.display_name}.`,
      );
      await loadDirectory(false);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setMutationKey("");
    }
  }

  async function handleUnsubscribe(subscription) {
    const confirmed = window.confirm(
      `Unsubscribe from ${subscription.creator.display_name}? You will not receive future newsletters.`,
    );
    if (!confirmed) {
      return;
    }

    setMutationKey(`delete-${subscription.id}`);
    setError("");
    setSuccessMessage("");

    try {
      await deleteNewsletterSubscription(token, subscription.id);
      setSuccessMessage(`Unsubscribed from ${subscription.creator.display_name}.`);
      await loadDirectory(false);
    } catch (apiError) {
      handleApiError(apiError);
    } finally {
      setMutationKey("");
    }
  }

  if (loading) {
    return (
      <div className="ui-card flex min-h-72 items-center justify-center p-6 text-sm font-medium text-zinc-600">
        Loading newsletter subscriptions...
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Reader Workspace</p>
          <h1 className="page-title">Newsletter Subscriptions</h1>
          <p className="page-subtitle">
            Discover active GhostWriter creators and control which newsletters reach your inbox.
          </p>
        </div>
        <button className="btn-secondary shrink-0" type="button" onClick={() => loadDirectory(false)} disabled={refreshing}>
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <div aria-live="polite" className="space-y-3">
        {successMessage && <p className="status-success">{successMessage}</p>}
        {error && <p className="status-error">{error}</p>}
      </div>

      <section className="space-y-4" aria-labelledby="current-subscriptions-title">
        <div>
          <h2 className="section-title" id="current-subscriptions-title">Current Subscriptions</h2>
          <p className="mt-1 text-sm text-zinc-600">Pause delivery temporarily, resume it, or unsubscribe completely.</p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="ui-card p-7 text-center">
            <MailCheck aria-hidden="true" className="mx-auto h-9 w-9 text-zinc-300" />
            <h3 className="mt-3 text-base font-semibold text-zinc-950">No subscriptions yet</h3>
            <p className="mt-2 text-sm text-zinc-600">Browse the active creators below to find a newsletter.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {subscriptions.map((subscription) => {
              const isActive = subscription.status === "active";
              const isChanging = mutationKey === `status-${subscription.id}`;
              const isDeleting = mutationKey === `delete-${subscription.id}`;

              return (
                <article className="ui-card p-5" key={subscription.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-zinc-950">
                        {subscription.creator.display_name}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-cyan-700">{subscription.creator.topic}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}>
                      {isActive ? "Active" : "Paused"}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">{subscription.creator.bio}</p>
                  {!subscription.creator.is_active && (
                    <p className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600">
                      This creator is currently inactive and hidden from the directory.
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => handleStatusChange(subscription, isActive ? "paused" : "active")}
                      disabled={isChanging || isDeleting || mutationKey !== ""}
                    >
                      {isActive ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
                      {isChanging ? "Updating..." : isActive ? "Pause" : "Resume"}
                    </button>
                    <button
                      className="btn-danger"
                      type="button"
                      onClick={() => handleUnsubscribe(subscription)}
                      disabled={isChanging || isDeleting || mutationKey !== ""}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      {isDeleting ? "Unsubscribing..." : "Unsubscribe"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-zinc-200 pt-8" aria-labelledby="creator-directory-title">
        <div>
          <h2 className="section-title" id="creator-directory-title">Active Creator Directory</h2>
          <p className="mt-1 text-sm text-zinc-600">Only active creators and their published newsletter previews appear here.</p>
        </div>

        {creators.length === 0 ? (
          <div className="ui-card p-8 text-center">
            <Users aria-hidden="true" className="mx-auto h-10 w-10 text-zinc-300" />
            <h3 className="mt-4 text-base font-semibold text-zinc-950">No active creators</h3>
            <p className="mt-2 text-sm text-zinc-600">Check back after writers join the directory.</p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {creators.map((creator) => {
              const currentSubscription = subscriptionsByCreatorId.get(creator.id);
              const isOwnCreator = creator.id === ownCreatorId;
              const isSubscribing = mutationKey === `subscribe-${creator.id}`;

              return (
                <article className="ui-card overflow-hidden" key={creator.id}>
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-zinc-950">{creator.display_name}</h3>
                        <span className="tag-pill mt-2">{creator.topic}</span>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{creator.bio}</p>
                      </div>

                      {isOwnCreator ? (
                        <span className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
                          Your Profile
                        </span>
                      ) : currentSubscription ? (
                        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          currentSubscription.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}>
                          {currentSubscription.status === "active" ? "Subscribed" : "Paused"}
                        </span>
                      ) : (
                        <button
                          className="btn-primary shrink-0"
                          type="button"
                          onClick={() => handleSubscribe(creator)}
                          disabled={mutationKey !== ""}
                        >
                          <MailPlus aria-hidden="true" className="h-4 w-4" />
                          {isSubscribing ? "Subscribing..." : "Subscribe"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                    <h4 className="text-sm font-semibold text-zinc-900">Published Newsletters</h4>
                    {creator.newsletters.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-500">No published newsletters yet.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {creator.newsletters.map((newsletter) => (
                          <section className="rounded-lg border border-zinc-200 bg-white p-4" key={newsletter.id}>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                              <h5 className="text-sm font-semibold text-zinc-950">{newsletter.title}</h5>
                              <time className="shrink-0 text-xs text-zinc-500" dateTime={newsletter.published_at}>
                                {formatPublishedDate(newsletter.published_at)}
                              </time>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-zinc-600">
                              {newsletter.generated_content_preview}
                            </p>
                          </section>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}


export default NewsletterSubscriptions;
