import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Mail, Lock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/config/adminCredentials";

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const finishSignIn = async (user: User) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin" || user.email === ADMIN_EMAIL) {
      navigate("/admin");
      toast.success("Welcome back, Admin!");
      return;
    }

    navigate("/student");
    toast.success("Welcome back!");
  };

  const ensureAdminSession = async () => {
    let { data, error } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (error) {
      const isInvalidCredentialError =
        error.message?.toLowerCase().includes("invalid login credentials") ||
        error.message?.toLowerCase().includes("email not confirmed");

      if (!isInvalidCredentialError) {
        throw error;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        options: {
          data: {
            full_name: "Admin",
          },
        },
      });

      if (signUpError && !signUpError.message?.toLowerCase().includes("already registered")) {
        throw signUpError;
      }

      if (signUpData.user) {
        await supabase
          .from("profiles")
          .upsert({
            id: signUpData.user.id,
            role: "admin",
            email: ADMIN_EMAIL,
            full_name: "Admin",
          }, { onConflict: "id" });
      }

      ({ data, error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }));

      if (error) {
        throw error;
      }
    }

    if (data?.user) {
      await supabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          role: "admin",
          email: ADMIN_EMAIL,
          full_name: "Admin",
        }, { onConflict: "id" });

      await finishSignIn(data.user);
      return true;
    }

    return false;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        toast.error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in a .env file.");
        return;
      }
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const loggedIn = await ensureAdminSession();
        if (loggedIn) {
          return;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await finishSignIn(data.user);
      }
    } catch (error: any) {
      const message = (error?.message || "").toString();
      if (message.toLowerCase().includes("failed to fetch")) {
        toast.error("Network error during sign in. Check Supabase URL, internet connection, or CORS.");
      } else {
        toast.error(message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-library-cream to-library-parchment p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-heading">Welcome Back</CardTitle>
          <CardDescription>Sign in to access your library account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
          
          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
