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

  //if (!response.ok) {
    //const message = data?.detail || "Something went wrong";
    //const error = new Error(message);
    //error.status = response.status;
    //throw error;
  //}
  if (!response.ok) {

    let message = "Something went wrong";


    if (typeof data?.detail === "string") {

        message = data.detail;

    }


    else if (typeof data?.detail === "object") {

        message =
            data.detail.message ||
            "Request failed";

    }



    const error = new Error(message);


    error.status = response.status;


    // IMPORTANT
    // Keep backend violation data
    error.details = data?.detail;


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

// ---------------------------------------------------------
// PRIVACY GUARDRAILS
// ---------------------------------------------------------

// Get all Privacy Guardrail rules belonging to the logged-in user.
export async function getPrivacyGuardrails(token) {
  return request("/privacy-guardrails", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// Create a new Privacy Guardrail rule.
export async function createPrivacyGuardrail(token, guardrailData) {
  return request("/privacy-guardrails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(guardrailData),
  });
}


// Update an existing Privacy Guardrail rule.
export async function updatePrivacyGuardrail(
  token,
  ruleId,
  guardrailData
) {
  return request(`/privacy-guardrails/${ruleId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(guardrailData),
  });
}


// Enable or disable a Privacy Guardrail rule.
export async function togglePrivacyGuardrail(token, ruleId) {
  return request(`/privacy-guardrails/${ruleId}/toggle`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// Delete a Privacy Guardrail rule permanently.
export async function deletePrivacyGuardrail(token, ruleId) {
  return request(`/privacy-guardrails/${ruleId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// Check text against all active Privacy Guardrails.
export async function checkPrivacyGuardrails(token, text) {
  return request("/privacy-guardrails/check", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text,
    }),
  });
}

// ---------------------------------------------------------
// POST GENERATION
// ---------------------------------------------------------


// Load available content plans
export async function getPostGenerationContentPlans(token) {
  return request("/post-generation/content-plans", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// Load available voice interviews
export async function getPostGenerationVoiceInterviews(token) {
  return request("/post-generation/voice-interviews", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// Load knowledge vault items
export async function getPostGenerationKnowledgeItems(token) {
  return request("/post-generation/knowledge-items", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// Load writing style presets
export async function getPostGenerationStylePresets(token) {
  return request("/post-generation/style-presets", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}



// Generate post
export async function generatePost(token, generationData) {

  return request("/post-generation/generate", {

    method: "POST",

    headers: {
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify(generationData),

  });

}



// Regenerate post
export async function regeneratePost(
  token,
  regenerationData
) {

  return request("/post-generation/regenerate", {

    method: "POST",

    headers: {
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify(regenerationData),

  });

}



// Save generated post
export async function saveGeneratedPost(
  token,
  saveData
) {

  return request("/post-generation/save", {

    method: "POST",

    headers: {
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify(saveData),

  });

}



// Load saved generated posts
export async function getSavedGeneratedPosts(token) {

  return request("/post-generation/my-posts", {

    method: "GET",

    headers: {
      Authorization: `Bearer ${token}`,
    },

  });

}

// ---------------------------------------------------------
// CHECK PRIVACY FOR EDITED / GENERATED TEXT
// ---------------------------------------------------------






// ---------------------------------------------------------
// DELETE SAVED GENERATED POST
// ---------------------------------------------------------

export async function deleteSavedGeneratedPost(
token,
postId
){

return request(
`/post-generation/${postId}`,
{

method:"DELETE",

headers:{
Authorization:`Bearer ${token}`,
},

});

}