import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0a0a] px-4 text-white">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Error 404
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-zinc-400">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

export default NotFound;