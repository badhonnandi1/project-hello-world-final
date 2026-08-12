""" writing sample analyzer. """

import re
from collections import Counter

STOP_WORDS = set("""a about after again all also am an and any are as at be because been
before being between both but by can could did do does doing down during each few for
from further had has have having he her here hers herself him himself his how i if in
into is it its itself just me more most my myself no nor not now of off on once only or
other our ours ourselves out over own same she should so some such than that the their
theirs them themselves then there these they this those through to too under until up
very was we were what when where which while who whom why will with would you your
yours yourself yourselves""".split())

POSITIVE_WORDS = set("""good great love loved beautiful happy joy warm wonderful amazing
excited proud hope smile laughed bright sweet calm peace enjoy enjoyed delight grateful
thankful fun best win won success perfect kind gentle soft glow celebrate favorite
awesome pleasant cheerful""".split())

NEGATIVE_WORDS = set("""bad sad angry hate hated terrible awful horrible pain painful
hurt cry cried tears fear afraid scared dark cold lonely alone lost fail failed failure
wrong worst broke broken death die died war scream screamed anger bitter grief sorrow
regret shame guilt tired exhausted nightmare disaster cruel harsh""".split())

CONTRACTION_RE = re.compile(r"\b\w+'(?:t|re|ve|ll|m|d|s)\b", re.IGNORECASE)
FIRST_PERSON = set("i me my mine we our ours us".split())
SECOND_PERSON = set("you your yours".split())
EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF☀-]")


def count_words(text):
    return len(_words(text))


def _words(text):
    return re.findall(r"[A-Za-z][A-Za-z'-]*", text)


def _sentences(text):
    text = text.replace("\r", "\n")
    chunks = re.split(r"\n+|(?<=[.!?])\s+", text)
    return [c.strip() for c in chunks if c.strip() and re.search(r"[A-Za-z]", c)]


def _paragraphs(text):
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if len(paras) <= 1 and "\n" in text:
        paras = [p.strip() for p in text.split("\n") if p.strip()]
    return paras


def _syllables(word):
    word = word.lower()
    if len(word) <= 3:
        return 1
    word = re.sub(r"(?:[^laeiouy]es|[^laeiouy]e)$", "", word)
    word = re.sub(r"^y", "", word)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", word)))


