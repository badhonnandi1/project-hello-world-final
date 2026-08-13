import { useEffect, useState } from "react";
import {
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import {
  getVoiceProfile,
  generateVoiceProfile,
  updateVoiceProfile,
  createVoiceProfile,
} from "./prithula";

function VoiceProfile({ token: providedToken }) {
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

  const token = providedToken || localStorage.getItem("access_token");

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
          // No profile exists yet -> create one
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

  function renderGeneratedValue(label, value) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3" key={label}>
        <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
        <dd className="mt-1 text-sm font-medium text-zinc-900">{value || "Not set"}</dd>
      </div>
    );
  }

  function renderTopicsToAvoid() {
    if (!generatedProfile?.topics_to_avoid) {
      return "Not set";
    }

    if (Array.isArray(generatedProfile.topics_to_avoid)) {
      return generatedProfile.topics_to_avoid.join(", ");
    }

    return generatedProfile.topics_to_avoid;
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="eyebrow">Writing Identity</p>
        <h1 className="page-title">Voice Profile</h1>
        <p className="page-subtitle">
          Manage how GhostWriter writes on your behalf across tone, structure, formatting, and boundaries.
        </p>
      </header>

      <section className="ui-card p-5 sm:p-6">
        {!generatedProfile ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <Sparkles aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <h2 className="section-title">Generated Voice Profile</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Your personal writing preferences will appear here after generating a profile.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-title">Generated Voice Profile</h2>
                <p className="text-sm text-zinc-600">Review the generated profile before saving changes.</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {renderGeneratedValue("Tone", generatedProfile.tone)}
              {renderGeneratedValue("Vocabulary Level", generatedProfile.vocabulary_level)}
              {renderGeneratedValue("Sentence Style", generatedProfile.sentence_style)}
              {renderGeneratedValue("Storytelling", generatedProfile.storytelling_preference)}
              {renderGeneratedValue("Emoji Preference", generatedProfile.emoji_preference)}
              {renderGeneratedValue("CTA Style", generatedProfile.cta_style)}
              {renderGeneratedValue("Topics To Avoid", renderTopicsToAvoid())}
            </dl>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="ui-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
              <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="section-title">Core Attributes</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="field-label" htmlFor="voice-tone">Tone</label>
              <select
                className="form-input"
                id="voice-tone"
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

            <div className="space-y-2">
              <label className="field-label" htmlFor="voice-vocabulary">Vocabulary Level</label>
              <select
                className="form-input"
                id="voice-vocabulary"
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

            <div className="space-y-2">
              <label className="field-label" htmlFor="voice-sentence-style">Sentence Style</label>
              <select
                className="form-input"
                id="voice-sentence-style"
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
        </section>

        <section className="ui-card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="section-title">Formatting and Content</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="field-label" htmlFor="voice-storytelling">Storytelling Preference</label>
              <select
                className="form-input"
                id="voice-storytelling"
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

            <div className="space-y-2">
              <label className="field-label" htmlFor="voice-emoji">Emoji Preference</label>
              <select
                className="form-input"
                id="voice-emoji"
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

            <div className="space-y-2">
              <label className="field-label" htmlFor="voice-cta">CTA Style</label>
              <select
                className="form-input"
                id="voice-cta"
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

            <div className="space-y-2">
              <label className="field-label" htmlFor="voice-topics-to-avoid">Topics To Avoid</label>
              <textarea
                className="form-input min-h-32 resize-y leading-6"
                id="voice-topics-to-avoid"
                rows="5"
                placeholder="Example: Politics, Religion, Violence"
                value={profile.topics_to_avoid}
                onChange={(e) =>
                  updateField("topics_to_avoid", e.target.value)
                }
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          className="btn-secondary"
          type="button"
          onClick={handleGenerateProfile}
        >
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          Generate Profile
        </button>

        <button
          className="btn-primary"
          type="button"
          onClick={handleSaveProfile}
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </section>
  );
}

export default VoiceProfile;
