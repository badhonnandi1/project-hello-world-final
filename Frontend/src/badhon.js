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


// This function sends new account information to the backend.
export async function registerUser(data) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}


// This function sends login information to the backend.
export async function loginUser(data) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}


// This function uses the saved JWT to ask the backend who is logged in.
export async function getCurrentUser(token) {
  return request("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function checks whether the logged-in user already has an app profile.
export async function getMyProfile(token) {
  return request("/profile/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function saves the logged-in user's app profile.
export async function saveMyProfile(token, profileData) {
  return request("/profile/me", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });
}


// This function loads Knowledge Vault items with optional search and filters.
export async function getKnowledgeItems(token, filters = {}) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.append("search", filters.search);
  }

  if (filters.category) {
    params.append("category", filters.category);
  }

  if (filters.confidentiality_level) {
    params.append("confidentiality_level", filters.confidentiality_level);
  }

  const queryString = params.toString();
  const path = queryString ? `/knowledge-vault/get?${queryString}` : "/knowledge-vault/get";

  return request(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function creates a new Knowledge Vault item.
export async function createKnowledgeItem(token, itemData) {
  return request("/knowledge-vault/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(itemData),
  });
}


// This function loads one full Knowledge Vault item.
export async function getKnowledgeItem(token, itemId) {
  return request(`/knowledge-vault/get/${itemId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function updates an existing Knowledge Vault item.
export async function updateKnowledgeItem(token, itemId, itemData) {
  return request(`/knowledge-vault/update/${itemId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(itemData),
  });
}


// This function deletes an existing Knowledge Vault item.
export async function deleteKnowledgeItem(token, itemId) {
  return request(`/knowledge-vault/delete/${itemId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function loads audience opportunities with optional filters.
export async function getAudienceOpportunities(token, filters = {}) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.append("status", filters.status);
  }

  if (filters.type) {
    params.append("type", filters.type);
  }

  if (filters.priority) {
    params.append("priority", filters.priority);
  }

  const queryString = params.toString();
  const path = queryString ? `/api/opportunities?${queryString}` : "/api/opportunities";

  return request(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function creates and analyzes one audience opportunity.
export async function createAudienceOpportunity(token, opportunityData) {
  return request("/api/opportunities/analyze", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(opportunityData),
  });
}


// This function loads one full audience opportunity.
export async function getAudienceOpportunity(token, opportunityId) {
  return request(`/api/opportunities/get/${opportunityId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function updates an existing audience opportunity.
export async function updateAudienceOpportunity(token, opportunityId, opportunityData) {
  return request(`/api/opportunities/update/${opportunityId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(opportunityData),
  });
}


// This function asks the backend to rerun the AI analysis for an opportunity.
export async function reanalyzeAudienceOpportunity(token, opportunityId) {
  return request(`/api/opportunities/${opportunityId}/reanalyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function deletes an existing audience opportunity.
export async function deleteAudienceOpportunity(token, opportunityId) {
  return request(`/api/opportunities/delete/${opportunityId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function starts a new interview session.
export async function startInterviewSession(token) {
  return request("/interview/start", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// This function gets the current active interview session.
export async function getCurrentInterviewSession(token) {
  return request("/interview/current", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// This function submits an answer for a specific question in the interview.
export async function submitInterviewAnswer(token, answerId, answerText) {
  return request(`/interview/answer/${answerId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answer_text: answerText }),
  });
}


// This function sends chat message history and form state to the campaign AI assistant.
export async function sendCampaignChat(token, chatData) {
  return request("/campaigns/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(chatData),
  });
}


// This function saves a completed campaign and posts to the database.
export async function saveCampaign(token, campaignData) {
  return request("/campaigns", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(campaignData),
  });
}


// This function retrieves all saved campaigns for the logged-in user.
export async function getCampaigns(token) {
  return request("/campaigns", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
