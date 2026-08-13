import { useEffect, useState } from "react";
import KnowledgeVault from "./KnowledgeVault";
import GuidedInterview from "./GuidedInterview"
import WritingAnalyzer from "./WritingAnalyzer";
import { getMyProfile, saveMyProfile } from "./badhon";
import VoiceProfile from "./VoiceProfile";
import VoiceInterview from "./VoiceInterview";


// Future API endpoints can be connected to each feature from this list.
const features = [
  { id: "guided-interview", name: "Guided Interview" },
  { id: "knowledge-vault", name: "Knowledge Vault" },
  { id: "campaign-management", name: "Campaign Management" },
  { id: "subscription-management", name: "Subscription Management" },git
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


// This component displays the common dashboard after login.
function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState("home");
  const [showFeatures, setShowFeatures] = useState(false);
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
        setActivePage("home");
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
      return;
    }

    setActivePage(pageName);
    setShowFeatures(false);
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
    const selectedFeature = features.find((feature) => feature.id === activePage);
    return selectedFeature ? selectedFeature.name : "Feature";
  }

  // This function renders the home page body.
  function renderHome() {
    return (
      <section>
        <h1>Welcome to GhostWriter AI</h1>
        <p className="dashboard-description">
          Create, organize, review, and manage your professional content from one dashboard.
        </p>

        <div className="home-card">
          <h2>Welcome, {user.user_name}</h2>
          <p>Choose a feature from the navigation menu to get started.</p>
        </div>
      </section>
    );
  }

  // This function renders the user's simple profile body.
  function renderProfile() {
    return (
      <section>
        <h1>My Profile</h1>

        <form className="profile-card profile-form" onSubmit={handleProfileSave}>
          {profileMessage && <p className="knowledge-message">{profileMessage}</p>}
          {profileError && <p className="knowledge-error">{profileError}</p>}


          <p>
            <strong>Phone Number:</strong> {user.phone_number}
          </p>

          <label htmlFor="profile-full-name">Full Name</label>
          <input
            id="profile-full-name"
            name="full_name"
            type="text"
            value={profileForm.full_name}
            onChange={handleProfileChange}
            required
          />

          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            name="email"
            type="email"
            value={profileForm.email}
            onChange={handleProfileChange}
            required
          />

          {profile && (
            <p>
              <strong>Profile Status:</strong> Saved
            </p>
          )}

          <button type="submit" disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save"}
          </button>
        </form>
      </section>
    );
  }

  // This function renders a simple placeholder for unfinished features.
  function renderFeaturePlaceholder(featureName) {
    return (
      <section>
        <h1>{featureName}</h1>
        <p className="dashboard-description">
          This feature interface and API connection will be added in the next development phase.
        </p>

        <div className="placeholder-card">
          <p>{featureName} tools will appear here later.</p>
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


    if (activePage === "guided-interview") {
      return (
        <GuidedInterview

    if (activePage === "writing-sample-analyzer") {
      return (
        <WritingAnalyzer

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

    if (activePage === "profile") {
      return renderProfile();
    }

    return renderFeaturePlaceholder(getActiveFeatureName());
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-navbar">
        <div className="dashboard-brand">GhostWriter AI</div>

        <div className="dashboard-navigation">
          <button className="nav-button" type="button" onClick={() => openPage("home")}>
            Home
          </button>

          <div className="features-container">
            <button
              className="nav-button"
              type="button"
              onClick={() => setShowFeatures(!showFeatures)}
            >
              Features ▾
            </button>

            {showFeatures && (
              <div className="features-dropdown">
                {features.map((feature) => (
                  <button key={feature.id} type="button" onClick={() => openPage(feature.id)}>
                    {feature.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="nav-button" type="button" onClick={handleSignOut}>
            SignOut
          </button>

          <button className="profile-button" type="button" onClick={() => openPage("profile")}>
            Profile
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        {profileLoading ? <p>Loading dashboard...</p> : renderDashboardBody()}
      </main>

      <footer className="dashboard-footer">
        <strong>GhostWriter AI</strong>
        <span>© 2026 GhostWriter AI</span>
      </footer>
    </div>
  );
}

export default Dashboard;
