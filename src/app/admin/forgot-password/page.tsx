"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";
import Link from "next/link";
import { sendPasswordResetEmail } from "../actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    
    // In a real app we'd get the actual origin from the request or window,
    // but window.location.origin is fine for client-side
    const origin = window.location.origin;
    
    try {
      const res = await sendPasswordResetEmail(email, origin);
      if (res.error) {
        setStatus("error");
        setErrorMessage(res.error);
      } else {
        setStatus("success");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage("An unexpected error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter your email to receive a reset link</p>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-8">
            {status === "success" ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  If an account exists for {email}, you will receive a password reset link shortly.
                </p>
                <div className="pt-4">
                  <Link href="/admin/login">
                    <Button variant="outline" className="w-full h-11 text-base">Return to login</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === "error" && (
                  <div className="p-3.5 text-sm text-red-600 bg-red-50 rounded-lg font-medium border border-red-100">
                    {errorMessage}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@cuddle.co"
                    required
                    className="h-11 border-border bg-background text-foreground"
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base font-semibold shadow-sm"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>
                
                <div className="text-center text-sm">
                  <Link href="/admin/login" className="text-muted-foreground hover:text-foreground hover:underline">
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
