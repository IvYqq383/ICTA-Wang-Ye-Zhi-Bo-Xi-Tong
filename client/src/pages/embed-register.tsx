import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, CheckCircle, Loader2, Play, Zap, ChevronDown } from "lucide-react";
import type { Webinar } from "@shared/schema";

interface AvailableSessionsResponse {
  mode: "fixed" | "recurring" | "onDemand" | "justInTime";
  sessions: Array<{ id: string; scheduledStart: string; status: string }>;
  nextStartMinutes?: number;
  message?: string;
}

const registrationSchema = z.object({
  name: z.string().min(2, "姓名至少需要2個字"),
  email: z.string().email("請輸入有效的 Email"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export default function EmbedRegister() {
  const { id } = useParams<{ id: string }>();
  const [registered, setRegistered] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    defaultValues: { name: "", email: "" },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const payload: any = { ...data, webinarId: id };
      if (selectedSession) {
        payload.selectedSession = selectedSession;
      }
      return apiRequest("POST", "/api/registrations", payload);
    },
    onSuccess: () => {
      setRegistered(true);
      setErrorMessage(null);
      try {
        window.parent.postMessage({ type: "livecast:registered", webinarId: id }, "*");
      } catch {}
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "報名失敗，請稍後再試");
    },
  });

  useEffect(() => {
    let lastHeight = 0;
    const sendHeight = () => {
      try {
        const height = document.documentElement.scrollHeight;
        if (height !== lastHeight) {
          lastHeight = height;
          window.parent.postMessage({ type: "livecast:resize", height }, "*");
        }
      } catch {}
    };
    sendHeight();
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", sendHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, []);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("zh-TW", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const formatShortDate = (date: string | Date) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "今天";
    if (d.toDateString() === tomorrow.toDateString()) return "明天";
    return d.toLocaleString("zh-TW", { month: "short", day: "numeric", weekday: "short" });
  };

  const formatTimeWithZone = (date: string | Date) => {
    return new Date(date).toLocaleString("zh-TW", {
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });
  };

  const mode = availableSessions?.mode || "fixed";

  const groupedSessions: Record<string, Array<{ id: string; scheduledStart: string; status: string }>> = {};
  if (availableSessions?.sessions) {
    for (const session of availableSessions.sessions) {
      const dateKey = formatShortDate(session.scheduledStart);
      if (!groupedSessions[dateKey]) groupedSessions[dateKey] = [];
      groupedSessions[dateKey].push(session);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <p className="text-muted-foreground text-sm">找不到此研討會</p>
      </div>
    );
  }

  const brandSettings = webinar.brandSettings as { logo?: string; primaryColor?: string; secondaryColor?: string } | null;
  const accentColor = brandSettings?.primaryColor || "#4f46e5";

  if (registered) {
    return (
      <div className="p-6 text-center">
        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="text-xl font-bold mb-2" data-testid="text-embed-success">報名成功！</h3>
        <p className="text-sm text-muted-foreground mb-4">確認信已發送至您的 Email</p>
        <div className="bg-muted rounded-md p-3 mb-4">
          <h4 className="font-semibold text-sm mb-1">{webinar.title}</h4>
          {mode === "onDemand" ? (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Play className="h-3 w-3" />
              <span>隨時可以觀看</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{selectedSession ? formatDate(selectedSession) : formatDate(webinar.startTime)}</span>
            </div>
          )}
        </div>
        <Button
          className="w-full"
          style={{ backgroundColor: accentColor }}
          onClick={() => window.open(`${window.location.origin}/webinar/${id}`, "_blank")}
          data-testid="button-embed-enter-webinar"
        >
          {mode === "onDemand" ? "立即觀看" : "進入直播間"}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {brandSettings?.logo && (brandSettings.logo.startsWith("http://") || brandSettings.logo.startsWith("https://") || brandSettings.logo.startsWith("/")) && (
        <div className="flex justify-center mb-3">
          <img src={brandSettings.logo} alt="Logo" className="max-h-8 object-contain" />
        </div>
      )}

      {webinar.coverImage && (webinar.coverImage.startsWith("http://") || webinar.coverImage.startsWith("https://") || webinar.coverImage.startsWith("/")) && (
        <img
          src={webinar.coverImage}
          alt={webinar.title}
          className="w-full h-36 object-cover rounded-md mb-3"
          data-testid="img-embed-cover"
        />
      )}

      <h3 className="text-lg font-bold text-center mb-1" data-testid="text-embed-title">{webinar.title}</h3>
      {webinar.description && (
        <p className="text-xs text-muted-foreground text-center mb-3">{webinar.description}</p>
      )}

      {mode === "onDemand" && (
        <div className="flex items-center justify-center gap-1.5 mb-4 p-2.5 bg-muted rounded-md">
          <Play className="h-4 w-4 text-green-600" />
          <span className="text-xs font-medium">立即點播觀看</span>
        </div>
      )}

      {mode === "justInTime" && (
        <div className="flex items-center justify-center gap-1.5 mb-4 p-2.5 bg-muted rounded-md">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium">
            {availableSessions?.message || "下一場即將開始"}
          </span>
        </div>
      )}

      {mode === "fixed" && (
        <div className="flex items-center justify-center gap-1.5 mb-4 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDate(webinar.startTime)}</span>
        </div>
      )}

      {mode === "recurring" && availableSessions && availableSessions.sessions.length > 0 && (
        <div className="mb-4 relative">
          <div
            className="border rounded-md p-2.5 flex items-center justify-between cursor-pointer hover-elevate"
            onClick={() => setShowSessionPicker(!showSessionPicker)}
            data-testid="button-embed-session-dropdown"
          >
            <span className="text-sm">
              {selectedSession ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  {formatShortDate(selectedSession)} @ {formatTimeWithZone(selectedSession)}
                </span>
              ) : (
                <span className="text-muted-foreground">選擇要加入的會議</span>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showSessionPicker ? "rotate-180" : ""}`} />
          </div>

          {showSessionPicker && (
            <div className="absolute left-0 right-0 top-full mt-1 border rounded-md bg-card shadow-lg z-50">
              <ScrollArea className="max-h-56">
                <div className="p-2 space-y-1">
                  {Object.entries(groupedSessions).map(([dateLabel, sessions]) => (
                    <div key={dateLabel}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2.5 py-1.5">{dateLabel}</p>
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-sm hover-elevate ${
                            selectedSession === session.scheduledStart ? "bg-accent font-medium" : ""
                          }`}
                          onClick={() => {
                            setSelectedSession(session.scheduledStart);
                            setShowSessionPicker(false);
                          }}
                          data-testid={`button-embed-session-${session.id}`}
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span>{formatShortDate(session.scheduledStart)} @ {formatTimeWithZone(session.scheduledStart)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="border-t px-3 py-1.5 text-center">
                <span className="text-[10px] text-muted-foreground opacity-60">Powered by LiveCast</span>
              </div>
            </div>
          )}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => {
            setErrorMessage(null);
            registerMutation.mutate(data);
          })}
          className="space-y-3"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">姓名</FormLabel>
                <FormControl>
                  <Input placeholder="請輸入您的姓名" {...field} data-testid="input-embed-name" />
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
                <FormLabel className="text-xs">Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your@email.com" {...field} data-testid="input-embed-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {errorMessage && (
            <p className="text-xs text-destructive text-center" data-testid="text-embed-error">{errorMessage}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            style={{ backgroundColor: accentColor }}
            disabled={registerMutation.isPending || (mode === "recurring" && !selectedSession)}
            data-testid="button-embed-register"
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                報名中...
              </>
            ) : (
              "立即免費報名"
            )}
          </Button>
        </form>
      </Form>

      <p className="text-[10px] text-muted-foreground text-center mt-3 opacity-50">
        Powered by LiveCast
      </p>
    </div>
  );
}
