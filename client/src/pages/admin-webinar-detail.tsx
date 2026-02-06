import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, Plus, Users, MessageSquare, MousePointerClick, 
  BarChart, Trash2, Loader2, Clock, Radio, Copy, ExternalLink,
  Lightbulb, HelpCircle, Star, TrendingUp, Settings
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Webinar, FakeUser, ScheduledMessage, CtaButton, Poll, Registration, Tip, Question, FeedbackSurvey } from "@shared/schema";

// Analytics Response Type
interface AnalyticsResponse {
  webinar: Webinar;
  summary: {
    totalRegistrations: number;
    attended: number;
    attendanceRate: number;
    avgWatchTime: number;
    videoDuration: number;
  };
  analytics: Array<{
    id: string;
    webinarId: string;
    sessionDate: Date;
    registrations: number | null;
    attendees: number | null;
  }>;
  registrations: Registration[];
}

// Fake User Schema
const fakeUserSchema = z.object({
  name: z.string().min(1, "請輸入名稱"),
  avatar: z.string().optional(),
});

// Scheduled Message Schema
const scheduledMessageSchema = z.object({
  fakeUserId: z.string().min(1, "請選擇假人"),
  message: z.string().min(1, "請輸入訊息"),
  triggerTime: z.string().min(1, "請輸入觸發時間"),
});

// CTA Button Schema
const ctaSchema = z.object({
  text: z.string().min(1, "請輸入按鈕文字"),
  url: z.string().url("請輸入有效網址"),
  startTime: z.string().min(1, "請輸入開始時間"),
  endTime: z.string().optional(),
  style: z.string().default("primary"),
});

// Poll Schema
const pollSchema = z.object({
  question: z.string().min(1, "請輸入問題"),
  options: z.string().min(1, "請輸入選項（用逗號分隔）"),
  triggerTime: z.string().min(1, "請輸入觸發時間"),
  duration: z.string().default("60"),
});

// Tip Schema
const tipSchema = z.object({
  title: z.string().min(1, "請輸入標題"),
  content: z.string().min(1, "請輸入內容"),
  triggerTime: z.string().min(1, "請輸入觸發時間"),
  duration: z.string().default("30"),
});

