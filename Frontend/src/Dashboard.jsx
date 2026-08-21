import { useEffect, useState } from "react";
import KnowledgeVault from "./KnowledgeVault";
import GuidedInterview from "./GuidedInterview"
import WritingAnalyzer from "./WritingAnalyzer";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Mic,
  Palette,
  PenTool,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";


import AudienceOpportunities from "./AudienceOpportunities";

import { getMyProfile, saveMyProfile } from "./badhon";
import VoiceProfile from "./VoiceProfile";
import VoiceInterview from "./VoiceInterview";
import CampaignManagement from "./CampaignManagement";
import WritingStylePresets from "./WritingStylePresets";
import ContentPlanCalendar from "./ContentPlanCalendar";
import PrivacyGuardrails from "./PrivacyGuardrails";
import PostGeneration from "./PostGeneration";


// Future API endpoints can be connected to each feature from this list.
const features = [
  { id: "guided-interview", name: "Guided Interview" },
  { id: "knowledge-vault", name: "Knowledge Vault" },
  { id: "campaign-management", name: "Campaign Management" },
  { id: "subscription-management", name: "Subscription Management" },
  { id: "voice-interview", name: "Voice Interview" },
  { id: "rag-retrieval", name: "RAG Retrieval" },
  { id: "content-plan-generator", name: "Content Plan Generator" },
  { id: "publishing-calendar", name: "Publishing Calendar" },
  { id: "writing-sample-analyzer", name: "Writing Sample Analyzer" },
  { id: "personal-voice-profile", name: "Personal Voice Profile" },
  { id: "privacy-guardrails", name: "Privacy Guardrails" },
  { id: "writing-style-presets", name: "Writing Style Presets" },
  { id: "post-generation", name: "Post Generation" },
  { id: "rewrite-laboratory", name: "Rewrite Laboratory" },
  { id: "quality-checker", name: "Quality Checker" },
  { id: "review-and-approval", name: "Review and Approval" },
];
const workspaceNavigation = [
  {
    id: "home",
    name: "Home",
    icon: Home,
    description: "Your writing operations overview.",
  },
  {
    id: "guided-interview",
    name: "Guided Interview",
    icon: MessageCircle,
    description: "Capture raw ideas through a guided prompt flow.",
  },
  {
    id: "knowledge-vault",
    name: "Knowledge Vault",
    icon: BookOpen,
    description: "Store stories, lessons, facts, and reusable context.",
  },
  {
    id: "audience-opportunities",
    name: "Audience Opportunities",
    icon: ClipboardList,
    description: "Turn audience questions and objections into content ideas.",
  },
  {
    id: "campaign-management",
    name: "Campaign Management",
    icon: Megaphone,
    description: "Plan campaign goals, themes, and publishing motion.",
  },
  {
    id: "subscription-management",
    name: "Subscription Management",
    icon: CreditCard,
    description: "Manage plan details and account access.",
  },
  {
    id: "voice-interview",
    name: "Voice Interview",
    icon: Mic,
    description: "Record spoken ideas and convert them into transcripts.",
  },
  {
    id: "rag-retrieval",
    name: "RAG Retrieval",
    icon: Search,
    description: "Retrieve relevant saved knowledge for generation.",
  },
  {
    id: "content-plan-generator",
    name: "Content Plan Generator",
    icon: CalendarDays,
    description: "Shape saved knowledge into a content plan.",
  },
];

const contentNavigation = [
  {
    id: "personal-voice-profile",
    name: "Voice Profile",
    icon: PenTool,
    description: "Tune tone, vocabulary, story style, and formatting rules.",
  },
  {
    id: "publishing-calendar",
    name: "Publishing Calendar",
    icon: CalendarDays,
    description: "Coordinate dates, channels, and publishing cadence.",
  },
  {
    id: "writing-sample-analyzer",
    name: "Writing Sample Analyzer",
    icon: ClipboardList,
    description: "Analyze samples for repeatable writing patterns.",
  },
  {
    id: "privacy-guardrails",
    name: "Privacy Guardrails",
    icon: ShieldCheck,
    description: "Keep sensitive details controlled before generation.",
  },
  {
    id: "writing-style-presets",
    name: "Writing Style Presets",
    icon: Palette,
    description: "Create presets for different formats and audiences.",
  },
  {
    id: "post-generation",
    name: "Post Generation",
    icon: FileText,
    description: "Draft polished posts from your saved context.",
  },
  {
    id: "rewrite-laboratory",
    name: "Rewrite Laboratory",
    icon: RefreshCw,
    description: "Experiment with alternate versions and angles.",
  },
  {
    id: "quality-checker",
    name: "Quality Checker",
    icon: BadgeCheck,
    description: "Review drafts before they move to approval.",
  },
  {
    id: "review-and-approval",
    name: "Review and Approval",
    icon: ClipboardList,
    description: "Track review status and publishing readiness.",
  },
];

