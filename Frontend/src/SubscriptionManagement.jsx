import { useState, useEffect } from "react";
import { 
  getSubscriptionStatus, 
  downgradeToFree,
  createCheckoutSession, // ⬅️ NEW
  verifyPayment          // ⬅️ NEW
} from "./shafin";

export default function SubscriptionManagement({ onBackToDashboard }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    loadStatusAndVerify();
  }, []);

  async function loadStatusAndVerify() {
    setLoading(true);
    setError("");
    try {
      // ⬇️ CHECK FOR PENDING STRIPE PAYMENT ⬇️
      const pendingSessionId = localStorage.getItem("pending_stripe_verification");
      if (pendingSessionId) {
        setProcessing(true);
        setSuccessMessage("Verifying your payment with Stripe...");
        try {
          const verifyResult = await verifyPayment(token, pendingSessionId);
          setSuccessMessage(verifyResult.message);
          setTimeout(() => setSuccessMessage(""), 5000);
        } catch (err) {
          setError("Payment verification failed: " + (err.message || "Unknown error"));
        } finally {
          // Clear it so it doesn't verify again on refresh
          localStorage.removeItem("pending_stripe_verification");
          setProcessing(false);
        }
      }

      // Load current status
      const data = await getSubscriptionStatus(token);
      setStatus(data);
    } catch (err) {
      setError("Failed to load subscription status.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStripeUpgrade() {
    setProcessing(true);
    setError("");
    try {
      // 1. Create checkout session
      const session = await createCheckoutSession(token);
      
      // 2. Redirect browser to Stripe!
      window.location.href = session.checkout_url;
    } catch (err) {
      setError(err.message || "Failed to start checkout.");
      setProcessing(false);
    }
  }

  async function handleDowngrade() {
    if (!window.confirm("Are you sure you want to downgrade to Free tier?")) return;
    
    setProcessing(true);
    try {
      const result = await downgradeToFree(token);
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(""), 4000);
      await loadStatusAndVerify();
    } catch (err) {
      setError(err.message || "Failed to downgrade.");
    } finally {
      setProcessing(false);
    }
  }

  const getTierBadge = (tier) => {
    if (tier === "premium") return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    return "bg-gray-200 text-gray-800";
  };

  const getProgressBarColor = (used, limit) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading subscription status...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {onBackToDashboard && (
        <button onClick={onBackToDashboard} className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 font-medium">
          ← Back to Dashboard
        </button>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-600 mt-1">Manage your plan and track feature usage.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-300">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg border border-green-300">{successMessage}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <p className="text-sm text-gray-500">Your active subscription tier</p>
          </div>
          <span className={`px-4 py-2 rounded-full font-bold text-sm ${getTierBadge(status.subscription_tier)}`}>
            {status.subscription_tier === "premium" ? "⭐ PREMIUM" : "FREE"}
          </span>
        </div>

        {status.subscription_tier === "free" ? (
          <div className="border-t pt-4">
            <p className="text-gray-600 mb-4">
              Upgrade to Premium for unlimited access to all AI features! Secure checkout powered by Stripe.
            </p>
            <button
              onClick={handleStripeUpgrade}
              disabled={processing}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-3 rounded-lg shadow-md hover:from-purple-700 hover:to-purple-800 disabled:from-purple-300 disabled:to-purple-400 transition flex items-center justify-center gap-2"
            >
              {processing ? "Loading Checkout..." : "💳 Upgrade to Premium ($9.99)"}
            </button>
          </div>
        ) : (
          <div className="border-t pt-4">
            <p className="text-gray-600 mb-4">You're enjoying unlimited access as a Premium member!</p>
            <button
              onClick={handleDowngrade}
              disabled={processing}
              className="w-full bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition"
            >
              {processing ? "Processing..." : "Downgrade to Free"}
            </button>
          </div>
        )}
      </div>

      {/* Usage Tracking */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h2>
        
        {/* Viral Topics */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="font-medium text-gray-900">Viral Topic Generations</p>
            <span className="text-sm font-semibold text-gray-700">
              {status.viral_topics_used} / {status.viral_topics_limit === 999999 ? "∞" : status.viral_topics_limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressBarColor(status.viral_topics_used, status.viral_topics_limit)}`}
              style={{ width: status.viral_topics_limit === 999999 ? "10%" : `${Math.min((status.viral_topics_used / status.viral_topics_limit) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Content Plans */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="font-medium text-gray-900">Content Plans</p>
            <span className="text-sm font-semibold text-gray-700">
              {status.content_plans_used} / {status.content_plans_limit === 999999 ? "∞" : status.content_plans_limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressBarColor(status.content_plans_used, status.content_plans_limit)}`}
              style={{ width: status.content_plans_limit === 999999 ? "10%" : `${Math.min((status.content_plans_used / status.content_plans_limit) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}