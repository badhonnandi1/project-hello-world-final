import { useState } from "react";


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


// This component displays the common dashboard after login.
function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState("home");
  const [showFeatures, setShowFeatures] = useState(false);

  // This function changes the dashboard body without reloading the page.
  function openPage(pageName) {
    setActivePage(pageName);
    setShowFeatures(false);
  }

  // This function shows a temporary message until the Add Item form is built.
  function handleAddItem() {
    alert("Add Item form will be added later.");
  }

  // This function shows a temporary message for sample card buttons.
  function handleKnowledgeAction(actionName) {
    alert(`${actionName} functionality will be added later.`);
  }

  // This function connects the SignOut button to the logout logic from App.jsx.
  function handleSignOut() {
    onLogout();
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

  // This function renders the sample Knowledge Vault body.
  function renderKnowledgeVault() {
    return (
      <section className="knowledge-page">
        <h1>Knowledge Vault</h1>
        <p className="dashboard-description">
          Save and organize your stories, achievements, lessons, opinions, and facts.
        </p>

        <div className="knowledge-actions">
          <div className="knowledge-search">
            <label className="visually-hidden" htmlFor="knowledge-search">
              Search your saved knowledge
            </label>
            <span aria-hidden="true">⌕</span>
            <input id="knowledge-search" type="search" placeholder="Search your saved knowledge" />
          </div>

          <button className="add-item-button" type="button" onClick={handleAddItem}>
            ⊕ Add Item
          </button>
        </div>

        <article className="knowledge-card">
          <h2>How We Helped a Customer Win</h2>
          <p>
            By mapping their goals to a simple rollout plan, the customer hit their target two
            months ahead of schedule.
          </p>

          <div className="card-actions">
            <button type="button" onClick={() => handleKnowledgeAction("View")}>
              View
            </button>
            <button type="button" onClick={() => handleKnowledgeAction("Edit")}>
              Edit
            </button>
            <button type="button" onClick={() => handleKnowledgeAction("Archive")}>
              Archive
            </button>
          </div>
        </article>
      </section>
    );
  }

  // This function renders the user's simple profile body.
  function renderProfile() {
    return (
      <section>
        <h1>My Profile</h1>

        <div className="profile-card">
          <p>
            <strong>User ID:</strong> {user.id}
          </p>
          <p>
            <strong>Username:</strong> {user.user_name}
          </p>
          <p>
            <strong>Phone Number:</strong> {user.phone_number}
          </p>
        </div>
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
      return renderKnowledgeVault();
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

      <main className="dashboard-main">{renderDashboardBody()}</main>

      <footer className="dashboard-footer">
        <strong>GhostWriter AI</strong>
        <span>© 2026 GhostWriter AI</span>
      </footer>
    </div>
  );
}

export default Dashboard;