const navigationSections = [
  { label: "Workspace", items: workspaceNavigation },
  { label: "Content Workflow", items: contentNavigation },
];

const allNavigationItems = [...workspaceNavigation, ...contentNavigation];


// This component displays the common dashboard after login.
function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  const token = localStorage.getItem("access_token");

  // This effect sends users without a saved app profile to the Profile page.
  useEffect(() => {
    async function checkProfile() {
      setProfileLoading(true);
      setProfileError("");

      try {
        const savedProfile = await getMyProfile(token);
        setProfile(savedProfile);
        setProfileForm({
          full_name: savedProfile.full_name,
          email: savedProfile.email,
        });
      } catch (error) {
        if (error.status === 404) {
          setActivePage("profile");
          setProfileError("Please complete your profile before using GhostWriter AI.");
        } else if (error.status === 401) {
          onLogout();
        } else {
          setProfileError(error.message);
          setActivePage("profile");
        }
      } finally {
        setProfileLoading(false);
      }
    }

    checkProfile();
  }, []);

  // This function changes the dashboard body without reloading the page.
  function openPage(pageName) {
    if (!profile && !profileLoading && pageName !== "profile") {
      setActivePage("profile");
      setProfileError("Please complete your profile before using GhostWriter AI.");
      setIsSidebarOpen(false);
      return;
    }

    setActivePage(pageName);
    setIsSidebarOpen(false);
  }

  // This function connects the SignOut button to the logout logic from App.jsx.
  function handleSignOut() {
    onLogout();
  }

  // This function updates the profile form as the user types.
  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm({
      ...profileForm,
      [name]: value,
    });
  }

  // This function saves the app profile, then sends the user to Home.
  async function handleProfileSave(event) {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");

    if (!profileForm.full_name.trim() || !profileForm.email.trim()) {
      setProfileError("Full name and email are required.");
      return;
    }

    setProfileSaving(true);

    try {
      const savedProfile = await saveMyProfile(token, profileForm);
      setProfile(savedProfile);
      setProfileForm({
        full_name: savedProfile.full_name,
        email: savedProfile.email,
      });
      setProfileMessage("Profile saved successfully.");
      setActivePage("home");
    } catch (error) {
      if (error.status === 401) {
        onLogout();
      } else {
        setProfileError(error.message);
      }
    } finally {
      setProfileSaving(false);
    }
  }

  // This function finds the name for the selected feature.
  function getActiveFeatureName() {
    if (activePage === "profile") {
      return "Profile";
    }

    const selectedFeature = allNavigationItems.find((feature) => feature.id === activePage);
    return selectedFeature ? selectedFeature.name : "Feature";
  }

  function getUserInitial() {
    return (profile?.full_name || user.user_name || "G").trim().charAt(0).toUpperCase();
  }

  function renderNavButton(item) {
    const Icon = item.icon;
    const isActive = activePage === item.id;

    return (
      <button
        aria-current={isActive ? "page" : undefined}
        className={`focus-ring group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
          isActive
            ? "bg-white text-zinc-950 shadow-sm"
            : "text-zinc-300 hover:bg-white/10 hover:text-white"
        }`}
        key={item.id}
        type="button"
        onClick={() => openPage(item.id)}
      >
        <Icon
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 ${
            isActive ? "text-cyan-600" : "text-zinc-500 group-hover:text-zinc-200"
          }`}
        />
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
      </button>
    );
  }

  function renderSidebar() {
    const isProfileActive = activePage === "profile";

    return (
      <>
        {isSidebarOpen && (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
            type="button"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col bg-zinc-950 text-white shadow-2xl transition-transform duration-200 lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-zinc-950">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">GhostWriter AI</p>
              <p className="truncate text-xs text-zinc-400">AI writing workspace</p>
            </div>
            <button
              aria-label="Close navigation"
              className="focus-ring rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white lg:hidden"
              type="button"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Primary navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
            {navigationSections.map((section) => (
              <div key={section.label}>
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {section.label}
                </p>
                <div className="space-y-1">{section.items.map(renderNavButton)}</div>
              </div>
            ))}
          </nav>

          <div className="space-y-3 border-t border-white/10 p-4">
            <button
              aria-current={isProfileActive ? "page" : undefined}
              className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                isProfileActive ? "bg-white text-zinc-950" : "text-zinc-200 hover:bg-white/10 hover:text-white"
              }`}
              type="button"
              onClick={() => openPage("profile")}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-cyan-300">
                {getUserInitial()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">Profile</span>
                <span className="block truncate text-xs text-zinc-400">{user.user_name}</span>
              </span>
              <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-500" />
            </button>

            <button
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-rose-500/15 hover:text-rose-100"
              type="button"
              onClick={handleSignOut}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>
      </>
    );
  }

  // This function renders the home page body.
  function renderHome() {
    const quickActions = [
      workspaceNavigation[1],
      workspaceNavigation[2],
      workspaceNavigation[3],
      workspaceNavigation[6],
    ];

    return (
      <section className="space-y-6">
        <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <p className="eyebrow">Workspace Overview</p>
            <h1 className="page-title">Welcome to GhostWriter AI</h1>
            <p className="page-subtitle">
              Create, organize, review, and manage professional content from one focused dashboard.
            </p>
          </div>

          <div className="ui-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-800">
                {getUserInitial()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-950">{profile?.full_name || user.user_name}</p>
                <p className="truncate text-xs text-zinc-500">Logged in as {user.user_name}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="focus-ring ui-card group p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-soft"
                key={item.id}
                type="button"
                onClick={() => openPage(item.id)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-base font-semibold text-zinc-950">{item.name}</span>
                <span className="mt-2 block text-sm leading-6 text-zinc-600">{item.description}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <section className="ui-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="section-title">Production Workspace</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Move from captured context to ready-to-review content with fewer handoffs.
                </p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => openPage("knowledge-vault")}>
                <BookOpen aria-hidden="true" className="h-4 w-4" />
                Open Vault
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Capture", "Interviews and vault entries collect raw context."],
                ["Shape", "RAG and content planning prepare source-backed drafts."],
                ["Review", "Quality and approval tools keep final content controlled."],
              ].map(([title, body]) => (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4" key={title}>
                  <p className="text-sm font-semibold text-zinc-950">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ui-card p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <WandSparkles aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-title">Profile Status</h2>
                <p className="text-sm text-zinc-600">{profile ? "Ready for generation" : "Profile required"}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              Your profile gives GhostWriter AI the basic account context it needs before feature work begins.
            </p>
            <button className="btn-secondary mt-5 w-full" type="button" onClick={() => openPage("profile")}>
              <UserRound aria-hidden="true" className="h-4 w-4" />
              Manage Profile
            </button>
          </section>
        </div>
      </section>
    );
  }

  // This function renders the user's simple profile body.
  function renderProfile() {
    return (
      <section className="space-y-6">
        <header>
          <p className="eyebrow">Account</p>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">
            Keep your basic identity details current before using GhostWriter AI features.
          </p>
        </header>

        <form className="ui-card max-w-3xl space-y-5 p-5 sm:p-6" onSubmit={handleProfileSave}>
          {profileMessage && <p className="status-success">{profileMessage}</p>}
          {profileError && <p className="status-error">{profileError}</p>}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Phone Number</p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">{user.phone_number}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="field-label" htmlFor="profile-full-name">Full Name</label>
              <input
                className="form-input"
                id="profile-full-name"
                name="full_name"
                type="text"
                value={profileForm.full_name}
                onChange={handleProfileChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="field-label" htmlFor="profile-email">Email</label>
              <input
                className="form-input"
                id="profile-email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                required
              />
            </div>
          </div>

          {profile && (
            <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <BadgeCheck aria-hidden="true" className="h-4 w-4" />
              Profile Status: Saved
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
            <button className="btn-primary" type="submit" disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </section>
    );
  }

  // This function renders a simple placeholder for unfinished features.
  function renderFeaturePlaceholder(featureName) {
    const activeFeature = allNavigationItems.find((feature) => feature.id === activePage);
    const Icon = activeFeature?.icon || Sparkles;

    return (
      <section className="space-y-6">
        <header>
          <p className="eyebrow">Feature Workspace</p>
          <h1 className="page-title">{featureName}</h1>
          <p className="page-subtitle">
            This feature interface and API connection will be added in the next development phase.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="ui-card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                <Icon aria-hidden="true" className="h-6 w-6" />
              </div>
              <div>
                <h2 className="section-title">{featureName} Tools</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  The dashboard frame is ready, and this area will hold the controls, data, and workflow for the feature when it is connected.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Inputs", "Workspace", "Review"].map((label) => (
                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4" key={label}>
                  <p className="text-sm font-semibold text-zinc-700">{label}</p>
                  <div className="mt-4 h-2 rounded-full bg-zinc-200" />
                  <div className="mt-2 h-2 w-2/3 rounded-full bg-zinc-200" />
                </div>
              ))}
            </div>
          </div>

          <aside className="ui-card p-5">
            <h2 className="section-title">Status</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Planned feature page. Existing navigation behavior is preserved.
            </p>
            <button className="btn-secondary mt-5 w-full" type="button" onClick={() => openPage("home")}>
              <Home aria-hidden="true" className="h-4 w-4" />
              Back to Home
            </button>
          </aside>
        </div>
      </section>
    );
  }

  // This function changes the body based on the selected feature.
  function renderDashboardBody() {
    if (activePage === "home") {
      return renderHome();
    }

    if (activePage === "knowledge-vault") {
      return (
        <KnowledgeVault
          token={token}
          onUnauthorized={handleSignOut}
        />
      );
    }

    if (activePage === "audience-opportunities") {
      return (
        <AudienceOpportunities
          token={token}
          onUnauthorized={handleSignOut}
        />
      );
    }
    if (activePage === "guided-interview") {
      return (
        <GuidedInterview
          token={token}
          onUnauthorized={handleSignOut}
        />
      );
    }

    if (activePage === "writing-sample-analyzer") {
      return (
        <WritingAnalyzer
          token={token}
          onUnauthorized={handleSignOut}
        />
      );
    }
    if (activePage === "publishing-calendar") {
      return (
        <ContentPlanCalendar
          token={token}
          onUnauthorized={handleSignOut}
        />
      );
    }



    if (activePage === "personal-voice-profile") {
      return (
        <VoiceProfile
          token={token}
          onUnauthorized={handleSignOut}
        />
      );
    }

    if (activePage === "voice-interview") {
      return (
        <VoiceInterview
          token={token}
          onUnauthorized={handleSignOut}
        />
      );
    }
    if (activePage === "writing-style-presets") {
      return (
        <WritingStylePresets
           token={token}
           onUnauthorized={handleSignOut}
        />
      );
    }
    if (activePage === "privacy-guardrails") {
      return (
        <PrivacyGuardrails
           token={token}
           onUnauthorized={handleSignOut}
        />
      );
    }
    if (activePage === "post-generation") {

      return (
        <PostGeneration
          token={token}
          onUnauthorized={handleSignOut}
        />
      );

    }
    if (activePage === "campaign-management") {
      return (
        <CampaignManagement
          token={token}
          onUnauthorized={handleSignOut}
        />
      );
    }

    if (activePage === "profile") {
      return renderProfile();
    }

    return renderFeaturePlaceholder(getActiveFeatureName());
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 lg:pl-72">
      <button
        aria-label="Open navigation"
        className="focus-ring fixed left-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800 shadow-sm lg:hidden"
        type="button"
        onClick={() => setIsSidebarOpen(true)}
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      {renderSidebar()}

      <main className="min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-6 pt-20 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex-1">
            {profileLoading ? (
              <div className="ui-card flex min-h-[18rem] items-center justify-center p-6 text-sm font-medium text-zinc-600">
                Loading dashboard...
              </div>
            ) : (
              renderDashboardBody()
            )}
          </div>

          <footer className="mt-10 flex flex-col gap-2 border-t border-zinc-200 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold text-zinc-700">GhostWriter AI</span>
            <span>{getActiveFeatureName()} workspace</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
