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


// ==========================================
// MODULE 1: WRITING ANALYZER
// ==========================================

// This function sends a pasted writing sample to the analyzer and returns the results.
export async function analyzeWritingSample(token, sampleData) {
  return request("/writing-samples/analyze", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(sampleData),
  });
}


// ==========================================
// MODULE 2: CONTENT PLAN GENERATOR (CALENDAR)
// ==========================================

// This function creates a new content plan.
export async function createContentPlan(token, planData) {
  return request("/content-plans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(planData),
  });
}

// This function gets content plans, optionally filtered by week dates (Calendar API).
export async function getContentPlans(token, filters = {}) {
  const params = new URLSearchParams();

  if (filters.week_start) {
    params.append("week_start", filters.week_start);
  }

  if (filters.week_end) {
    params.append("week_end", filters.week_end);
  }

  const queryString = params.toString();
  const path = queryString ? `/content-plans?${queryString}` : "/content-plans";

  return request(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// This function updates an existing content plan.
export async function updateContentPlan(token, planId, planData) {
  return request(`/content-plans/${planId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(planData),
  });
}

// This function deletes an existing content plan.
export async function deleteContentPlan(token, planId) {
  return request(`/content-plans/${planId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
// Add these to shafin.js

export async function generateViralTopics(token, customNiche = null) {
  return request("/viral-topics/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ custom_niche: customNiche }),
  });
}

export async function getViralTopics(token) {
  return request("/viral-topics", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteViralTopic(token, topicId) {
  return request(`/viral-topics/${topicId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
// Subscription Management APIs

export async function getSubscriptionStatus(token) {
  return request("/subscription/status", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function upgradeToPremium(token) {
  return request("/subscription/upgrade", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function downgradeToFree(token) {
  return request("/subscription/downgrade", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Stripe Checkout APIs

export async function createCheckoutSession(token) {
  return request("/subscription/create-checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function verifyPayment(token, sessionId) {
  return request(`/subscription/verify-payment?session_id=${sessionId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}