def analyze_text(text):
    sentences = _sentences(text)
    words = _words(text)
    paragraphs = _paragraphs(text)
    lower_words = [w.lower() for w in words]

    word_count = len(words)
    sentence_count = max(1, len(sentences))
    avg_sentence_length = round(word_count / sentence_count, 1)

    # ---------- Readability ----------
    syllables = sum(_syllables(w) for w in words)
    flesch = 206.835 - 1.015 * (word_count / sentence_count) - 84.6 * (syllables / max(1, word_count))
    flesch = round(max(0.0, min(100.0, flesch)), 1)
    if flesch >= 70:
        difficulty = "easy / conversational"
    elif flesch >= 50:
        difficulty = "intermediate"
    elif flesch >= 30:
        difficulty = "advanced"
    else:
        difficulty = "very complex"

    # ---------- Vocabulary / style ----------
    unique = set(lower_words)
    lexical_diversity = round(len(unique) / max(1, word_count), 2)
    avg_word_length = round(sum(len(w) for w in lower_words) / max(1, word_count), 2)
    long_ratio = sum(1 for w in unique if len(w) >= 7) / max(1, len(unique))
    if avg_word_length >= 5.0 or long_ratio >= 0.30:
        vocabulary_level = "advanced"
    elif avg_word_length >= 4.4 or long_ratio >= 0.20:
        vocabulary_level = "intermediate"
    else:
        vocabulary_level = "basic"

    # ---------- Tone ----------
    pos = sum(1 for w in lower_words if w in POSITIVE_WORDS)
    neg = sum(1 for w in lower_words if w in NEGATIVE_WORDS)
    if pos > neg and pos > 0:
        sentiment = "positive"
    elif neg > pos and neg > 0:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    exclamations = text.count("!")
    energy = "high" if exclamations >= 5 else ("moderate" if exclamations >= 1 else "calm")

    contractions = len(CONTRACTION_RE.findall(text))
    personal = sum(1 for w in lower_words if w in FIRST_PERSON or w in SECOND_PERSON)
    personal_ratio = personal / max(1, word_count)
    if contractions / sentence_count > 0.25 or personal_ratio > 0.08:
        formality = "informal"
    elif contractions == 0 and personal_ratio < 0.03:
        formality = "formal"
    else:
        formality = "semi-formal"

    tone = f"{sentiment.capitalize()}, {formality}, {energy} energy"

    # ---------- Pacing ----------
    lens = [len(_words(s)) for s in sentences]
    short_pct = round(100 * sum(1 for l in lens if l <= 8) / sentence_count)
    long_pct = round(100 * sum(1 for l in lens if l >= 25) / sentence_count)
    if avg_sentence_length <= 12 and short_pct >= 35:
        pacing_label = "fast"
    elif avg_sentence_length >= 20 or long_pct >= 30:
        pacing_label = "slow / deliberate"
    else:
        pacing_label = "moderate"

    # ---------- Keywords ----------
    freq = Counter(w for w in lower_words if w not in STOP_WORDS and len(w) > 3)
    top_words = [w for w, _ in freq.most_common(8)]
    bigrams = Counter(
        f"{lower_words[i]} {lower_words[i + 1]}"
        for i in range(len(lower_words) - 1)
        if lower_words[i] not in STOP_WORDS and lower_words[i + 1] not in STOP_WORDS
    )
    top_bigrams = [b for b, _ in bigrams.most_common(5)]

    # ---------- Grammar flags (basic, zero-cost) ----------
    issues = []
    for s in sentences:
        wl = len(_words(s))
        if wl > 35:
            issues.append({"type": "long_sentence", "message": f"Sentence has {wl} words; consider splitting it.", "example": s[:80]})
        if s and s[0].islower() and s[0].isalpha():
            issues.append({"type": "capitalization", "message": "Sentence does not start with a capital letter.", "example": s[:80]})
    for m in re.finditer(r"\b(\w+)\s+\1\b", text, re.IGNORECASE):
        issues.append({"type": "repeated_word", "message": f"Repeated word: '{m.group(1)}'.", "example": m.group(0)})
    for m in re.finditer(r"[!?]{3,}|\.{4,}", text):
        issues.append({"type": "repeated_punctuation", "message": "Repeated punctuation.", "example": m.group(0)})
    if re.search(r"\si\s", text):
        issues.append({"type": "lowercase_i", "message": "Lowercase 'i' used as a pronoun.", "example": "i"})
    issues = issues[:20]
    grammar = {
        "issue_count": len(issues),
        "severity": "low" if len(issues) <= 3 else ("medium" if len(issues) <= 8 else "high"),
        "issues": issues,
    }

    # ---------- Emoji ----------
    emoji_count = len(EMOJI_RE.findall(text))
    emoji_usage = "none" if emoji_count == 0 else ("low" if emoji_count <= 2 else ("medium" if emoji_count <= 6 else "high"))

    # ---------- Hook style ----------
    first = sentences[0] if sentences else ""
    first_len = len(_words(first))
    if first.endswith("?"):
        hook_style = "question hook"
    elif first.startswith(('"', "'")):
        hook_style = "quote hook"
    elif first_len <= 8:
        hook_style = "short punchy hook"
    elif re.match(r"(?i)^(when|that|last|one day|in the|on the|it was|there was)", first):
        hook_style = "scene-setting hook"
    else:
        hook_style = "direct statement hook"

    # ---------- CTA pattern ----------
    tail = " ".join(paragraphs[-2:]).lower()
    direct_cta = ["subscribe", "follow", "sign up", "click", "buy", "order", "join", "check out", "download", "register"]
    soft_cta = ["let me know", "share your", "tell me", "comment", "what do you think", "feel free", "reach out", "contact"]
    if any(k in tail for k in direct_cta):
        cta_pattern = "direct call-to-action"
    elif any(k in tail for k in soft_cta):
        cta_pattern = "soft call-to-action"
    else:
        cta_pattern = "none"

    # ---------- Storytelling style ----------
    first_person = sum(1 for w in lower_words if w in FIRST_PERSON)
    second_person = sum(1 for w in lower_words if w in SECOND_PERSON)
    past_tense = len(re.findall(r"\b\w+ed\b", text))
    dialogue = text.count('"') + text.count("“") + text.count("”")
    traits = []
    if first_person / max(1, word_count) > 0.02:
        traits.append("personal first-person narrative")
    if second_person / max(1, word_count) > 0.02:
        traits.append("direct address to reader")
    if past_tense / sentence_count > 0.8:
        traits.append("past-tense storytelling")
    if dialogue >= 4:
        traits.append("uses dialogue")
    if not traits:
        traits.append("expository / informational")
    storytelling_style = ", ".join(traits)

    # ---------- Paragraph structure ----------
    para_lens = [len(_words(p)) for p in paragraphs]
    avg_para = sum(para_lens) / max(1, len(para_lens))
    size = "short" if avg_para < 40 else ("medium" if avg_para <= 100 else "long")
    varied = bool(para_lens) and (max(para_lens) - min(para_lens)) > avg_para
    paragraph_structure = f"{size} paragraphs (~{round(avg_para)} words avg), {'varied' if varied else 'consistent'} structure"

    # ---------- Author style profile (for the next module) ----------
    summary = (
        f"The sample is {sentiment} and {formality} with {pacing_label} pacing, "
        f"{vocabulary_level} vocabulary, {size} paragraphs and an average sentence "
        f"length of {avg_sentence_length} words."
    )
    analysis_profile = {
        "overview": {"word_count": word_count, "sentence_count": sentence_count, "paragraph_count": len(paragraphs)},
        "readability": {"flesch_reading_ease": flesch, "difficulty": difficulty, "avg_word_length": avg_word_length, "lexical_diversity": lexical_diversity},
        "pacing": {"label": pacing_label, "short_sentence_pct": short_pct, "long_sentence_pct": long_pct},
        "keywords": {"top_words": top_words, "top_bigrams": top_bigrams},
        "grammar": grammar,
        "author_style_profile": {
            "summary": summary,
            "voice_traits": [sentiment, formality, vocabulary_level, pacing_label],
            "imitation_guidance": {
                "sentence_length": "short" if avg_sentence_length < 12 else ("medium" if avg_sentence_length < 20 else "long"),
                "formality": formality,
                "energy": energy,
                "vocabulary": vocabulary_level,
                "pacing": pacing_label,
            },
        },
    }

    return {
        "hook_style": hook_style,
        "tone": tone,
        "vocabulary_level": vocabulary_level,
        "avg_sentence_length": avg_sentence_length,
        "paragraph_structure": paragraph_structure,
        "emoji_usage": emoji_usage,
        "storytelling_style": storytelling_style,
        "cta_pattern": cta_pattern,
        "analysis_profile": analysis_profile,
    }