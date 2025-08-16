"use client";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = (search?.get("next") ?? "/upload");

  useEffect(() => {
    const client = getSupabaseClient();
    // If already logged in, bounce to next
    client.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(nextPath);
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, session) => {
      if (session) router.replace(nextPath);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router, nextPath]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMsg("Sending magic link...");
    const site = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const redirect = `${site}${nextPath}`;
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirect,
      },
    });
    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Check your inbox ✉️");
    }
    setIsLoading(false);
  }

  function onSkip() {
    router.push(nextPath);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Login form */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!email || isLoading}
              >
                {isLoading ? "Sending magic link..." : "Send magic link"}
              </Button>
            </form>
            {msg && (
              <p className="text-sm mt-3 text-center text-muted">{msg}</p>
            )}
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted">
              Or
            </span>
          </div>
        </div>

        {/* Skip option */}
        <div className="space-y-4">
          <Button
            onClick={onSkip}
            variant="outline"
            size="lg"
            fullWidth
          >
            Continue without account
          </Button>

          <p className="text-xs text-center text-muted">
            You can create an account later to save your progress
          </p>
        </div>

        {/* Additional options */}
        <div className="text-center space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted"
          >
            Forgot password?
          </Button>
          <div className="text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto font-medium"
            >
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


