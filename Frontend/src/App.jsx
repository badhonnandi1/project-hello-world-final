import { useEffect, useState } from "react";
import {
  ArrowRight,
  KeyRound,
  LogIn,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";

import Dashboard from "./Dashboard";
import { getCurrentUser, loginUser, registerUser } from "./badhon";


const emptyRegistrationForm = {
  user_name: "",
  phone_number: "",
  password: "",
};

const emptyLoginForm = {
  user_name: "",
  password: "",
};


// This function controls the simple login, registration, and dashboard screens.
function App() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationForm, setRegistrationForm] = useState(emptyRegistrationForm);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [currentUser, setCurrentUser] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // This function clears the messages shown above the form.
  function clearMessages() {
    setSuccessMessage("");
    setErrorMessage("");
  }

  // This function checks a saved token and loads the logged-in user.
  async function loadCurrentUser(token) {
    try {
      const user = await getCurrentUser(token);
      setCurrentUser(user);
    } catch {
      localStorage.removeItem("access_token");
      setCurrentUser(null);
    }
  }

  // This effect checks localStorage when the app first loads.
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");

    if (savedToken) {
      loadCurrentUser(savedToken);
    }
  }, []);

  // This function updates the registration form when the user types.
  function handleRegistrationChange(event) {
    const { name, value } = event.target;
    setRegistrationForm({
      ...registrationForm,
      [name]: value,
    });
  }

  // This function updates the login form when the user types.
  function handleLoginChange(event) {
    const { name, value } = event.target;
    setLoginForm({
      ...loginForm,
      [name]: value,
    });
  }

  // This function sends the registration form to the backend.
  async function handleRegister(event) {
    event.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      await registerUser(registrationForm);
      setSuccessMessage("Registration successful. Please log in.");
      setLoginForm({
        user_name: registrationForm.user_name,
        password: "",
      });
      setRegistrationForm(emptyRegistrationForm);
      setIsRegistering(false);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // This function sends the login form to the backend and saves the JWT.
  async function handleLogin(event) {
    event.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const tokenData = await loginUser(loginForm);
      localStorage.setItem("access_token", tokenData.access_token);
      await loadCurrentUser(tokenData.access_token);
      setLoginForm(emptyLoginForm);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // This function removes the JWT and returns the user to the login screen.
  function handleLogout() {
    localStorage.removeItem("access_token");
    setCurrentUser(null);
    setIsRegistering(false);
    clearMessages();
  }

  // This function switches between the login and registration forms.
  function switchForm() {
    setIsRegistering(!isRegistering);
    clearMessages();
  }

  if (currentUser) {
    // A verified user is redirected to the common dashboard.
    return <Dashboard user={currentUser} onLogout={handleLogout} />;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1fr]">
        <section className="ui-card hidden p-8 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-950">GhostWriter AI</p>
              <p className="text-sm text-zinc-500">AI writing productivity dashboard</p>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            <div>
              <p className="eyebrow">Writing Operations</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-950">
                Keep your content workflow focused, sourced, and ready to publish.
              </h1>
            </div>

            <div className="grid gap-3">
              {[
                "Guided interviews for collecting ideas",
                "Knowledge vault for reusable context",
                "Voice tools for natural capture",
              ].map((item) => (
                <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3" key={item}>
                  <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-zinc-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ui-card mx-auto w-full max-w-md p-5 shadow-soft sm:p-7">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-cyan-300">
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-zinc-950">GhostWriter AI</p>
              <p className="text-xs text-zinc-500">AI writing workspace</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="eyebrow">{isRegistering ? "Create Workspace" : "Welcome Back"}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">
              {isRegistering ? "Create your account" : "Log in to GhostWriter AI"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {isRegistering
                ? "Set up access to your writing dashboard."
                : "Continue to your dashboard and writing tools."}
            </p>
          </div>

          <div aria-live="polite" className="space-y-3">
            {successMessage && <p className="status-success">{successMessage}</p>}
            {errorMessage && <p className="status-error">{errorMessage}</p>}
          </div>

          {isRegistering ? (
            <form className="mt-6 space-y-4" onSubmit={handleRegister}>
              <div className="space-y-2">
                <label className="field-label" htmlFor="register-user-name">Username</label>
                <div className="relative">
                  <User aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    autoComplete="username"
                    className="form-input pl-10"
                    id="register-user-name"
                    name="user_name"
                    type="text"
                    value={registrationForm.user_name}
                    onChange={handleRegistrationChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="register-phone-number">Phone number</label>
                <div className="relative">
                  <Phone aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    autoComplete="tel"
                    className="form-input pl-10"
                    id="register-phone-number"
                    name="phone_number"
                    type="tel"
                    value={registrationForm.phone_number}
                    onChange={handleRegistrationChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="register-password">Password</label>
                <div className="relative">
                  <KeyRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    autoComplete="new-password"
                    className="form-input pl-10"
                    id="register-password"
                    name="password"
                    type="password"
                    value={registrationForm.password}
                    onChange={handleRegistrationChange}
                    required
                  />
                </div>
              </div>

              <button className="btn-primary w-full" type="submit" disabled={isLoading}>
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                {isLoading ? "Please wait..." : "Register"}
              </button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="field-label" htmlFor="login-user-name">Username</label>
                <div className="relative">
                  <User aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    autoComplete="username"
                    className="form-input pl-10"
                    id="login-user-name"
                    name="user_name"
                    type="text"
                    value={loginForm.user_name}
                    onChange={handleLoginChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="field-label" htmlFor="login-password">Password</label>
                <div className="relative">
                  <KeyRound aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    autoComplete="current-password"
                    className="form-input pl-10"
                    id="login-password"
                    name="password"
                    type="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    required
                  />
                </div>
              </div>

              <button className="btn-primary w-full" type="submit" disabled={isLoading}>
                <LogIn aria-hidden="true" className="h-4 w-4" />
                {isLoading ? "Please wait..." : "Login"}
              </button>
            </form>
          )}

          <button className="btn-secondary mt-4 w-full" type="button" onClick={switchForm}>
            {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </section>
      </div>
    </main>
  );
}

export default App;
