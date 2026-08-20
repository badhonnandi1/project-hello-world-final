const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


// This function sends requests to the backend and turns error responses into messages.
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.detail || "Something went wrong";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}
// This function sends multipart/form-data requests such as audio uploads.
// Content-Type is intentionally not set manually because the browser
// adds the correct multipart boundary automatically.
async function requestMultipart(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.detail || "Something went wrong";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

// This function loads the user's interview answers.
export async function getInterviewAnswers(token) {
  return request("/voice-profile/interview", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function loads the latest writing analysis.
export async function getWritingAnalysis(token) {
  return request("/voice-profile/writing-analysis", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function loads the user's saved voice profile.
export async function getVoiceProfile(token) {
  return request("/voice-profile/profile", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function generates a new voice profile.
export async function generateVoiceProfile(token) {
  return request("/voice-profile/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function updates the user's voice profile.
export async function updateVoiceProfile(token, profileData) {
  return request("/voice-profile", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
}

export async function createVoiceProfile(token, profileData) {
  return request("/voice-profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
}

// ---------------------------------------------------------
// VOICE INTERVIEW
// ---------------------------------------------------------

// This function sends recorded browser audio to the backend.
// The backend converts WebM to WAV and sends it to Gemini.
export async function transcribeVoiceInterview(token, audioBlob) {
  const formData = new FormData();

  // The filename is mainly used to identify the uploaded file.
  formData.append("audio", audioBlob, "voice-interview.webm");

  return requestMultipart("/voice-interviews/transcribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}


// This function saves a newly recorded Voice Interview.
export async function createVoiceInterview(token, interviewData) {
  return request("/voice-interviews", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(interviewData),
  });
}


// This function gets the latest Voice Interview
// belonging to the logged-in user.
export async function getLatestVoiceInterview(token) {
  return request("/voice-interviews/latest", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function updates an existing Voice Interview.
export async function updateVoiceInterview(
  token,
  interviewId,
  interviewData
) {
  return request(`/voice-interviews/${interviewId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(interviewData),
  });
}

// ---------------------------------------------------------
// WRITING STYLE PRESETS
// ---------------------------------------------------------

// Get all saved Writing Style Presets belonging to the logged-in user.
export async function getWritingStylePresets(token) {
  return request("/writing-style-presets", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Generate a temporary rule-based style preview.
// Nothing is saved to the database.
export async function previewWritingStylePreset(token, previewData) {
  return request("/writing-style-presets/preview", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(previewData),
  });
}

// Save a new Writing Style Preset.
export async function createWritingStylePreset(token, presetData) {
  return request("/writing-style-presets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(presetData),
  });
}

// Get one saved Writing Style Preset.
export async function getWritingStylePreset(token, presetId) {
  return request(`/writing-style-presets/${presetId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// Update an existing Writing Style Preset.
export async function updateWritingStylePreset(
  token,
  presetId,
  presetData
) {
  return request(`/writing-style-presets/${presetId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(presetData),
  });
}

// Delete an existing Writing Style Preset.
export async function deleteWritingStylePreset(token, presetId) {
  return request(`/writing-style-presets/${presetId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}