export const BASE_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");


// This function sends requests to the backend and turns error responses into messages.
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
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


// This function asks the backend to retrieve vault items and build a post angle.
export async function generateStoryAngle(token, angleData) {
  return request("/knowledge-vault/story-angle", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(angleData),
  });
}


// This function creates the logged-in user's one newsletter creator profile.
export async function joinNewsletterCreator(token, creatorData) {
  return request("/api/newsletter-creators/join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(creatorData),
  });
}


// This function loads the logged-in user's creator profile.
export async function getMyNewsletterCreator(token) {
  return request("/api/newsletter-creators/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function updates only editable fields on the logged-in user's creator profile.
export async function updateMyNewsletterCreator(token, creatorData) {
  return request("/api/newsletter-creators/update/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(creatorData),
  });
}


// This function loads active creators and safe published newsletter previews.
export async function getNewsletterCreators(token) {
  return request("/api/newsletter-creators", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function loads one active creator's safe directory details.
export async function getNewsletterCreator(token, creatorId) {
  return request(`/api/newsletter-creators/get/${creatorId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function creates an owned newsletter Draft without sending ownership data.
export async function createNewsletter(token, newsletterData) {
  return request("/api/newsletters/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(newsletterData),
  });
}


// This function loads only the logged-in creator's newsletters.
export async function getNewsletters(token) {
  return request("/api/newsletters/get", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function loads one owned newsletter.
export async function getNewsletter(token, newsletterId) {
  return request(`/api/newsletters/get/${newsletterId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function updates the authored inputs of one owned unpublished newsletter.
export async function updateNewsletter(token, newsletterId, newsletterData) {
  return request(`/api/newsletters/update/${newsletterId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(newsletterData),
  });
}


// This function deletes one owned newsletter after UI confirmation.
export async function deleteNewsletter(token, newsletterId) {
  return request(`/api/newsletters/delete/${newsletterId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function generates and saves a newsletter preview.
export async function generateNewsletter(token, newsletterId) {
  return request(`/api/newsletters/generate/${newsletterId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function performs the confirmed final generation and email delivery.
export async function publishNewsletter(token, newsletterId) {
  return request(`/api/newsletters/publish/${newsletterId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function subscribes the current user through the creator path parameter.
export async function createNewsletterSubscription(token, creatorId) {
  return request(`/api/newsletter-subscriptions/create/${creatorId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function lists only the current user's newsletter subscriptions.
export async function getNewsletterSubscriptions(token) {
  return request("/api/newsletter-subscriptions/get", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function pauses or resumes one owned newsletter subscription.
export async function updateNewsletterSubscription(token, subscriptionId, subscriptionData) {
  return request(`/api/newsletter-subscriptions/update/${subscriptionId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(subscriptionData),
  });
}


// This function physically removes one owned newsletter subscription.
export async function deleteNewsletterSubscription(token, subscriptionId) {
  return request(`/api/newsletter-subscriptions/delete/${subscriptionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function loads community audience opportunities matched to the user's target audience.
export async function getExploreOpportunities(token, offset = 0, limit = 10) {
  return request(`/api/opportunities/explore?offset=${offset}&limit=${limit}`, {
    method: "GET",
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


// This function retrieves the user's latest post generation.
export async function getLatestGeneration(token) {
  return request("/release/latest-generation", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function retrieves unposted content plans for the user.
export async function getBackloggedPlans(token) {
  return request("/release/backlogged-plans", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function releases the latest post generation to Zernio.
export async function publishLatestPost(token) {
  return request("/release/publish-latest", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function releases selected backlogged content plans to Zernio.
export async function publishBackloggedPosts(token, planIds) {
  return request("/release/publish-backlogged", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan_ids: planIds }),
  });
}


// This function retrieves the user's connected social media accounts.
export async function getUserConnections(token) {
  return request("/release/connections", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}


// This function creates a mock social account connection for dev testing.
export async function mockConnectAccount(token, platform, dummyAccountId = null) {
  return request("/release/mock-connect", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      platform: platform,
      dummy_account_id: dummyAccountId,
    }),
  });
}


