import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Languages } from "lucide-react";
import { useLang, type LangFull } from "@/hooks/use-lang";

const langLabels: Record<LangFull, string> = {
  "zh-TW": "繁體中文",
  "zh-CN": "简体中文",
  "en": "English",
};

const langShort: Record<LangFull, string> = {
  "zh-TW": "繁",
  "zh-CN": "简",
  "en": "EN",
};

const t: Record<LangFull, Record<string, string>> = {
  "zh-TW": {
    subtitle: "自動化研討會平台",
    signInTitle: "登入",
    signInDesc: "登入管理您的研討會",
    createTitle: "建立帳號",
    createDesc: "立即開始自動化您的研討會",
    username: "使用者名稱",
    usernamePh: "輸入使用者名稱",
    password: "密碼",
    passwordPh: "輸入密碼",
    signInBtn: "登入",
    email: "電子郵件",
    emailPh: "your@email.com",
    company: "公司名稱",
    companyOpt: "（選填）",
    companyPh: "您的公司",
    passwordMin: "至少 6 個字元",
    confirmPw: "確認密碼",
    confirmPwPh: "再次輸入密碼",
    createBtn: "建立帳號",
    noAccount: "還沒有帳號？ 立即註冊",
    hasAccount: "已有帳號？ 登入",
    welcomeBack: "歡迎回來！",
    loginFailed: "登入失敗",
    invalidCreds: "帳號或密碼錯誤",
    regSuccess: "註冊成功！",
    regFailed: "註冊失敗",
    regRetry: "請重試",
    powered: "Powered by ICTA-WEBINAR",
    usernameReq: "請輸入使用者名稱",
    passwordReq: "請輸入密碼",
    usernameMin: "使用者名稱至少 3 個字元",
    emailInvalid: "請輸入有效的電子郵件",
    passwordMinLen: "密碼至少 6 個字元",
    confirmReq: "請確認密碼",
    passwordMismatch: "密碼不一致",
    chooseUsername: "選擇使用者名稱",
  },
  "zh-CN": {
    subtitle: "自动化研讨会平台",
    signInTitle: "登录",
    signInDesc: "登录管理您的研讨会",
    createTitle: "创建账号",
    createDesc: "立即开始自动化您的研讨会",
    username: "用户名",
    usernamePh: "输入用户名",
    password: "密码",
    passwordPh: "输入密码",
    signInBtn: "登录",
    email: "电子邮件",
    emailPh: "your@email.com",
    company: "公司名称",
    companyOpt: "（选填）",
    companyPh: "您的公司",
    passwordMin: "至少 6 个字符",
    confirmPw: "确认密码",
    confirmPwPh: "再次输入密码",
    createBtn: "创建账号",
    noAccount: "还没有账号？ 立即注册",
    hasAccount: "已有账号？ 登录",
    welcomeBack: "欢迎回来！",
    loginFailed: "登录失败",
    invalidCreds: "账号或密码错误",
    regSuccess: "注册成功！",
    regFailed: "注册失败",
    regRetry: "请重试",
    powered: "Powered by ICTA-WEBINAR",
    usernameReq: "请输入用户名",
    passwordReq: "请输入密码",
    usernameMin: "用户名至少 3 个字符",
    emailInvalid: "请输入有效的电子邮件",
    passwordMinLen: "密码至少 6 个字符",
    confirmReq: "请确认密码",
    passwordMismatch: "密码不一致",
    chooseUsername: "选择用户名",
  },
  "en": {
    subtitle: "Automated Webinar Platform",
    signInTitle: "Sign In",
    signInDesc: "Sign in to manage your webinars",
    createTitle: "Create Account",
    createDesc: "Start automating your webinars today",
    username: "Username",
    usernamePh: "Enter username",
    password: "Password",
    passwordPh: "Enter password",
    signInBtn: "Sign In",
    email: "Email",
    emailPh: "your@email.com",
    company: "Company Name",
    companyOpt: "(optional)",
    companyPh: "Your company",
    passwordMin: "At least 6 characters",
    confirmPw: "Confirm Password",
    confirmPwPh: "Confirm password",
    createBtn: "Create Account",
    noAccount: "Don't have an account? Sign up",
    hasAccount: "Already have an account? Sign in",
    welcomeBack: "Welcome back!",
    loginFailed: "Login failed",
    invalidCreds: "Invalid credentials",
    regSuccess: "Registration successful!",
    regFailed: "Registration failed",
    regRetry: "Please try again",
    powered: "Powered by ICTA-WEBINAR",
    usernameReq: "Please enter username",
    passwordReq: "Please enter password",
    usernameMin: "Username must be at least 3 characters",
    emailInvalid: "Please enter a valid email",
    passwordMinLen: "Password must be at least 6 characters",
    confirmReq: "Please confirm your password",
    passwordMismatch: "Passwords do not match",
    chooseUsername: "Choose a username",
  },
};

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const { lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);

  const s = t[lang];

  const loginSchema = z.object({
    username: z.string().min(1, s.usernameReq),
    password: z.string().min(1, s.passwordReq),
  });

  const registerSchema = z.object({
    username: z.string().min(3, s.usernameMin),
    email: z.string().email(s.emailInvalid),
    password: z.string().min(6, s.passwordMinLen),
    confirmPassword: z.string().min(1, s.confirmReq),
    companyName: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: s.passwordMismatch,
    path: ["confirmPassword"],
  });

  type LoginForm = z.infer<typeof loginSchema>;
  type RegisterForm = z.infer<typeof registerSchema>;

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "", companyName: "" },
  });

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/login", data);
      toast({ title: s.welcomeBack });
      setLocation("/admin/dashboard");
    } catch (error: any) {
      toast({
        title: s.loginFailed,
        description: error.message || s.invalidCreds,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/admin/register", {
        username: data.username,
        email: data.email,
        password: data.password,
        companyName: data.companyName || "",
      });
      toast({ title: s.regSuccess });
      setLocation("/admin/dashboard");
    } catch (error: any) {
      toast({
        title: s.regFailed,
        description: error.message || s.regRetry,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!langOpen) return;
    const handler = () => setLangOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [langOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 relative" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLangOpen(!langOpen)}
          className="text-white/70"
          data-testid="button-login-lang-toggle"
        >
          <Languages className="w-4 h-4" />
        </Button>
        {langOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md">
            {(["zh-TW", "zh-CN", "en"] as LangFull[]).map((l) => (
              <button
                key={l}
                onClick={() => { setLang(l); setLangOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm rounded-sm hover-elevate flex items-center justify-between gap-2 ${lang === l ? "bg-accent text-accent-foreground" : ""}`}
                data-testid={`button-login-lang-${l}`}
              >
                <span>{langLabels[l]}</span>
                <span className="text-xs text-muted-foreground">{langShort[l]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src="/favicon.png" alt="ICTA" className="w-10 h-10 object-contain" />
          <h1 className="text-3xl font-bold text-white tracking-tight">ICTA-WEBINAR</h1>
        </div>
        <p className="text-slate-400 text-sm">{s.subtitle}</p>
      </div>

      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">
            {mode === "login" ? s.signInTitle : s.createTitle}
          </CardTitle>
          <CardDescription>
            {mode === "login" ? s.signInDesc : s.createDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{s.username}</FormLabel>
                      <FormControl>
                        <Input placeholder={s.usernamePh} {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{s.password}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={s.passwordPh} {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {s.signInBtn}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{s.username}</FormLabel>
                      <FormControl>
                        <Input placeholder={s.chooseUsername} {...field} data-testid="input-reg-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{s.email}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={s.emailPh} {...field} data-testid="input-reg-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{s.company} <span className="text-muted-foreground text-xs">{s.companyOpt}</span></FormLabel>
                      <FormControl>
                        <Input placeholder={s.companyPh} {...field} data-testid="input-reg-company" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{s.password}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={s.passwordMin} {...field} data-testid="input-reg-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{s.confirmPw}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={s.confirmPwPh} {...field} data-testid="input-reg-confirm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-register">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {s.createBtn}
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-sm text-primary hover:underline"
              data-testid="button-toggle-mode"
            >
              {mode === "login" ? s.noAccount : s.hasAccount}
            </button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-slate-500 text-xs">
        {s.powered}
      </p>
    </div>
  );
}
