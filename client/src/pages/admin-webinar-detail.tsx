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
  Lightbulb, HelpCircle, Star, TrendingUp, Settings, Code,
  Mail, Palette, Calendar, Edit, Save, RefreshCw, FileText, Eye
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from "recharts";
import type { Webinar, FakeUser, ScheduledMessage, CtaButton, Poll, Registration, Tip, Question, FeedbackSurvey } from "@shared/schema";
import type { FeedbackResponse } from "@shared/schema";

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

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVimeoUrl, setEditVimeoUrl] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editCoverImage, setEditCoverImage] = useState("");

  // Brand settings state
  const [brandLogo, setBrandLogo] = useState("");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#667eea");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#764ba2");
  const [brandBackgroundColor, setBrandBackgroundColor] = useState("#1a1a2e");

  // Email settings state
  const [emailConfirmation, setEmailConfirmation] = useState(true);
  const [emailReminder24h, setEmailReminder24h] = useState(true);
  const [emailReminder1h, setEmailReminder1h] = useState(true);
  const [emailFollowUp, setEmailFollowUp] = useState(true);
  const [emailCustomSubject, setEmailCustomSubject] = useState("");
  const [emailCustomTemplate, setEmailCustomTemplate] = useState("");

  // Recurring schedule state
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringTimes, setRecurringTimes] = useState("");
  const [recurringExcludeDates, setRecurringExcludeDates] = useState("");

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

  const { data: feedbackResponses } = useQuery<FeedbackResponse[]>({
    queryKey: ["/api/feedback-surveys", feedbackSurvey?.id, "responses"],
    enabled: !!feedbackSurvey?.id,
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

      // Initialize edit info
      setEditTitle(webinar.title);
      setEditDescription(webinar.description || "");
      setEditVimeoUrl(webinar.vimeoUrl);
      setEditStartTime(new Date(webinar.startTime).toISOString().slice(0, 16));
      setEditCoverImage(webinar.coverImage || "");

      // Initialize brand settings
      const bs = webinar.brandSettings as any;
      if (bs) {
        setBrandLogo(bs.logo || "");
        setBrandPrimaryColor(bs.primaryColor || "#667eea");
        setBrandSecondaryColor(bs.secondaryColor || "#764ba2");
        setBrandBackgroundColor(bs.backgroundColor || "#1a1a2e");
      }

      // Initialize email settings
      const es = webinar.emailSettings as any;
      if (es) {
        setEmailConfirmation(es.confirmationEnabled ?? true);
        setEmailReminder24h(es.reminder24hEnabled ?? true);
        setEmailReminder1h(es.reminder1hEnabled ?? true);
        setEmailFollowUp(es.followUpEnabled ?? true);
        setEmailCustomSubject(es.customSubject || "");
        setEmailCustomTemplate(es.customTemplate || "");
      }

      // Initialize recurring schedule
      const rs = webinar.recurringSchedule as any;
      if (rs) {
        setRecurringEnabled(rs.enabled ?? false);
        setRecurringDays(rs.days || []);
        setRecurringTimes((rs.times || []).join(", "));
        setRecurringExcludeDates((rs.excludeDates || []).join(", "));
      }
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
      const res = await apiRequest("PATCH", `/api/webinars/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/webinars"] });
      setIsEditingInfo(false);
      toast({ title: "設定已儲存" });
    },
    onError: (error: Error) => {
      toast({ title: "儲存失敗", description: error.message, variant: "destructive" });
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
            {isEditingInfo ? (
              <div className="space-y-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="直播標題"
                  data-testid="input-edit-title"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    value={editVimeoUrl}
                    onChange={(e) => setEditVimeoUrl(e.target.value)}
                    placeholder="Vimeo 網址"
                    className="flex-1 min-w-[200px]"
                    data-testid="input-edit-vimeo"
                  />
                  <Input
                    type="datetime-local"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-auto"
                    data-testid="input-edit-start-time"
                  />
                </div>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="直播描述（選填）"
                  className="resize-none"
                  rows={2}
                  data-testid="input-edit-description"
                />
                <Input
                  value={editCoverImage}
                  onChange={(e) => setEditCoverImage(e.target.value)}
                  placeholder="封面圖片網址（選填）"
                  data-testid="input-edit-cover"
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      updateWebinar.mutate({
                        title: editTitle,
                        description: editDescription || null,
                        vimeoUrl: editVimeoUrl,
                        startTime: new Date(editStartTime).toISOString(),
                        coverImage: editCoverImage || null,
                      });
                    }}
                    disabled={updateWebinar.isPending || !editTitle || !editVimeoUrl}
                    data-testid="button-save-info"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    儲存
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingInfo(false)}>
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div>
                  <h1 className="text-lg font-bold">{webinar.title}</h1>
                  <p className="text-sm text-muted-foreground">直播間設定</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingInfo(true)} data-testid="button-edit-info">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
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
            <TabsTrigger value="embed" data-testid="tab-embed">
              <Code className="h-4 w-4 mr-1" />
              嵌入
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
            <div className="space-y-6">
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

              {feedbackSurvey && feedbackResponses && feedbackResponses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">問卷回覆統計</CardTitle>
                    <CardDescription>共 {feedbackResponses.length} 份回覆</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(feedbackSurvey.questions as any[])?.map((q: any) => {
                      const questionResponses = feedbackResponses
                        .map(r => (r.responses as Record<string, any>)?.[q.id])
                        .filter(v => v !== undefined && v !== null);

                      if (questionResponses.length === 0) return null;

                      return (
                        <div key={q.id} className="space-y-2">
                          <p className="text-sm font-medium">{q.question}</p>
                          {q.type === "rating" && (() => {
                            const nums = questionResponses.map(Number).filter(n => !isNaN(n));
                            const avg = nums.length > 0 ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length) : 0;
                            const distribution = [1, 2, 3, 4, 5].map(star => ({
                              star: `${star}`,
                              count: nums.filter((n: number) => n === star).length
                            }));
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold" data-testid={`text-avg-rating-${q.id}`}>{avg.toFixed(1)}</span>
                                  <span className="text-sm text-muted-foreground">/ 5 ({nums.length} 份回覆)</span>
                                </div>
                                <div className="space-y-1">
                                  {distribution.reverse().map(d => (
                                    <div key={d.star} className="flex items-center gap-2 text-sm">
                                      <span className="w-8 text-right">{d.star}</span>
                                      <div className="flex-1 bg-muted rounded-full h-2">
                                        <div
                                          className="bg-primary h-2 rounded-full"
                                          style={{ width: `${nums.length > 0 ? (d.count / nums.length * 100) : 0}%` }}
                                        />
                                      </div>
                                      <span className="w-8 text-muted-foreground">{d.count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                          {q.type === "multiChoice" && (() => {
                            const counts: Record<string, number> = {};
                            questionResponses.forEach((v: any) => {
                              counts[v] = (counts[v] || 0) + 1;
                            });
                            return (
                              <div className="space-y-1">
                                {(q.options || []).map((opt: string) => (
                                  <div key={opt} className="flex items-center gap-2 text-sm">
                                    <span className="w-24 truncate">{opt}</span>
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                      <div
                                        className="bg-primary h-2 rounded-full"
                                        style={{ width: `${questionResponses.length > 0 ? ((counts[opt] || 0) / questionResponses.length * 100) : 0}%` }}
                                      />
                                    </div>
                                    <span className="w-12 text-muted-foreground text-right">{counts[opt] || 0} ({questionResponses.length > 0 ? Math.round((counts[opt] || 0) / questionResponses.length * 100) : 0}%)</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          {q.type === "text" && (
                            <ScrollArea className="h-[150px]">
                              <div className="space-y-2">
                                {questionResponses.map((v: any, i: number) => (
                                  <div key={i} className="p-2 bg-muted rounded-md text-sm">{String(v)}</div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {feedbackSurvey && (!feedbackResponses || feedbackResponses.length === 0) && (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">尚無問卷回覆</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {analytics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-total-registrations">{analytics.summary?.totalRegistrations || 0}</p>
                      <p className="text-xs text-muted-foreground">報名人數</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-attended">{analytics.summary?.attended || 0}</p>
                      <p className="text-xs text-muted-foreground">參加人數</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-attendance-rate">{analytics.summary?.attendanceRate?.toFixed(1) || 0}%</p>
                      <p className="text-xs text-muted-foreground">出席率</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-avg-watch-time">{formatTime(analytics.summary?.avgWatchTime || 0)}</p>
                      <p className="text-xs text-muted-foreground">平均觀看時間</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">報名 vs 出席</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const pieData = [
                          { name: "已出席", value: analytics.summary?.attended || 0 },
                          { name: "未出席", value: (analytics.summary?.totalRegistrations || 0) - (analytics.summary?.attended || 0) },
                        ].filter(d => d.value > 0);
                        const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground) / 0.3)"];
                        return pieData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {pieData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">尚無數據</p>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">觀看時長分佈</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const attendedRegs = analytics.registrations?.filter(r => r.attended && r.watchDuration) || [];
                        if (attendedRegs.length === 0) return <p className="text-center text-muted-foreground py-8">尚無數據</p>;
                        const videoDuration = analytics.summary?.videoDuration || 3600;
                        const buckets = [
                          { name: "0-25%", count: 0 },
                          { name: "25-50%", count: 0 },
                          { name: "50-75%", count: 0 },
                          { name: "75-100%", count: 0 },
                        ];
                        attendedRegs.forEach(r => {
                          const pct = ((r.watchDuration || 0) / videoDuration) * 100;
                          if (pct < 25) buckets[0].count++;
                          else if (pct < 50) buckets[1].count++;
                          else if (pct < 75) buckets[2].count++;
                          else buckets[3].count++;
                        });
                        return (
                          <ResponsiveContainer width="100%" height={200}>
                            <RechartsBarChart data={buckets}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="觀眾數" />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">觀眾留存曲線</CardTitle>
                    <CardDescription>觀眾在影片各時間點的留存比例</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const attendedRegs = analytics.registrations?.filter(r => r.attended && r.watchDuration) || [];
                      if (attendedRegs.length === 0) return <p className="text-center text-muted-foreground py-8">尚無數據</p>;
                      const videoDuration = analytics.summary?.videoDuration || 3600;
                      const totalViewers = attendedRegs.length;
                      const points: { time: string; retention: number; viewers: number }[] = [];
                      const steps = 10;
                      for (let i = 0; i <= steps; i++) {
                        const timeSec = Math.round((i / steps) * videoDuration);
                        const viewersAtTime = attendedRegs.filter(r => (r.watchDuration || 0) >= timeSec).length;
                        const mins = Math.floor(timeSec / 60);
                        const secs = timeSec % 60;
                        points.push({
                          time: `${mins}:${secs.toString().padStart(2, "0")}`,
                          retention: Math.round((viewersAtTime / totalViewers) * 100),
                          viewers: viewersAtTime,
                        });
                      }
                      return (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={points}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="time" fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} unit="%" />
                            <Tooltip formatter={(val: number, name: string) => name === "retention" ? [`${val}%`, "留存率"] : [val, "觀眾數"]} />
                            <Area type="monotone" dataKey="retention" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="retention" />
                          </AreaChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">觀眾出席詳情</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[250px]">
                      <div className="space-y-2">
                        {analytics.registrations?.filter((r) => r.attended).length === 0 && (
                          <p className="text-center text-muted-foreground py-4">尚無出席記錄</p>
                        )}
                        {analytics.registrations?.filter((r) => r.attended).map((reg) => {
                          const pct = analytics.summary?.videoDuration ? Math.min(100, Math.round(((reg.watchDuration || 0) / analytics.summary.videoDuration) * 100)) : 0;
                          return (
                            <div key={reg.id} className="flex items-center justify-between gap-2 p-3 bg-muted rounded-md text-sm">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{reg.name}</span>
                                <span className="text-muted-foreground ml-2">{reg.email}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="w-20 bg-background rounded-full h-2">
                                  <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-muted-foreground w-16 text-right">
                                  {formatTime(reg.watchDuration || 0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">尚無分析數據</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Embed Tab */}
          <TabsContent value="embed">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">嵌入報名表單</CardTitle>
                  <CardDescription>將報名表單嵌入到其他網站，訪客可以直接在你的網站上報名</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-register-code">{`<iframe src="${window.location.origin}/embed/register/${id}" width="100%" height="500" frameborder="0" style="border:none;border-radius:12px;max-width:460px;"></iframe>`}</pre>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`<iframe src="${window.location.origin}/embed/register/${id}" width="100%" height="500" frameborder="0" style="border:none;border-radius:12px;max-width:460px;"></iframe>`);
                        toast({ title: "已複製嵌入代碼" });
                      }}
                      data-testid="button-copy-embed-register"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">預覽效果：</p>
                    <div className="mt-2 border rounded-md overflow-hidden" style={{ maxWidth: 460 }}>
                      <iframe
                        src={`/embed/register/${id}`}
                        width="100%"
                        height="400"
                        style={{ border: "none" }}
                        title="報名表單預覽"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">嵌入直播間播放器</CardTitle>
                  <CardDescription>將直播間嵌入到其他網站，觀眾可直接在你的網站上觀看直播</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-webinar-code">{`<iframe src="${window.location.origin}/embed/webinar/${id}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;" allow="autoplay; fullscreen"></iframe>`}</pre>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`<iframe src="${window.location.origin}/embed/webinar/${id}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;" allow="autoplay; fullscreen"></iframe>`);
                        toast({ title: "已複製嵌入代碼" });
                      }}
                      data-testid="button-copy-embed-webinar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">彈出式報名按鈕</CardTitle>
                  <CardDescription>在其他網站加入一段 JavaScript，訪客點擊按鈕後彈出報名視窗</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">步驟 1：加入 Script 標籤（放在 &lt;/body&gt; 前）</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-script-code">{`<script src="${window.location.origin}/livecast-widget.js"></script>`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`<script src="${window.location.origin}/livecast-widget.js"></script>`);
                          toast({ title: "已複製 Script 代碼" });
                        }}
                        data-testid="button-copy-embed-script"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">步驟 2：在按鈕上加入屬性</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-button-code">{`<button data-livecast-register="${id}">立即報名</button>`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`<button data-livecast-register="${id}">立即報名</button>`);
                          toast({ title: "已複製按鈕代碼" });
                        }}
                        data-testid="button-copy-embed-button"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">或用 JavaScript 直接呼叫</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">{`LiveCast.openRegister("${id}");`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`LiveCast.openRegister("${id}");`);
                          toast({ title: "已複製" });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">內嵌報名元件（Inline Widget）</CardTitle>
                  <CardDescription>直接嵌入到其他網頁中，訪客可以選擇時段並報名，無需彈出視窗</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">步驟 1：加入 Script 標籤（放在 &lt;/body&gt; 前）</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-inline-script">{`<script src="${window.location.origin}/livecast-widget.js"></script>`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`<script src="${window.location.origin}/livecast-widget.js"></script>`);
                          toast({ title: "已複製 Script 代碼" });
                        }}
                        data-testid="button-copy-inline-script"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">步驟 2：在頁面中放入容器元素</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-inline-div">{`<div data-livecast-inline-register="${id}"></div>`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`<div data-livecast-inline-register="${id}"></div>`);
                          toast({ title: "已複製內嵌代碼" });
                        }}
                        data-testid="button-copy-inline-div"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">報名表單會自動嵌入到該容器中，支援時段選擇、品牌設定，並且會自動調整高度。</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Existing schedule/timezone/replay settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">排程設定</CardTitle>
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
                    儲存排程設定
                  </Button>
                </CardContent>
              </Card>

              {/* Brand Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    品牌設定
                  </CardTitle>
                  <CardDescription>自訂直播間的外觀和品牌元素</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo 網址</Label>
                    <Input
                      value={brandLogo}
                      onChange={(e) => setBrandLogo(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      data-testid="input-brand-logo"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>主色調</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandPrimaryColor}
                          onChange={(e) => setBrandPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded-md border cursor-pointer"
                          data-testid="input-brand-primary-color"
                        />
                        <Input
                          value={brandPrimaryColor}
                          onChange={(e) => setBrandPrimaryColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>副色調</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandSecondaryColor}
                          onChange={(e) => setBrandSecondaryColor(e.target.value)}
                          className="w-10 h-10 rounded-md border cursor-pointer"
                          data-testid="input-brand-secondary-color"
                        />
                        <Input
                          value={brandSecondaryColor}
                          onChange={(e) => setBrandSecondaryColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>背景色</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={brandBackgroundColor}
                          onChange={(e) => setBrandBackgroundColor(e.target.value)}
                          className="w-10 h-10 rounded-md border cursor-pointer"
                          data-testid="input-brand-bg-color"
                        />
                        <Input
                          value={brandBackgroundColor}
                          onChange={(e) => setBrandBackgroundColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  {brandLogo && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-2">Logo 預覽：</p>
                      <img src={brandLogo} alt="Logo preview" className="max-h-16 object-contain" />
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      updateWebinar.mutate({
                        brandSettings: {
                          logo: brandLogo,
                          watermark: "",
                          primaryColor: brandPrimaryColor,
                          secondaryColor: brandSecondaryColor,
                          backgroundColor: brandBackgroundColor,
                        },
                      });
                    }}
                    disabled={updateWebinar.isPending}
                    data-testid="button-save-brand"
                  >
                    {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    儲存品牌設定
                  </Button>
                </CardContent>
              </Card>

              {/* Email Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    郵件設定
                  </CardTitle>
                  <CardDescription>控制自動郵件通知的開關和內容</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label>報名確認信</Label>
                      <Switch
                        checked={emailConfirmation}
                        onCheckedChange={setEmailConfirmation}
                        data-testid="switch-email-confirmation"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>24 小時前提醒</Label>
                      <Switch
                        checked={emailReminder24h}
                        onCheckedChange={setEmailReminder24h}
                        data-testid="switch-email-24h"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>1 小時前提醒</Label>
                      <Switch
                        checked={emailReminder1h}
                        onCheckedChange={setEmailReminder1h}
                        data-testid="switch-email-1h"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>結束後跟進信</Label>
                      <Switch
                        checked={emailFollowUp}
                        onCheckedChange={setEmailFollowUp}
                        data-testid="switch-email-followup"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>自訂郵件主旨（選填）</Label>
                    <Input
                      value={emailCustomSubject}
                      onChange={(e) => setEmailCustomSubject(e.target.value)}
                      placeholder="留空使用預設主旨"
                      data-testid="input-email-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>自訂郵件模板（選填）</Label>
                    <Textarea
                      value={emailCustomTemplate}
                      onChange={(e) => setEmailCustomTemplate(e.target.value)}
                      placeholder="留空使用預設模板，支援 HTML"
                      rows={4}
                      data-testid="input-email-template"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      updateWebinar.mutate({
                        emailSettings: {
                          confirmationEnabled: emailConfirmation,
                          reminder24hEnabled: emailReminder24h,
                          reminder1hEnabled: emailReminder1h,
                          followUpEnabled: emailFollowUp,
                          customSubject: emailCustomSubject,
                          customTemplate: emailCustomTemplate,
                        },
                      });
                    }}
                    disabled={updateWebinar.isPending}
                    data-testid="button-save-email"
                  >
                    {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    儲存郵件設定
                  </Button>
                </CardContent>
              </Card>

              {/* Recurring Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    循環排程
                  </CardTitle>
                  <CardDescription>自動產生定期直播場次</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label>啟用循環排程</Label>
                    <Switch
                      checked={recurringEnabled}
                      onCheckedChange={setRecurringEnabled}
                      data-testid="switch-recurring-enabled"
                    />
                  </div>
                  {recurringEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label>每週播放日</Label>
                        <div className="flex flex-wrap gap-2">
                          {["日", "一", "二", "三", "四", "五", "六"].map((day, i) => (
                            <Button
                              key={i}
                              size="sm"
                              variant={recurringDays.includes(i) ? "default" : "outline"}
                              onClick={() => {
                                setRecurringDays(prev =>
                                  prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort()
                                );
                              }}
                              data-testid={`button-recurring-day-${i}`}
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>播放時間（多個時間用逗號分隔）</Label>
                        <Input
                          value={recurringTimes}
                          onChange={(e) => setRecurringTimes(e.target.value)}
                          placeholder="09:00, 14:00, 19:00"
                          data-testid="input-recurring-times"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>排除日期（用逗號分隔）</Label>
                        <Input
                          value={recurringExcludeDates}
                          onChange={(e) => setRecurringExcludeDates(e.target.value)}
                          placeholder="2026-01-01, 2026-02-14"
                          data-testid="input-recurring-exclude"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          onClick={() => {
                            updateWebinar.mutate({
                              recurringSchedule: {
                                enabled: recurringEnabled,
                                days: recurringDays,
                                times: recurringTimes.split(",").map(t => t.trim()).filter(Boolean),
                                excludeDates: recurringExcludeDates.split(",").map(d => d.trim()).filter(Boolean),
                              },
                            });
                          }}
                          disabled={updateWebinar.isPending}
                          data-testid="button-save-recurring"
                        >
                          {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          儲存循環排程
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            apiRequest("POST", `/api/webinars/${id}/generate-sessions`, { days: 30 })
                              .then(() => {
                                toast({ title: "已產生未來 30 天的場次" });
                              })
                              .catch((err: any) => {
                                toast({ title: "產生場次失敗", description: err.message, variant: "destructive" });
                              });
                          }}
                          data-testid="button-generate-sessions"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          產生未來 30 天場次
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
