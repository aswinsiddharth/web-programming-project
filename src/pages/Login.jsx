import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { Loader2 } from "lucide-react";

const COLLEGE_EMAIL_DOMAIN = "@rajalakshmi.edu.in";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(COLLEGE_EMAIL_DOMAIN)) {
      setError("Please use your @rajalakshmi.edu.in college email.");
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
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
              Welcome back
            </h2>

            <p className="text-zinc-400 mt-2">
              Sign in to continue
            </p>

          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

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
                placeholder="Enter your password"
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
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>

          </form>

          {/* Register */}
          <p className="text-center text-sm text-zinc-400 mt-7">

            Don't have an account?{" "}

            <Link
              to="/register"
              className="text-white font-medium hover:underline"
            >
              Create an account
            </Link>

          </p>

        </div>

      </div>

    </div>
  );
}

export default Login;
