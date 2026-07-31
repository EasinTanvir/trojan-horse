"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { register as registerAccount } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { notifyError, notifySuccess } from "@/lib/toast";
import { registerSchema } from "@/lib/validation/authSchema";

/**
 * Citizen self-registration. Only the `user` role is created here — management
 * and city_corp accounts are seeded, and there is deliberately no role selector
 * on this form (06-auth.md).
 */
export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values) {
    const result = await registerAccount(values);

    if (result.success) {
      notifySuccess("Account created. Welcome.");
      router.replace(result.data.redirectTo);
      router.refresh();
    } else {
      notifyError(result.error);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Create an account
        </h1>
        <p className="text-sm text-ink-muted">
          You need an account to submit reports and confirm what others have
          reported. The map is readable without one.
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
              label="Full name"
              autoComplete="name"
              placeholder="e.g. Rakib Hasan"
              required
              error={errors.name?.message}
              {...register("name")}
            />

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
              autoComplete="new-password"
              hint="At least 8 characters."
              required
              error={errors.password?.message}
              {...register("password")}
            />

            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button type="submit" fullWidth loading={isSubmitting}>
              Create account
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-5 text-center text-sm text-ink-muted">
        Already registered?{" "}
        <Link
          href="/login"
          className="rounded-sm font-medium text-brand-primary underline underline-offset-2 hover:text-brand-primary-dark"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
