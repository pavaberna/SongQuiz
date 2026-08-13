import { GoogleLogin } from "@react-oauth/google";
import { LoaderCircle, Radio } from "lucide-react";
import { useState } from "react";

import { AppFooter } from "../../components/layout/AppFooter";
import { useAuth } from "./authContext";

export function LoginPage() {
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCredential(credential?: string): Promise<void> {
    if (!credential) {
      setErrorMessage("A Google bejelentkezés nem adott vissza azonosítót.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(credential);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nem sikerült bejelentkezni.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="song-app-background flex min-h-dvh flex-col text-white">
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-12">
        <section className="song-fade-in flex w-full max-w-md flex-col items-center gap-7 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia-400/40 bg-black shadow-[0_0_30px_rgba(217,70,239,0.4)]">
            <Radio className="h-8 w-8 text-cyan-300" />
          </div>

          <div className="space-y-3">
            <h1 className="bg-gradient-to-r from-fuchsia-300 via-purple-200 to-cyan-300 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
              SONG QUIZ
            </h1>
            <p className="text-sm text-neutral-300">
              A játék használatához jelentkezz be egy engedélyezett Google-fiókkal.
            </p>
          </div>

          {isSubmitting ? (
            <LoaderCircle className="h-7 w-7 animate-spin text-fuchsia-300" />
          ) : (
            <GoogleLogin
              containerProps={{ style: { colorScheme: "normal" } }}
              onError={() =>
                setErrorMessage("A Google bejelentkezés megszakadt.")
              }
              onSuccess={(response) => void handleCredential(response.credential)}
              shape="pill"
              size="large"
              text="signin_with"
              theme="filled_black"
            />
          )}

          {errorMessage !== null && (
            <p className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {errorMessage}
            </p>
          )}
        </section>
      </main>

      <AppFooter language="hu" />
    </div>
  );
}
