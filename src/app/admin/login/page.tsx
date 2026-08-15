"use client";

import { useActionState } from "react";
import { sellerLogin } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(sellerLogin, null);

  useEffect(() => {
    if (state?.success) {
      router.push("/admin");
    }
  }, [state, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">LuminaGifts</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your seller admin dashboard</p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-8">
            <form action={formAction} className="space-y-6">
              {state?.error && (
                <div className="p-3.5 text-sm text-red-600 bg-red-50 rounded-lg font-medium border border-red-100">
                  {state.error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="seller@cuddle.co"
                  required
                  className="h-11 border-border bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  className="h-11 border-border bg-background text-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full h-12 text-sm font-semibold mt-2"
              >
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
