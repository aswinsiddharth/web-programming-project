import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { Loader2 } from "lucide-react";

const COLLEGE_EMAIL_DOMAIN = "@rajalakshmi.edu.in";

function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(COLLEGE_EMAIL_DOMAIN)) {
      setError("Only @rajalakshmi.edu.in college email addresses can register.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setMessage(
      data.session
        ? "Account created successfully."
        : "Account created. Please check your college email to confirm your account."
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Campus Marketplace
          </h1>
          <p className="text-zinc-400 mt-3">
            Your campus. Your marketplace.
          </p>
        </div>
        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">

          <div className="mb-7">

            <h2 className="text-2xl font-semibold">
              Create your account
            </h2>

            <p className="text-zinc-400 mt-2">
              Join your campus marketplace
            </p>

          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>

              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                required
                className="
                  w-full
                  bg-zinc-950
                  border
                  border-zinc-700
                  text-white
                  placeholder-zinc-600
                  rounded-lg
                  px-4
                  py-3
                  outline-none
                  focus:border-white
                  focus:ring-1
                  focus:ring-white
                  transition
                "
              />

            </div>

            {/* Email */}
            <div>

              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                College Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@rajalakshmi.edu.in"
                pattern=".+@rajalakshmi\.edu\.in"
                required
                className="
                  w-full
                  bg-zinc-950
                  border
                  border-zinc-700
                  text-white
                  placeholder-zinc-600
                  rounded-lg
                  px-4
                  py-3
                  outline-none
                  focus:border-white
                  focus:ring-1
                  focus:ring-white
                  transition
                "
              />

            </div>

            {/* Password */}
            <div>

              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                required
                className="
                  w-full
                  bg-zinc-950
                  border
                  border-zinc-700
                  text-white
                  placeholder-zinc-600
                  rounded-lg
                  px-4
                  py-3
                  outline-none
                  focus:border-white
                  focus:ring-1
                  focus:ring-white
                  transition
                "
              />

            </div>

            {/* Confirm Password */}
            <div>

              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                required
                className="
                  w-full
                  bg-zinc-950
                  border
                  border-zinc-700
                  text-white
                  placeholder-zinc-600
                  rounded-lg
                  px-4
                  py-3
                  outline-none
                  focus:border-white
                  focus:ring-1
                  focus:ring-white
                  transition
                "
              />

            </div>

            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            {message && <p className="text-sm text-emerald-400">{message}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full
                bg-white
                text-black
                rounded-lg
                py-3
                font-semibold
                hover:bg-zinc-200
                transition
                cursor-pointer
                flex
                items-center
                justify-center
                gap-2
              "
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>

          </form>

          {/* Login */}
          <p className="text-center text-sm text-zinc-400 mt-7">

            Already have an account?{" "}

            <Link
              to="/login"
              className="text-white font-medium hover:underline"
            >
              Sign in
            </Link>

          </p>

        </div>

      </div>

    </div>
  );
}

export default Register;
