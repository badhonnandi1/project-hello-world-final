import { useState } from "react";

import { analyzeWritingSample } from "./shafin";

const MIN_WORDS = 150;
const MAX_WORDS = 1000;

// This function counts the words in the pasted sample.
function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// This component lets a user paste a writing sample and view its full analysis.
function WritingAnalyzer({ token, onUnauthorized }) {
  const [sampleText, setSampleText] = useState("");
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const wordCount = countWords(sampleText);
  const isWithinLimit = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;

  // This function updates the textarea as the user types.
  function handleTextChange(event) {
    setSampleText(event.target.value);
    setErrorMessage("");
  }

  // This function sends the sample to the backend analyzer.
  async function handleAnalyze(event) {
    event.preventDefault();
    setErrorMessage("");
    setResult(null);

    if (!isWithinLimit) {
      setErrorMessage(
        `Please paste between ${MIN_WORDS} and ${MAX_WORDS} words (currently ${wordCount}).`
      );
      return;
    }

    setIsLoading(true);

    try {
      const analysis = await analyzeWritingSample(token, {
        content_text: sampleText,
      });
      setResult(analysis);
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized();
        return;
      }
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const profile = result?.analysis_profile;

  return (
    <section className="analyzer-page">
      <h1>Writing Sample Analyzer</h1>
      <p className="dashboard-description">
        Paste a writing sample (150–1000 words) to discover its tone, readability,
        pacing, keywords, and the style profile GhostWriter AI will use to imitate
        your voice.
      </p>

      <form className="analyzer-form-card knowledge-form" onSubmit={handleAnalyze}>
        <label className="knowledge-label" htmlFor="analyzer-text">
          Your writing sample
        </label>
        <textarea
          id="analyzer-text"
          rows={10}
          value={sampleText}
          onChange={handleTextChange}
          placeholder="Paste your writing here..."
        />

        <div className="analyzer-word-count">
          <span className={isWithinLimit ? "word-count-ok" : "word-count-bad"}>
            {wordCount} words
          </span>
          <span className="muted">
            (minimum {MIN_WORDS}, maximum {MAX_WORDS})
          </span>
        </div>

        {errorMessage && <p className="knowledge-error">{errorMessage}</p>}

        <button className="analyzer-submit" type="submit" disabled={isLoading || !isWithinLimit}>
          {isLoading ? "Analyzing..." : "Analyze Sample"}
        </button>
      </form>

      {result && (
        <div className="analyzer-results">
          <h2>Analysis Results</h2>

          <div className="analyzer-grid">
            <div className="analyzer-card">
              <h3>Overview</h3>
              <div className="knowledge-metadata">
                <span>{profile.overview.word_count} words</span>
                <span>{profile.overview.sentence_count} sentences</span>
                <span>{profile.overview.paragraph_count} paragraphs</span>
                <span>{result.avg_sentence_length} words/sentence</span>
              </div>
            </div>

            <div className="analyzer-card">
              <h3>Readability</h3>
              <p className="analyzer-big-number">
                {profile.readability.flesch_reading_ease}
                <small> / 100 Flesch score</small>
              </p>
              <div className="knowledge-metadata">
                <span>{profile.readability.difficulty}</span>
                <span>lexical diversity {profile.readability.lexical_diversity}</span>
              </div>
            </div>

            <div className="analyzer-card">
              <h3>Tone & Style</h3>
              <div className="knowledge-metadata">
                <span>{result.tone}</span>
                <span>{result.vocabulary_level} vocabulary</span>
                <span>{result.hook_style}</span>
                <span>{result.storytelling_style}</span>
                <span>{result.paragraph_structure}</span>
                <span>emoji: {result.emoji_usage}</span>
                <span>{result.cta_pattern}</span>
              </div>
            </div>

            <div className="analyzer-card">
              <h3>Pacing</h3>
              <div className="knowledge-metadata">
                <span>{profile.pacing.label}</span>
                <span>{profile.pacing.short_sentence_pct}% short sentences</span>
                <span>{profile.pacing.long_sentence_pct}% long sentences</span>
              </div>
            </div>

            <div className="analyzer-card">
              <h3>Grammar Health</h3>
              <div className="knowledge-metadata">
                <span>
                  {profile.grammar.issue_count} issues · severity {profile.grammar.severity}
                </span>
              </div>
              {profile.grammar.issues.length > 0 && (
                <ul className="analyzer-issue-list">
                  {profile.grammar.issues.map((issue, index) => (
                    <li key={index}>
                      <strong>{issue.type}:</strong> {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="analyzer-card">
              <h3>Top Keywords</h3>
              <div className="knowledge-tags">
                {profile.keywords.top_words.map((word) => (
                  <span key={word} className="knowledge-tag">{word}</span>
                ))}
              </div>
              <h3>Key Phrases</h3>
              <div className="knowledge-tags">
                {profile.keywords.top_bigrams.map((phrase) => (
                  <span key={phrase} className="knowledge-tag">{phrase}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="analyzer-card analyzer-profile-card">
            <h3>Ghostwriter Style Profile</h3>
            <p>{profile.author_style_profile.summary}</p>
            <div className="knowledge-tags">
              {profile.author_style_profile.voice_traits.map((trait) => (
                <span key={trait} className="knowledge-tag">{trait}</span>
              ))}
            </div>
            <h3>Imitation Guidance</h3>
            <ul className="analyzer-issue-list">
              {Object.entries(profile.author_style_profile.imitation_guidance).map(
                ([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {value}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

export default WritingAnalyzer;