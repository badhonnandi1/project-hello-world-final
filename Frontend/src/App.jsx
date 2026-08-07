import { useEffect, useState } from "react";

import Dashboard from "./Dashboard";
import { getCurrentUser, loginUser, registerUser } from "./api";


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
    <main className="page">
      <section className="card">
        <h1>{isRegistering ? "Create Account" : "Login"}</h1>

        {successMessage && <p className="success-message">{successMessage}</p>}
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {isRegistering ? (
          <form onSubmit={handleRegister}>
            <label htmlFor="register-user-name">Username</label>
            <input
              id="register-user-name"
              name="user_name"
              type="text"
              value={registrationForm.user_name}
              onChange={handleRegistrationChange}
              required
            />

            <label htmlFor="register-phone-number">Phone number</label>
            <input
              id="register-phone-number"
              name="phone_number"
              type="tel"
              value={registrationForm.phone_number}
              onChange={handleRegistrationChange}
              required
            />

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              name="password"
              type="password"
              value={registrationForm.password}
              onChange={handleRegistrationChange}
              required
            />

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Please wait..." : "Register"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <label htmlFor="login-user-name">Username</label>
            <input
              id="login-user-name"
              name="user_name"
              type="text"
              value={loginForm.user_name}
              onChange={handleLoginChange}
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              value={loginForm.password}
              onChange={handleLoginChange}
              required
            />

            <button type="submit" disabled={isLoading}>
              {isLoading ? "Please wait..." : "Login"}
            </button>
          </form>
        )}

        <button className="switch-button" type="button" onClick={switchForm}>
          {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
        </button>
      </section>
    </main>
  );
}

export default App;
