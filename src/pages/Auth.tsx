import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/padel2go-logo.png";

type AuthMode = "login" | "register" | "forgot" | "reset";

const Auth = () => {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { user, signUp, signInWithPassword, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  const emailSchema = z.string().email(t("validation.invalidEmail"));
  const passwordSchema = z.string().min(6, t("validation.passwordTooShort"));

  // Safe internal redirect target from ?redirect=<path> (set by RequireAuth)
  const redirectParam = searchParams.get("redirect");
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : null;

  // Role-based redirect helper (honors ?redirect= when it's a safe internal path)
  const redirectBasedOnRole = async (userId: string) => {
    if (safeRedirect) {
      navigate(safeRedirect);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (roles?.some(r => r.role === "admin")) {
      navigate("/admin");
    } else if (roles?.some(r => r.role === "club_owner")) {
      navigate("/club");
    } else {
      navigate("/account");
    }
  };

  // Redirect if already logged in (not during password reset — the recovery link creates a session)
  useEffect(() => {
    if (mode === "reset" || searchParams.get("mode") === "reset") return;
    if (user) {
      redirectBasedOnRole(user.id);
    }
  }, [user, mode]);

  // Check for reset mode from URL
  useEffect(() => {
    if (searchParams.get("mode") === "reset") {
      setMode("reset");
    }
  }, [searchParams]);

  const validateEmail = (value: string) => {
    try {
      emailSchema.parse(value);
      setErrors(prev => ({ ...prev, email: undefined }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, email: e.errors[0].message }));
      }
      return false;
    }
  };

  const validatePassword = (value: string) => {
    try {
      passwordSchema.parse(value);
      setErrors(prev => ({ ...prev, password: undefined }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, password: e.errors[0].message }));
      }
      return false;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email) || !validatePassword(password)) return;

    setLoading(true);
    const { error } = await signInWithPassword(email, password);

    if (error) {
      setLoading(false);
      toast.error(t("toasts.loginFailed"), {
        description: error.message === "Invalid login credentials"
          ? t("toasts.invalidCredentials")
          : error.message,
      });
      return;
    }

    toast.success(t("toasts.welcome"), {
      description: t("toasts.loggedIn"),
    });

    // Get current user and redirect based on role
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await redirectBasedOnRole(currentUser.id);
    } else {
      navigate("/account");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email) || !validatePassword(password)) return;

    if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: t("validation.passwordsDoNotMatch") }));
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error(t("toasts.registerFailed"), {
          description: t("toasts.alreadyRegistered"),
        });
      } else {
        toast.error(t("toasts.registerFailed"), {
          description: error.message,
        });
      }
      return;
    }

    toast.success(t("toasts.welcome"), {
      description: t("toasts.accountCreated"),
    });

    // New users go to account page (no roles yet)
    navigate("/account");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      toast.error(t("toasts.error"), {
        description: error.message,
      });
      return;
    }

    toast.success(t("toasts.emailSent"), {
      description: t("toasts.resetLinkInfo"),
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(password)) return;

    if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: t("validation.passwordsDoNotMatch") }));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      toast.error(t("toasts.error"), {
        description: error.message,
      });
      return;
    }

    toast.success(t("reset.success"), {
      description: t("reset.successDescription"),
    });
    setMode("login");
    navigate("/account");
  };

  return (
    <>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.description")} />
      </Helmet>

      <Navigation />

      <main className="min-h-screen bg-background pt-20 pb-12 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img src={logo} alt={t("logoAlt")} className="h-10" />
              </div>

              {/* Login Form */}
              {mode === "login" && (
                <>
                  <h1 className="text-2xl font-bold text-center mb-6">{t("signIn.title")}</h1>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t("fields.email")}</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("placeholders.email")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">{t("fields.password")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("signIn.submit")}
                    </Button>
                  </form>
                  <div className="mt-4 text-center space-y-2">
                    <button
                      onClick={() => setMode("forgot")}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t("signIn.forgotPassword")}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {t("signIn.noAccount")}{" "}
                      <button
                        onClick={() => setMode("register")}
                        className="text-primary hover:underline font-medium"
                      >
                        {t("signIn.registerLink")}
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* Register Form */}
              {mode === "register" && (
                <>
                  <h1 className="text-2xl font-bold text-center mb-6">{t("signUp.title")}</h1>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t("fields.email")}</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("placeholders.email")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="password">{t("fields.password")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => validatePassword(password)}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">{t("fields.confirmPassword")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("signUp.submit")}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("signUp.alreadyRegistered")}{" "}
                      <button
                        onClick={() => setMode("login")}
                        className="text-primary hover:underline font-medium"
                      >
                        {t("signUp.signInLink")}
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* Forgot Password */}
              {mode === "forgot" && (
                <>
                  <button
                    onClick={() => setMode("login")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
                  >
                    <ArrowLeft className="w-4 h-4" /> {t("forgot.back")}
                  </button>
                  <h1 className="text-2xl font-bold text-center mb-2">{t("forgot.title")}</h1>
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    {t("forgot.description")}
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="email">{t("fields.email")}</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("placeholders.email")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => validateEmail(email)}
                          className="pl-10"
                        />
                      </div>
                      {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("forgot.submit")}
                    </Button>
                  </form>
                </>
              )}

              {/* Reset Password */}
              {mode === "reset" && (
                <>
                  <h1 className="text-2xl font-bold text-center mb-2">{t("reset.title")}</h1>
                  <p className="text-muted-foreground text-center text-sm mb-6">
                    {t("reset.description")}
                  </p>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword">{t("reset.passwordLabel")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={() => validatePassword(password)}
                          className="pl-10"
                        />
                      </div>
                      {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                    </div>
                    <div>
                      <Label htmlFor="confirmNewPassword">{t("reset.confirmLabel")}</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirmNewPassword"
                          type="password"
                          placeholder={t("placeholders.password")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>
                    <Button type="submit" variant="lime" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("reset.submit")}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Auth;
