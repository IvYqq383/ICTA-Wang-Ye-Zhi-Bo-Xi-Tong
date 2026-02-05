import { useState } from "react";
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
  BarChart, Trash2, Loader2, Clock, Radio, Copy, ExternalLink
} from "lucide-react";
import type { Webinar, FakeUser, ScheduledMessage, CtaButton, Poll, Registration } from "@shared/schema";

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

export default function AdminWebinarDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isFakeUserOpen, setIsFakeUserOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isCtaOpen, setIsCtaOpen] = useState(false);
  const [isPollOpen, setIsPollOpen] = useState(false);

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
          <TabsList className="mb-4">
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
              CTA 按鈕
            </TabsTrigger>
            <TabsTrigger value="polls">
              <BarChart className="h-4 w-4 mr-1" />
              投票
            </TabsTrigger>
            <TabsTrigger value="registrations">
              <Users className="h-4 w-4 mr-1" />
              報名 ({registrations?.length || 0})
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
                          <p className="text-xs text-muted-foreground">
                            {new Date(reg.registeredAt!).toLocaleString("zh-TW")}
                          </p>
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
        </Tabs>
      </main>
    </div>
  );
}
