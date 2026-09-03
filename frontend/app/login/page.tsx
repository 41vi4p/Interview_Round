import { AuthForm } from "@/components/AuthForm";

export const metadata = {
  title: "Sign in — Rate Board",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">Boarding pass</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
          Sign in to save your pairs.
        </h1>
      </div>
      <AuthForm />
    </div>
  );
}
