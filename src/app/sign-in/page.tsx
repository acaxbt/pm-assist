import { signIn } from "@/auth";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string; callbackUrl?: string };
}) {
  const errorMsg =
    searchParams.error === "domain"
      ? "Hanya email @detik.com yang diizinkan masuk."
      : searchParams.error
      ? "Gagal masuk. Coba lagi."
      : null;

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <h1 className="text-xl font-semibold">PRD Chat</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Masuk dengan akun Google <span className="font-medium">@detik.com</span>.
        </p>

        {errorMsg && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {errorMsg}
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: searchParams.callbackUrl ?? "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Lanjutkan dengan Google
          </button>
        </form>
      </div>
    </main>
  );
}
