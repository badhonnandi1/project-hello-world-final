import { useEffect, useState } from "react";
import {
  getVoiceProfile,
  generateVoiceProfile,
  updateVoiceProfile,
  createVoiceProfile,
} from "./prithula";

function VoiceProfile() {
  const [profile, setProfile] = useState({
    tone: "",
    vocabulary_level: "",
    sentence_style: "",
    storytelling_preference: "",
    emoji_preference: "",
    cta_style: "",
    topics_to_avoid: "",
  });

  // Stores the generated profile summary shown in the blue box
  const [generatedProfile, setGeneratedProfile] = useState(null);

  const token = localStorage.getItem("access_token");

  function updateField(field, value) {
    setProfile((previousProfile) => ({
      ...previousProfile,
      [field]: value,
    }));
  }

  // Load previously saved profile
  useEffect(() => {
    loadVoiceProfile();
  }, []);

  async function loadVoiceProfile() {
    try {
      const data = await getVoiceProfile(token);

      if (!data) {
        return;
      }

      setProfile({
        tone: data.tone || "",
        vocabulary_level: data.vocabulary_level || "",
        sentence_style: data.sentence_style || "",
        storytelling_preference: data.storytelling_preference || "",
        emoji_preference: data.emoji_preference || "",
        cta_style: data.cta_style || "",
        topics_to_avoid: (data.topics_to_avoid || []).join(", "),
      });
    } catch (error) {
      console.log(error);
    }
  }

  // Generate profile from backend
  async function handleGenerateProfile() {
    try {
      const data = await generateVoiceProfile(token);

      // Show generated summary only
      setGeneratedProfile(data);

      alert("Voice Profile Generated Successfully!");
    } catch (error) {
      alert(error.message);
    }
  }

  // Save user's edited selections
  async function handleSaveProfile() {
    if (!generatedProfile) {
      alert("Please generate a voice profile first.");
      return;
    }

    const profileData = {
      tone: profile.tone || generatedProfile.tone,

      vocabulary_level:
        profile.vocabulary_level || generatedProfile.vocabulary_level,

      sentence_style:
        profile.sentence_style || generatedProfile.sentence_style,

      storytelling_preference:
        profile.storytelling_preference ||
        generatedProfile.storytelling_preference,

      emoji_preference:
        profile.emoji_preference || generatedProfile.emoji_preference,

      cta_style:
        profile.cta_style || generatedProfile.cta_style,

      topics_to_avoid:
        profile.topics_to_avoid.trim() !== ""
          ? profile.topics_to_avoid
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : generatedProfile.topics_to_avoid,
    };

    try {
      // Try updating an existing profile
      await updateVoiceProfile(token, profileData);

      alert("Voice Profile Saved Successfully!");

      // Update the summary to match the saved data
      setGeneratedProfile(profileData);
    } catch (error) {
      if (error.status === 404) {
        try {
          // No profile exists yet → create one
          await createVoiceProfile(token, profileData);

          alert("Voice Profile Saved Successfully!");

          setGeneratedProfile(profileData);
        } catch (createError) {
          alert(createError.message);
        }
      } else {
        alert(error.message);
      }
    }
  }

  return (
    <div className="voice-profile-page">
      <h1 className="voice-title">Personal Voice Profile</h1>

      <p className="voice-subtitle">
        Manage how GhostWriter writes on your behalf.
      </p>

      <div className="voice-info-box">
        {!generatedProfile ? (
          <p>
            Your personal writing preferences will appear here after generating
            a profile.
          </p>
        ) : (
          <div>
            <h3>Generated Voice Profile</h3>

            <p>
              <strong>Tone:</strong> {generatedProfile.tone}
            </p>

            <p>
              <strong>Vocabulary Level:</strong>{" "}
              {generatedProfile.vocabulary_level}
            </p>

            <p>
              <strong>Sentence Style:</strong>{" "}
              {generatedProfile.sentence_style}
            </p>

            <p>
              <strong>Storytelling:</strong>{" "}
              {generatedProfile.storytelling_preference}
            </p>

            <p>
              <strong>Emoji Preference:</strong>{" "}
              {generatedProfile.emoji_preference}
            </p>

            <p>
              <strong>CTA Style:</strong>{" "}
              {generatedProfile.cta_style}
            </p>

            <p>
              <strong>Topics To Avoid:</strong>{" "}
              {generatedProfile.topics_to_avoid?.join(", ")}
            </p>
          </div>
        )}
      </div>

      <div className="voice-grid">
        {/* LEFT CARD */}
        <div className="voice-card">
          <h2>Core Attributes</h2>

          <div className="field">
            <label>Tone</label>

            <select
              value={profile.tone}
              onChange={(e) => updateField("tone", e.target.value)}
            >
              <option value="">Select Tone</option>
              <option value="Professional">Professional</option>
              <option value="Friendly">Friendly</option>
              <option value="Authoritative">Authoritative</option>
              <option value="Casual">Casual</option>
            </select>
          </div>

          <div className="field">
            <label>Vocabulary Level</label>

            <select
              value={profile.vocabulary_level}
              onChange={(e) =>
                updateField("vocabulary_level", e.target.value)
              }
            >
              <option value="">Select Vocabulary</option>
              <option value="Simple">Simple</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="field">
            <label>Sentence Style</label>

            <select
              value={profile.sentence_style}
              onChange={(e) =>
                updateField("sentence_style", e.target.value)
              }
            >
              <option value="">Select Sentence Style</option>
              <option value="Short">Short</option>
              <option value="Medium">Medium</option>
              <option value="Long">Long</option>
            </select>
          </div>
        </div>

        {/* RIGHT CARD */}
        <div className="voice-card">
          <h2>Formatting &amp; Content</h2>

          <div className="field">
            <label>Storytelling Preference</label>

            <select
              value={profile.storytelling_preference}
              onChange={(e) =>
                updateField("storytelling_preference", e.target.value)
              }
            >
              <option value="">Select Preference</option>
              <option value="Narrative">Narrative</option>
              <option value="Expository">Expository</option>
              <option value="Persuasive">Persuasive</option>
            </select>
          </div>

          <div className="field">
            <label>Emoji Preference</label>

            <select
              value={profile.emoji_preference}
              onChange={(e) =>
                updateField("emoji_preference", e.target.value)
              }
            >
              <option value="">Select Preference</option>
              <option value="None">None</option>
              <option value="Minimal">Minimal</option>
              <option value="Moderate">Moderate</option>
              <option value="Frequent">Frequent</option>
            </select>
          </div>

          <div className="field">
            <label>CTA Style</label>

            <select
              value={profile.cta_style}
              onChange={(e) => updateField("cta_style", e.target.value)}
            >
              <option value="">Select CTA Style</option>
              <option value="Direct">Direct</option>
              <option value="Soft">Soft</option>
              <option value="Question">Question</option>
              <option value="Inspirational">Inspirational</option>
            </select>
          </div>

          <div className="field">
            <label>Topics To Avoid</label>

            <textarea
              rows="5"
              placeholder="Example: Politics, Religion, Violence"
              value={profile.topics_to_avoid}
              onChange={(e) =>
                updateField("topics_to_avoid", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div className="button-row">
        <button
          type="button"
          onClick={handleGenerateProfile}
        >
          Generate Profile
        </button>

        <button
          type="button"
          onClick={handleSaveProfile}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default VoiceProfile;