import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Clock, CheckCircle, Loader2, Play, Zap } from "lucide-react";
import type { Webinar } from "@shared/schema";

interface AvailableSessionsResponse {
  mode: "fixed" | "recurring" | "onDemand" | "justInTime";
  sessions: Array<{ id: string; scheduledStart: string; status: string }>;
  nextStartMinutes?: number;
  message?: string;
  hasSessions?: boolean;
}

const registrationSchema = z.object({
  name: z.string().min(2, "姓名至少需要2個字"),
  phone: z.string().min(1, "請輸入電話號碼"),
  email: z.string().email("請輸入有效的 Email"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function Registration() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [registered, setRegistered] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data: webinar, isLoading } = useQuery<Webinar>({
    queryKey: ["/api/webinars", id],
    enabled: !!id,
  });

  const { data: availableSessions } = useQuery<AvailableSessionsResponse>({
    queryKey: ["/api/webinars", id, "available-sessions"],
    enabled: !!id,
  });

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const urlParams = new URLSearchParams(window.location.search);
      const payload: any = {
        ...data,
        webinarId: id,
        utmSource: urlParams.get("utm_source") || undefined,
        utmMedium: urlParams.get("utm_medium") || undefined,
        utmCampaign: urlParams.get("utm_campaign") || undefined,
        utmTerm: urlParams.get("utm_term") || undefined,
        utmContent: urlParams.get("utm_content") || undefined,
        landingUrl: window.location.href,
      };
      if (selectedSession) {
        payload.selectedSession = selectedSession;
      }
      return apiRequest("POST", "/api/registrations", payload);
    },
    onSuccess: () => {
      setRegistered(true);
      toast({
        title: "報名成功！",
        description: "確認信已發送到您的 Email",
      });
    },
    onError: (error: any) => {
      toast({
        title: "報名失敗",
        description: error.message || "請稍後再試",
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSessionOption = (date: string | Date) => {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const weekday = weekdays[d.getDay()];
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd} 星期${weekday} ${hh}:${min}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #be185d 100%)" }}>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">找不到此研討會</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (webinar.publishStatus !== "published") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #be185d 100%)" }}>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground" data-testid="text-webinar-not-published">此研討會尚未開放報名</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandSettings = webinar.brandSettings as { logo?: string; primaryColor?: string; secondaryColor?: string; backgroundColor?: string } | null;
  const brandGradient = brandSettings?.primaryColor && brandSettings?.secondaryColor
    ? { background: `linear-gradient(135deg, ${brandSettings.primaryColor} 0%, ${brandSettings.secondaryColor} 100%)` }
    : { background: "linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #be185d 100%)" };

  const mode = availableSessions?.mode || "fixed";
  const hasSessions = availableSessions?.hasSessions || false;
  const showSessionPicker = hasSessions && availableSessions && availableSessions.sessions.length > 1;
  const showSelectedTime = selectedSession || mode === "onDemand" || (mode === "fixed" && !showSessionPicker);

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={brandGradient}>
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center">
            {brandSettings?.logo && (
              <div className="flex justify-center mb-4">
                <img src={brandSettings.logo} alt="Logo" className="max-h-12 object-contain" />
              </div>
            )}
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2" data-testid="text-registration-success">報名成功！</h2>
            <p className="text-muted-foreground mb-6">
              我們已將直播連結發送至您的 Email，請在直播時間準時加入。
            </p>
            <div className="bg-muted rounded-md p-4 mb-6">
              <h3 className="font-semibold mb-2">{webinar.title}</h3>
              {mode === "onDemand" ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Play className="h-4 w-4" />
                  <span>隨時可以觀看</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{selectedSession ? formatDate(selectedSession) : formatDate(webinar.startTime)}</span>
                </div>
              )}
            </div>
            <Button
              onClick={() => setLocation(`/webinar/${id}`)}
              className="w-full"
              data-testid="button-enter-webinar"
            >
              {mode === "onDemand" ? "立即觀看" : "進入直播間"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={brandGradient}>
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          {brandSettings?.logo && (
            <div className="flex justify-center mb-2">
              <img src={brandSettings.logo} alt="Logo" className="max-h-12 object-contain" />
            </div>
          )}
          {webinar.coverImage && (
            <img
              src={webinar.coverImage}
              alt={webinar.title}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
          )}
          <CardTitle className="text-2xl">{webinar.title}</CardTitle>
          {webinar.description && (
            <CardDescription className="text-base mt-2">
              {webinar.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {mode === "onDemand" && (
            <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-muted rounded-md">
              <Play className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">隨選觀看 - 報名後隨時可以觀看</span>
            </div>
          )}

          {mode === "justInTime" && (
            <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-muted rounded-md">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium">
                {availableSessions?.message || `下一場即將開始`}
              </span>
            </div>
          )}

          {mode === "fixed" && !showSessionPicker && (
            <div className="flex items-center justify-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(hasSessions && availableSessions?.sessions?.[0]?.scheduledStart ? availableSessions.sessions[0].scheduledStart : webinar.startTime)}</span>
              </div>
            </div>
          )}

          {showSessionPicker && (
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">選擇場次時間</label>
              <Select
                value={selectedSession || ""}
                onValueChange={(val) => setSelectedSession(val)}
              >
                <SelectTrigger data-testid="select-session" className="w-full">
                  <SelectValue placeholder="請選擇場次時段" />
                </SelectTrigger>
                <SelectContent>
                  {availableSessions?.sessions.map((session) => (
                    <SelectItem
                      key={session.id}
                      value={session.scheduledStart}
                      data-testid={`option-session-${session.id}`}
                    >
                      {formatSessionOption(session.scheduledStart)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedSession && (
                <p className="text-xs text-destructive mt-2">請先選擇一個時段</p>
              )}
            </div>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>姓名</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="請輸入您的姓名"
                        {...field}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>電話</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="請輸入您的電話號碼"
                        {...field}
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending || (showSessionPicker && !selectedSession)}
                data-testid="button-register"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    報名中...
                  </>
                ) : (
                  "立即報名"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
