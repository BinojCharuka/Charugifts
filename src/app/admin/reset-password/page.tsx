"use client";

import { useActionState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";
import Link from "next/link";
import { resetPassword } from "../actions";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground">Invalid Link</h3>
        <p className="text-sm text-muted-foreground">
          The password reset link is invalid or missing. Please request a new one.
        </p>
        <div className="pt-4">
          <Link href="/admin/forgot-password">
            <Button variant="outline" className="w-full h-11 text-base">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground">Password Reset Successful</h3>
        <p className="text-sm text-muted-foreground">
          Your password has been successfully updated. You can now log in with your new password.
        </p>
        <div className="pt-4">
          <Link href="/admin/login">
            <Button variant="default" className="w-full h-11 text-base">Proceed to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      
      {state?.error && (
        <div className="p-3.5 text-sm text-red-600 bg-red-50 rounded-lg font-medium border border-red-100">
          {state.error}
        </div>
      )}
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">New Password</label>
        <Input
          type="password"
          name="password"
          placeholder="••••••••"
          required
          minLength={6}
          className="h-11 border-border bg-background text-foreground"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Confirm New Password</label>
        <Input
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          required
          minLength={6}
          className="h-11 border-border bg-background text-foreground"
        />
      </div>

      <div className="pt-2">
        <Button 
          type="submit" 
          className="w-full h-11 text-base font-semibold shadow-sm"
          disabled={isPending}
        >
          {isPending ? "Resetting..." : "Reset Password"}
        </Button>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter your new password below</p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-8">
            <Suspense fallback={
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