export default function AdminWebinarDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isFakeUserOpen, setIsFakeUserOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isCtaOpen, setIsCtaOpen] = useState(false);
  const [isPollOpen, setIsPollOpen] = useState(false);
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerInput, setAnswerInput] = useState("");

  const [settingsScheduleMode, setSettingsScheduleMode] = useState("fixed");
  const [settingsJitMinutes, setSettingsJitMinutes] = useState("15");
  const [settingsTimezone, setSettingsTimezone] = useState("Asia/Taipei");
  const [settingsReplayEnabled, setSettingsReplayEnabled] = useState(true);
  const [settingsReplayHours, setSettingsReplayHours] = useState("48");

  // Queries
  const { data: webinar, isLoading: webinarLoading } = useQuery<Webinar>({
    queryKey: ["/api/webinars", id],
    enabled: !!id,
  });

  const { data: fakeUsers } = useQuery<FakeUser[]>({
    queryKey: ["/api/webinars", id, "fake-users"],
    enabled: !!id,
  });

  const { data: scheduledMessages } = useQuery<ScheduledMessage[]>({
    queryKey: ["/api/webinars", id, "scheduled-messages"],
    enabled: !!id,
  });

  const { data: ctas } = useQuery<CtaButton[]>({
    queryKey: ["/api/webinars", id, "ctas"],
    enabled: !!id,
  });

  const { data: polls } = useQuery<Poll[]>({
    queryKey: ["/api/webinars", id, "polls"],
    enabled: !!id,
  });

  const { data: registrations } = useQuery<Registration[]>({
    queryKey: ["/api/webinars", id, "registrations"],
    enabled: !!id,
  });

  const { data: tips } = useQuery<Tip[]>({
    queryKey: ["/api/webinars", id, "tips"],
    enabled: !!id,
  });

  const { data: questions } = useQuery<Question[]>({
    queryKey: ["/api/webinars", id, "questions"],
    enabled: !!id,
  });

  const { data: analytics } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/webinars", id, "analytics"],
    enabled: !!id,
  });

  const { data: feedbackSurvey } = useQuery<any>({
    queryKey: ["/api/webinars", id, "feedback-survey"],
    enabled: !!id,
  });

  useEffect(() => {
    if (webinar) {
      const sm = webinar.scheduleMode as any;
      if (sm?.justInTime) {
        setSettingsScheduleMode("justInTime");
        setSettingsJitMinutes(String(sm.justInTimeMinutes || 15));
      } else if (sm?.onDemand) {
        setSettingsScheduleMode("onDemand");
      } else {
        setSettingsScheduleMode("fixed");
      }
      setSettingsTimezone(webinar.timezone || "Asia/Taipei");
      setSettingsReplayEnabled(webinar.replayEnabled ?? true);
      setSettingsReplayHours(String(webinar.replayAvailableHours ?? 48));
    }
  }, [webinar]);

  // Forms
  const fakeUserForm = useForm({
    resolver: zodResolver(fakeUserSchema),
    defaultValues: { name: "", avatar: "" },
  });

  const messageForm = useForm({
    resolver: zodResolver(scheduledMessageSchema),
    defaultValues: { fakeUserId: "", message: "", triggerTime: "" },
  });

  const ctaForm = useForm({
    resolver: zodResolver(ctaSchema),
    defaultValues: { text: "", url: "", startTime: "", endTime: "", style: "primary" },
  });

  const pollForm = useForm({
    resolver: zodResolver(pollSchema),
    defaultValues: { question: "", options: "", triggerTime: "", duration: "60" },
  });

  const tipForm = useForm({
    resolver: zodResolver(tipSchema),
    defaultValues: { title: "", content: "", triggerTime: "", duration: "30" },
  });

  // Mutations
  const createFakeUser = useMutation({
    mutationFn: async (data: z.infer<typeof fakeUserSchema>) => {
      return apiRequest("POST", `/api/webinars/${id}/fake-users`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "fake-users"] });
      setIsFakeUserOpen(false);
      fakeUserForm.reset();
      toast({ title: "假人已建立" });
    },
  });

  const createMessage = useMutation({
    mutationFn: async (data: z.infer<typeof scheduledMessageSchema>) => {
      const [min, sec] = data.triggerTime.split(":").map(Number);
      return apiRequest("POST", `/api/webinars/${id}/scheduled-messages`, {
        ...data,
        triggerTime: min * 60 + (sec || 0),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "scheduled-messages"] });
      setIsMessageOpen(false);
      messageForm.reset();
      toast({ title: "預排訊息已建立" });
    },
  });

  const createCta = useMutation({
    mutationFn: async (data: z.infer<typeof ctaSchema>) => {
      const parseTime = (t: string) => {
        const [min, sec] = t.split(":").map(Number);
        return min * 60 + (sec || 0);
      };
      return apiRequest("POST", `/api/webinars/${id}/ctas`, {
        text: data.text,
        url: data.url,
        startTime: parseTime(data.startTime),
        endTime: data.endTime ? parseTime(data.endTime) : null,
        style: data.style,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "ctas"] });
      setIsCtaOpen(false);
      ctaForm.reset();
      toast({ title: "CTA 按鈕已建立" });
    },
  });

  const createPoll = useMutation({
    mutationFn: async (data: z.infer<typeof pollSchema>) => {
      const [min, sec] = data.triggerTime.split(":").map(Number);
      return apiRequest("POST", `/api/webinars/${id}/polls`, {
        question: data.question,
        options: data.options.split(",").map(o => o.trim()),
        triggerTime: min * 60 + (sec || 0),
        duration: parseInt(data.duration),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "polls"] });
      setIsPollOpen(false);
      pollForm.reset();
      toast({ title: "投票已建立" });
    },
  });

  const createTip = useMutation({
    mutationFn: async (data: z.infer<typeof tipSchema>) => {
      const [min, sec] = data.triggerTime.split(":").map(Number);
      return apiRequest("POST", `/api/webinars/${id}/tips`, {
        title: data.title,
        content: data.content,
        triggerTime: min * 60 + (sec || 0),
        duration: parseInt(data.duration),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "tips"] });
      setIsTipOpen(false);
      tipForm.reset();
      toast({ title: "小提示已建立" });
    },
  });

  const updateWebinar = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/webinars/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id] });
      toast({ title: "設定已儲存" });
    },
  });

  const answerQuestion = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      return apiRequest("PATCH", `/api/webinars/${id}/questions/${questionId}`, {
        answer,
        answeredBy: "admin",
        answeredAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "questions"] });
      setAnsweringQuestionId(null);
      setAnswerInput("");
      toast({ title: "已回覆問題" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, itemId }: { type: string; itemId: string }) => {
      return apiRequest("DELETE", `/api/webinars/${id}/${type}/${itemId}`, {});
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, type] });
      toast({ title: "已刪除" });
    },
  });

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "已複製到剪貼簿" });
  };

  if (webinarLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>找不到此直播間</p>
      </div>
    );
  }

  const registrationUrl = `${window.location.origin}/register/${id}`;
  const webinarUrl = `${window.location.origin}/webinar/${id}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{webinar.title}</h1>
            <p className="text-sm text-muted-foreground">直播間設定</p>
          </div>
          <Button onClick={() => setLocation(`/admin/webinar/${id}/control`)} data-testid="button-go-control">
            <Radio className="h-4 w-4 mr-2" />
            即時控制台
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Links Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">直播連結</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={registrationUrl} readOnly className="flex-1" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(registrationUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => window.open(registrationUrl, "_blank")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">將此報名連結分享給觀眾</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="fake-users">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="fake-users">
              <Users className="h-4 w-4 mr-1" />
              假人
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-1" />
              預排訊息
            </TabsTrigger>
            <TabsTrigger value="ctas">
              <MousePointerClick className="h-4 w-4 mr-1" />
              CTA
            </TabsTrigger>
            <TabsTrigger value="polls">
              <BarChart className="h-4 w-4 mr-1" />
              投票
            </TabsTrigger>
            <TabsTrigger value="tips">
              <Lightbulb className="h-4 w-4 mr-1" />
              提示
            </TabsTrigger>
            <TabsTrigger value="questions">
              <HelpCircle className="h-4 w-4 mr-1" />
              Q&A
            </TabsTrigger>
            <TabsTrigger value="survey">
              <Star className="h-4 w-4 mr-1" />
              問卷
            </TabsTrigger>
            <TabsTrigger value="registrations">
              <Users className="h-4 w-4 mr-1" />
              報名 ({registrations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-1" />
              分析
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-1" />
              設定
            </TabsTrigger>
          </TabsList>

          {/* Fake Users Tab */}
          <TabsContent value="fake-users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">假人管理</CardTitle>
                  <CardDescription>建立虛擬觀眾以營造熱絡氣氛</CardDescription>
                </div>
                <Dialog open={isFakeUserOpen} onOpenChange={setIsFakeUserOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-fake-user">
                      <Plus className="h-4 w-4 mr-1" />
                      新增假人
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增假人</DialogTitle>
                    </DialogHeader>
                    <Form {...fakeUserForm}>
                      <form onSubmit={fakeUserForm.handleSubmit((data) => createFakeUser.mutate(data))} className="space-y-4">
                        <FormField
                          control={fakeUserForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>名稱</FormLabel>
                              <FormControl>
                                <Input placeholder="小明" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={createFakeUser.isPending}>
                          {createFakeUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          建立
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {fakeUsers && fakeUsers.length > 0 ? (
                  <div className="space-y-2">
                    {fakeUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <span className="font-medium">{user.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ type: "fake-users", itemId: user.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無假人</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scheduled Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">預排訊息</CardTitle>
                  <CardDescription>設定在特定時間自動發送的訊息</CardDescription>
                </div>
                <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-scheduled-message">
                      <Plus className="h-4 w-4 mr-1" />
                      新增訊息
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增預排訊息</DialogTitle>
                    </DialogHeader>
                    <Form {...messageForm}>
                      <form onSubmit={messageForm.handleSubmit((data) => createMessage.mutate(data))} className="space-y-4">
                        <FormField
                          control={messageForm.control}
                          name="fakeUserId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>發送者</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="選擇假人" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {fakeUsers?.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={messageForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>訊息內容</FormLabel>
                              <FormControl>
                                <Textarea placeholder="太棒了！" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={messageForm.control}
                          name="triggerTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>觸發時間 (分:秒)</FormLabel>
                              <FormControl>
                                <Input placeholder="2:30" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={createMessage.isPending}>
                          {createMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          建立
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {scheduledMessages && scheduledMessages.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {scheduledMessages.sort((a, b) => a.triggerTime - b.triggerTime).map((msg) => {
                        const sender = fakeUsers?.find(u => u.id === msg.fakeUserId);
                        return (
                          <div key={msg.id} className="flex items-start justify-between p-3 bg-muted rounded-md gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(msg.triggerTime)}
                                </Badge>
                                <span className="font-medium text-sm">{sender?.name || "未知"}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate({ type: "scheduled-messages", itemId: msg.id })}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無預排訊息</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CTAs Tab */}
          <TabsContent value="ctas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">CTA 按鈕</CardTitle>
                  <CardDescription>在影片上顯示行動呼籲按鈕</CardDescription>
                </div>
                <Dialog open={isCtaOpen} onOpenChange={setIsCtaOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-cta">
                      <Plus className="h-4 w-4 mr-1" />
                      新增 CTA
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增 CTA 按鈕</DialogTitle>
                    </DialogHeader>
                    <Form {...ctaForm}>
                      <form onSubmit={ctaForm.handleSubmit((data) => createCta.mutate(data))} className="space-y-4">
                        <FormField
                          control={ctaForm.control}
                          name="text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>按鈕文字</FormLabel>
                              <FormControl>
                                <Input placeholder="立即報名" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={ctaForm.control}
                          name="url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>連結網址</FormLabel>
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={ctaForm.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>開始時間 (分:秒)</FormLabel>
                                <FormControl>
                                  <Input placeholder="5:00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={ctaForm.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>結束時間（選填）</FormLabel>
                                <FormControl>
                                  <Input placeholder="10:00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={ctaForm.control}
                          name="style"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>樣式</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="primary">主要（藍色）</SelectItem>
                                  <SelectItem value="secondary">次要（灰色）</SelectItem>
                                  <SelectItem value="danger">強調（紅色）</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={createCta.isPending}>
                          {createCta.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          建立
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {ctas && ctas.length > 0 ? (
                  <div className="space-y-2">
                    {ctas.sort((a, b) => a.startTime - b.startTime).map((cta) => (
                      <div key={cta.id} className="flex items-center justify-between p-3 bg-muted rounded-md gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {formatTime(cta.startTime)} - {cta.endTime ? formatTime(cta.endTime) : "結束"}
                            </Badge>
                            <Badge variant={cta.style === "primary" ? "default" : cta.style === "danger" ? "destructive" : "secondary"}>
                              {cta.text}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{cta.url}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ type: "ctas", itemId: cta.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無 CTA 按鈕</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">投票管理</CardTitle>
                  <CardDescription>設定在特定時間彈出的投票問題</CardDescription>
                </div>
                <Dialog open={isPollOpen} onOpenChange={setIsPollOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-poll">
                      <Plus className="h-4 w-4 mr-1" />
                      新增投票
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增投票</DialogTitle>
                    </DialogHeader>
                    <Form {...pollForm}>
                      <form onSubmit={pollForm.handleSubmit((data) => createPoll.mutate(data))} className="space-y-4">
                        <FormField
                          control={pollForm.control}
                          name="question"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>問題</FormLabel>
                              <FormControl>
                                <Input placeholder="您覺得這個課程如何？" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={pollForm.control}
                          name="options"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>選項（用逗號分隔）</FormLabel>
                              <FormControl>
                                <Input placeholder="非常好, 還可以, 需要改進" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={pollForm.control}
                            name="triggerTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>觸發時間 (分:秒)</FormLabel>
                                <FormControl>
                                  <Input placeholder="5:00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={pollForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>持續時間（秒）</FormLabel>
                                <FormControl>
                                  <Input placeholder="60" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" disabled={createPoll.isPending}>
                          {createPoll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          建立
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {polls && polls.length > 0 ? (
                  <div className="space-y-2">
                    {polls.sort((a, b) => a.triggerTime - b.triggerTime).map((poll) => (
                      <div key={poll.id} className="flex items-start justify-between p-3 bg-muted rounded-md gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(poll.triggerTime)}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm mt-1">{poll.question}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(poll.options as string[]).map((opt, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ type: "polls", itemId: poll.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無投票</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registrations Tab */}
          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">報名名單</CardTitle>
                <CardDescription>已報名參加此直播的觀眾</CardDescription>
              </CardHeader>
              <CardContent>
                {registrations && registrations.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {registrations.map((reg) => (
                        <div key={reg.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <div>
                            <p className="font-medium">{reg.name}</p>
                            <p className="text-sm text-muted-foreground">{reg.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(reg.registeredAt!).toLocaleString("zh-TW")}
                            </p>
                            {reg.attended && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                <Star className="h-3 w-3 mr-1" />
                                已參加
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無報名</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">小提示卡</CardTitle>
                  <CardDescription>在特定時間點顯示的提示訊息</CardDescription>
                </div>
                <Dialog open={isTipOpen} onOpenChange={setIsTipOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-tip">
                      <Plus className="h-4 w-4 mr-1" />
                      新增提示
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增小提示</DialogTitle>
                    </DialogHeader>
                    <Form {...tipForm}>
                      <form onSubmit={tipForm.handleSubmit((data) => createTip.mutate(data))} className="space-y-4">
                        <FormField
                          control={tipForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>標題</FormLabel>
                              <FormControl>
                                <Input placeholder="重要提示" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tipForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>內容</FormLabel>
                              <FormControl>
                                <Textarea placeholder="輸入提示內容..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={tipForm.control}
                            name="triggerTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>觸發時間 (分:秒)</FormLabel>
                                <FormControl>
                                  <Input placeholder="2:30" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={tipForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>顯示時間（秒）</FormLabel>
                                <FormControl>
                                  <Input placeholder="30" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" disabled={createTip.isPending}>
                          {createTip.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          建立
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {tips && tips.length > 0 ? (
                  <div className="space-y-2">
                    {tips.sort((a, b) => a.triggerTime - b.triggerTime).map((tip) => (
                      <div key={tip.id} className="flex items-start justify-between p-3 bg-muted rounded-md gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(tip.triggerTime)}
                            </Badge>
                            <Badge variant="secondary">{tip.duration}秒</Badge>
                          </div>
                          <p className="font-medium text-sm mt-1">{tip.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tip.content}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ type: "tips", itemId: tip.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無提示</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Q&A Tab */}
          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">觀眾問答</CardTitle>
                <CardDescription>觀眾在直播中提交的問題</CardDescription>
              </CardHeader>
              <CardContent>
                {questions && questions.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {questions.map((q) => (
                        <div key={q.id} className="p-3 bg-muted rounded-md" data-testid={`qa-item-${q.id}`}>
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{q.askerName || "匿名"}</span>
                              <Badge variant={q.answer ? "secondary" : "outline"}>
                                {q.answer ? "已回覆" : "待回覆"}
                              </Badge>
                              {q.isPreset && <Badge variant="secondary">FAQ</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              {!q.answer && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setAnsweringQuestionId(q.id);
                                    setAnswerInput("");
                                  }}
                                  data-testid={`button-answer-${q.id}`}
                                >
                                  回覆
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMutation.mutate({ type: "questions", itemId: q.id })}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm">{q.question}</p>
                          {q.answer && (
                            <div className="mt-2 pl-3 border-l-2 border-primary">
                              <p className="text-sm text-muted-foreground">{q.answer}</p>
                            </div>
                          )}
                          {answeringQuestionId === q.id && (
                            <div className="mt-2 flex gap-2">
                              <Input
                                placeholder="輸入回覆..."
                                value={answerInput}
                                onChange={(e) => setAnswerInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && answerInput.trim()) {
                                    answerQuestion.mutate({ questionId: q.id, answer: answerInput.trim() });
                                  }
                                }}
                                data-testid={`input-answer-${q.id}`}
                              />
                              <Button
                                size="sm"
                                disabled={answerQuestion.isPending || !answerInput.trim()}
                                onClick={() => answerQuestion.mutate({ questionId: q.id, answer: answerInput.trim() })}
                                data-testid={`button-submit-answer-${q.id}`}
                              >
                                送出
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setAnsweringQuestionId(null)}
                              >
                                取消
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無問題</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Survey Tab */}
          <TabsContent value="survey">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">回饋問卷</CardTitle>
                <CardDescription>直播結束後向觀眾收集回饋</CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackSurvey ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{feedbackSurvey.title}</span>
                      <Badge variant={feedbackSurvey.isActive ? "default" : "secondary"}>
                        {feedbackSurvey.isActive ? "啟用中" : "已停用"}
                      </Badge>
                    </div>
                    {feedbackSurvey.questions && (feedbackSurvey.questions as any[]).length > 0 && (
                      <div className="space-y-2">
                        {(feedbackSurvey.questions as any[]).map((q: any, i: number) => (
                          <div key={q.id || i} className="p-3 bg-muted rounded-md">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {q.type === "rating" ? "評分" : q.type === "text" ? "文字" : "選擇"}
                              </Badge>
                              {q.required && <Badge variant="secondary" className="text-xs">必填</Badge>}
                            </div>
                            <p className="text-sm">{q.question}</p>
                            {q.options && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {q.options.map((opt: string, oi: number) => (
                                  <Badge key={oi} variant="outline" className="text-xs">{opt}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">尚未設定問卷</p>
                    <Button
                      size="sm"
                      onClick={() => {
                        apiRequest("POST", `/api/webinars/${id}/feedback-survey`, {
                          webinarId: id,
                          title: "請給我們回饋",
                          questions: [
                            { id: "q1", type: "rating", question: "您對本次直播的整體評價？", required: true },
                            { id: "q2", type: "text", question: "您最喜歡哪個部分？", required: false },
                            { id: "q3", type: "multiChoice", question: "您會推薦給朋友嗎？", options: ["一定會", "可能會", "不確定", "不會"], required: true },
                          ],
                          isActive: true,
                        }).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "feedback-survey"] });
                          toast({ title: "預設問卷已建立" });
                        });
                      }}
                      data-testid="button-create-default-survey"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      建立預設問卷
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">數據分析</CardTitle>
                <CardDescription>查看直播的統計數據</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted rounded-md text-center">
                        <p className="text-2xl font-bold">{analytics.summary?.totalRegistrations || 0}</p>
                        <p className="text-xs text-muted-foreground">報名人數</p>
                      </div>
                      <div className="p-4 bg-muted rounded-md text-center">
                        <p className="text-2xl font-bold">{analytics.summary?.attended || 0}</p>
                        <p className="text-xs text-muted-foreground">參加人數</p>
                      </div>
                      <div className="p-4 bg-muted rounded-md text-center">
                        <p className="text-2xl font-bold">{analytics.summary?.attendanceRate?.toFixed(1) || 0}%</p>
                        <p className="text-xs text-muted-foreground">出席率</p>
                      </div>
                      <div className="p-4 bg-muted rounded-md text-center">
                        <p className="text-2xl font-bold">{formatTime(analytics.summary?.avgWatchTime || 0)}</p>
                        <p className="text-xs text-muted-foreground">平均觀看時間</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">觀眾出席詳情</h4>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {analytics.registrations?.filter((r) => r.attended).map((reg) => (
                            <div key={reg.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                              <span>{reg.name}</span>
                              <span className="text-muted-foreground">
                                觀看 {formatTime(reg.watchDuration || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">尚無分析數據</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">直播間設定</CardTitle>
                <CardDescription>排程模式、時區與重播設定</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>排程模式</Label>
                  <Select value={settingsScheduleMode} onValueChange={setSettingsScheduleMode}>
                    <SelectTrigger data-testid="select-schedule-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">固定時間</SelectItem>
                      <SelectItem value="onDemand">隨選觀看</SelectItem>
                      <SelectItem value="justInTime">即時開始</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settingsScheduleMode === "justInTime" && (
                  <div className="space-y-2">
                    <Label>即時開始分鐘數</Label>
                    <Input
                      type="number"
                      min="1"
                      value={settingsJitMinutes}
                      onChange={(e) => setSettingsJitMinutes(e.target.value)}
                      data-testid="input-jit-minutes"
                    />
                    <p className="text-xs text-muted-foreground">觀眾進入後，下一場將在此分鐘數內開始</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>時區</Label>
                  <Select value={settingsTimezone} onValueChange={setSettingsTimezone}>
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Taipei">Asia/Taipei (台北)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (東京)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Asia/Shanghai (上海)</SelectItem>
                      <SelectItem value="Asia/Hong_Kong">Asia/Hong_Kong (香港)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (紐約)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (洛杉磯)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (倫敦)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (巴黎)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (雪梨)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label>啟用重播</Label>
                    <Switch
                      checked={settingsReplayEnabled}
                      onCheckedChange={setSettingsReplayEnabled}
                      data-testid="switch-replay-enabled"
                    />
                  </div>

                  {settingsReplayEnabled && (
                    <div className="space-y-2">
                      <Label>重播可用時數</Label>
                      <Input
                        type="number"
                        min="1"
                        value={settingsReplayHours}
                        onChange={(e) => setSettingsReplayHours(e.target.value)}
                        data-testid="input-replay-hours"
                      />
                      <p className="text-xs text-muted-foreground">直播結束後，重播影片的可用時數</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    const scheduleMode = {
                      recurring: false,
                      onDemand: settingsScheduleMode === "onDemand",
                      justInTime: settingsScheduleMode === "justInTime",
                      justInTimeMinutes: settingsScheduleMode === "justInTime" ? parseInt(settingsJitMinutes) || 15 : 15,
                    };
                    updateWebinar.mutate({
                      scheduleMode,
                      timezone: settingsTimezone,
                      replayEnabled: settingsReplayEnabled,
                      replayAvailableHours: parseInt(settingsReplayHours) || 48,
                    });
                  }}
                  disabled={updateWebinar.isPending}
                  data-testid="button-save-settings"
                >
                  {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  儲存設定
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
