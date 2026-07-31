"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { notifyError, notifySuccess } from "@/lib/toast";
import { loginSchema } from "@/lib/validation/authSchema";

/**
 * Zod validates inline on the field; the Server Action re-parses the same
 * schema server-side. Success and failure both raise a toast, and the redirect
 * target comes back from the action so role routing lives in one place
 * (homePathForSession in /lib/session.js).
 */
const GUARD_MESSAGES = {
  signin: "Please sign in to continue.",
  forbidden: "That panel is for a different kind of account.",
  scope: "That page belongs to a different City Corporation.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guardReason = searchParams.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (guardReason && GUARD_MESSAGES[guardReason]) {
      notifyError(GUARD_MESSAGES[guardReason]);
    }
  }, [guardReason]);

  async function onSubmit(values) {
    const result = await login(values);

    if (result.success) {
      notifySuccess("Signed in.");
      router.replace(result.data.redirectTo);
      router.refresh();
    } else {
      notifyError(result.error);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
        <p className="text-sm text-ink-muted">
          Report a hazard, follow what happens to it, and get warned before you
          walk into a danger zone.
        </p>
      </div>

      <Card>
        <CardBody>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
            noValidate
          >
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" fullWidth loading={isSubmitting}>
              Sign in
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-5 text-center text-sm text-ink-muted">
        New here?{" "}
        <Link
          href="/register"
          className="rounded-sm font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
        >
          Create an account
        </Link>
      </p>

      <p className="mt-2 text-center text-xs text-ink-muted">
        Management and City Corporation accounts are issued by the authority,
        not self-registered.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
