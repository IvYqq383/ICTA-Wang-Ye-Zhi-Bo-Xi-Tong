import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAdminLang, type LangAdmin } from "@/hooks/use-lang";
import { 
  Plus, Video, Calendar, 
  ExternalLink, Loader2, LogOut, Radio, Copy,
  BarChart3, Users, Pencil, Share2, MessageCircle,
  Eye, Code, Trash2, MoreVertical, Languages
} from "lucide-react";
import type { Webinar } from "@shared/schema";

type WebinarStats = Record<string, {
  registered: number;
  attended: number;
  engaged: number;
  onlineCount: number;
}>;

const t: Record<LangAdmin, {
  validationTitle: string;
  validationVimeoUrl: string;
  validationStartTime: string;
  toastCreateSuccess: string;
  toastCreateSuccessDesc: string;
  toastCreateFail: string;
  toastDuplicateSuccess: string;
  toastDuplicateSuccessDesc: string;
  toastDuplicateFail: string;
  toastDeleteSuccess: string;
  toastDeleteSuccessDesc: string;
  toastDeleteFail: string;
  toastLinkCopied: string;
  toastLinkCopiedDesc: string;
  statusLive: string;
  statusEnded: string;
  statusUpcoming: string;
  logout: string;
  management: string;
  managementDesc: string;
  createWebinar: string;
  createNewWebinar: string;
  createNewWebinarDesc: string;
  labelTitle: string;
  placeholderTitle: string;
  labelDescription: string;
  placeholderDescription: string;
  labelVimeoUrl: string;
  labelStartTime: string;
  labelCoverImage: string;
  cancel: string;
  creating: string;
  create: string;
  statRegistered: string;
  statAttended: string;
  statEngagement: string;
  statOnline: string;
  onlineCount: (n: number) => string;
  actionEdit: string;
  actionControl: string;
  actionShare: string;
  actionMore: string;
  actionPreview: string;
  actionDuplicate: string;
  actionDelete: string;
  deleteConfirmTitle: string;
  deleteConfirmDesc: (title: string) => string;
  deleteCancel: string;
  deleteConfirm: string;
  emptyTitle: string;
  emptyDesc: string;
}> = {
  "zh-TW": {
    validationTitle: "請輸入標題",
    validationVimeoUrl: "請輸入有效的 Vimeo 網址",
    validationStartTime: "請選擇開始時間",
    toastCreateSuccess: "建立成功",
    toastCreateSuccessDesc: "直播間已建立",
    toastCreateFail: "建立失敗",
    toastDuplicateSuccess: "複製成功",
    toastDuplicateSuccessDesc: "直播間已複製",
    toastDuplicateFail: "複製失敗",
    toastDeleteSuccess: "已刪除",
    toastDeleteSuccessDesc: "直播間已成功刪除",
    toastDeleteFail: "刪除失敗",
    toastLinkCopied: "已複製連結",
    toastLinkCopiedDesc: "報名頁連結已複製到剪貼簿",
    statusLive: "直播中",
    statusEnded: "已結束",
    statusUpcoming: "即將開始",
    logout: "登出",
    management: "直播間管理",
    managementDesc: "建立和管理您的線上研討會",
    createWebinar: "建立直播間",
    createNewWebinar: "建立新直播間",
    createNewWebinarDesc: "設定直播間基本資訊",
    labelTitle: "直播標題",
    placeholderTitle: "輸入直播標題",
    labelDescription: "描述（選填）",
    placeholderDescription: "直播簡介",
    labelVimeoUrl: "Vimeo 影片網址",
    labelStartTime: "開始時間",
    labelCoverImage: "封面圖片網址（選填）",
    cancel: "取消",
    creating: "建立中...",
    create: "建立",
    statRegistered: "報名數",
    statAttended: "出席數",
    statEngagement: "互動率",
    statOnline: "在線觀眾",
    onlineCount: (n: number) => `${n} 人在線`,
    actionEdit: "編輯管理",
    actionControl: "控制台",
    actionShare: "分享連結",
    actionMore: "更多",
    actionPreview: "報名頁預覽",
    actionDuplicate: "複製直播間",
    actionDelete: "刪除",
    deleteConfirmTitle: "確定要刪除此直播間？",
    deleteConfirmDesc: (title: string) => `將會刪除「${title}」及其所有相關資料（報名記錄、聊天訊息、分析數據等），此操作無法復原。`,
    deleteCancel: "取消",
    deleteConfirm: "確定刪除",
    emptyTitle: "尚無直播間",
    emptyDesc: "建立您的第一個線上研討會",
  },
  "zh-CN": {
    validationTitle: "请输入标题",
    validationVimeoUrl: "请输入有效的 Vimeo 网址",
    validationStartTime: "请选择开始时间",
    toastCreateSuccess: "创建成功",
    toastCreateSuccessDesc: "直播间已创建",
    toastCreateFail: "创建失败",
    toastDuplicateSuccess: "复制成功",
    toastDuplicateSuccessDesc: "直播间已复制",
    toastDuplicateFail: "复制失败",
    toastDeleteSuccess: "已删除",
    toastDeleteSuccessDesc: "直播间已成功删除",
    toastDeleteFail: "删除失败",
    toastLinkCopied: "已复制链接",
    toastLinkCopiedDesc: "报名页链接已复制到剪贴板",
    statusLive: "直播中",
    statusEnded: "已结束",
    statusUpcoming: "即将开始",
    logout: "登出",
    management: "直播间管理",
    managementDesc: "创建和管理您的线上研讨会",
    createWebinar: "创建直播间",
    createNewWebinar: "创建新直播间",
    createNewWebinarDesc: "设定直播间基本信息",
    labelTitle: "直播标题",
    placeholderTitle: "输入直播标题",
    labelDescription: "描述（选填）",
    placeholderDescription: "直播简介",
    labelVimeoUrl: "Vimeo 视频网址",
    labelStartTime: "开始时间",
    labelCoverImage: "封面图片网址（选填）",
    cancel: "取消",
    creating: "创建中...",
    create: "创建",
    statRegistered: "报名数",
    statAttended: "出席数",
    statEngagement: "互动率",
    statOnline: "在线观众",
    onlineCount: (n: number) => `${n} 人在线`,
    actionEdit: "编辑管理",
    actionControl: "控制台",
    actionShare: "分享链接",
    actionMore: "更多",
    actionPreview: "报名页预览",
    actionDuplicate: "复制直播间",
    actionDelete: "删除",
    deleteConfirmTitle: "确定要删除此直播间？",
    deleteConfirmDesc: (title: string) => `将会删除「${title}」及其所有相关资料（报名记录、聊天消息、分析数据等），此操作无法恢复。`,
    deleteCancel: "取消",
    deleteConfirm: "确定删除",
    emptyTitle: "尚无直播间",
    emptyDesc: "创建您的第一个线上研讨会",
  },
};

type WebinarForm = z.infer<ReturnType<typeof createWebinarSchema>>;

function createWebinarSchema(s: typeof t["zh-TW"]) {
  return z.object({
    title: z.string().min(1, s.validationTitle),
    description: z.string().optional(),
    vimeoUrl: z.string().url(s.validationVimeoUrl),
    startTime: z.string().min(1, s.validationStartTime),
    coverImage: z.string().optional(),
  });
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { lang, setLang } = useAdminLang();
  const s = t[lang];

  const webinarSchema = createWebinarSchema(s);

  const { data: webinars, isLoading } = useQuery<Webinar[]>({
    queryKey: ["/api/webinars"],
  });

  const { data: stats } = useQuery<WebinarStats>({
    queryKey: ["/api/webinars", "stats", "summary"],
    refetchInterval: 15000,
  });

  const form = useForm<WebinarForm>({
    resolver: zodResolver(webinarSchema),
    defaultValues: {
      title: "",
      description: "",
      vimeoUrl: "",
      startTime: "",
      coverImage: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WebinarForm) => {
      return apiRequest("POST", "/api/webinars", {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: s.toastCreateSuccess,
        description: s.toastCreateSuccessDesc,
      });
    },
    onError: (error: any) => {
      toast({
        title: s.toastCreateFail,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (webinarId: string) => {
      return apiRequest("POST", `/api/webinars/${webinarId}/duplicate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: s.toastDuplicateSuccess, description: s.toastDuplicateSuccessDesc });
    },
    onError: (error: any) => {
      toast({ title: s.toastDuplicateFail, description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (webinarId: string) => {
      return apiRequest("DELETE", `/api/webinars/${webinarId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: s.toastDeleteSuccess, description: s.toastDeleteSuccessDesc });
    },
    onError: (error: any) => {
      toast({ title: s.toastDeleteFail, description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout", {});
      setLocation("/admin");
    } catch (error) {
      setLocation("/admin");
    }
  };

  const getStatusBadge = (webinar: Webinar) => {
    const now = new Date();
    const start = new Date(webinar.startTime);
    const duration = webinar.videoDuration || 3600;
    const end = new Date(start.getTime() + duration * 1000);

    if (now >= start && now <= end) {
      return <Badge className="bg-red-500 text-white" data-testid={`badge-status-${webinar.id}`}>{s.statusLive}</Badge>;
    } else if (now > end) {
      return <Badge variant="secondary" data-testid={`badge-status-${webinar.id}`}>{s.statusEnded}</Badge>;
    } else {
      return <Badge variant="outline" data-testid={`badge-status-${webinar.id}`}>{s.statusUpcoming}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString(lang, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const sec = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
  };

  const handleShare = (webinar: Webinar) => {
    const baseUrl = window.location.origin;
    const registerUrl = `${baseUrl}/register/${webinar.id}`;
    navigator.clipboard.writeText(registerUrl);
    toast({ title: s.toastLinkCopied, description: s.toastLinkCopiedDesc });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="ICTA" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold tracking-tight">ICTA-WEBINAR</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "zh-TW" ? "zh-CN" : "zh-TW")}
              data-testid="button-admin-lang-toggle"
            >
              <Languages className="h-4 w-4 mr-1" />
              {lang === "zh-TW" ? "繁" : "简"}
            </Button>
            <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              {s.logout}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">{s.management}</h2>
            <p className="text-muted-foreground">{s.managementDesc}</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-webinar">
                <Plus className="h-4 w-4 mr-2" />
                {s.createWebinar}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{s.createNewWebinar}</DialogTitle>
                <DialogDescription>{s.createNewWebinarDesc}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{s.labelTitle}</FormLabel>
                        <FormControl>
                          <Input placeholder={s.placeholderTitle} {...field} data-testid="input-webinar-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{s.labelDescription}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={s.placeholderDescription} {...field} data-testid="input-webinar-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vimeoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{s.labelVimeoUrl}</FormLabel>
                        <FormControl>
                          <Input placeholder="https://vimeo.com/123456789" {...field} data-testid="input-vimeo-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{s.labelStartTime}</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coverImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{s.labelCoverImage}</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} data-testid="input-cover-image" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      {s.cancel}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-webinar">
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {s.creating}
                        </>
                      ) : (
                        s.create
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : webinars && webinars.length > 0 ? (
          <div className="space-y-4">
            {webinars.map((webinar) => {
              const webinarStats = stats?.[webinar.id];
              const onlineCount = webinarStats?.onlineCount || 0;
              return (
                <Card key={webinar.id} data-testid={`card-webinar-${webinar.id}`}>
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div 
                        className="w-full md:w-48 lg:w-56 h-32 md:h-auto flex-shrink-0 bg-muted relative cursor-pointer rounded-t-lg md:rounded-t-none md:rounded-l-lg overflow-hidden"
                        onClick={() => setLocation(`/admin/webinar/${webinar.id}`)}
                        data-testid={`link-webinar-detail-${webinar.id}`}
                      >
                        {webinar.coverImage ? (
                          <img 
                            src={webinar.coverImage} 
                            alt={webinar.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <Video className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                        )}
                        {onlineCount > 0 && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full" data-testid={`badge-online-${webinar.id}`}>
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            {s.onlineCount(onlineCount)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h3 
                              className="font-semibold text-base truncate cursor-pointer hover:text-primary transition-colors"
                              onClick={() => setLocation(`/admin/webinar/${webinar.id}`)}
                              data-testid={`text-webinar-title-${webinar.id}`}
                            >
                              {webinar.title}
                            </h3>
                            {getStatusBadge(webinar)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(webinar.startTime)}
                          </span>
                          {webinar.videoDuration && webinar.videoDuration > 0 && (
                            <span>{formatDuration(webinar.videoDuration)}</span>
                          )}
                        </div>

                        {webinar.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{webinar.description}</p>
                        )}

                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="text-center" data-testid={`stat-registered-${webinar.id}`}>
                            <div className="text-xl font-bold">{webinarStats?.registered ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{s.statRegistered}</div>
                          </div>
                          <div className="text-center" data-testid={`stat-attended-${webinar.id}`}>
                            <div className="text-xl font-bold">{webinarStats?.attended ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{s.statAttended}</div>
                          </div>
                          <div className="text-center" data-testid={`stat-engaged-${webinar.id}`}>
                            <div className="text-xl font-bold">{webinarStats?.engaged !== undefined ? `${webinarStats.engaged}%` : "—"}</div>
                            <div className="text-xs text-muted-foreground">{s.statEngagement}</div>
                          </div>
                          {onlineCount > 0 && (
                            <div className="text-center">
                              <div className="text-xl font-bold text-red-500">{onlineCount}</div>
                              <div className="text-xs text-muted-foreground">{s.statOnline}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex md:flex-col items-center md:items-stretch gap-1 p-3 md:border-l border-t md:border-t-0 flex-wrap justify-center md:w-36 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start gap-2 text-xs w-full"
                          onClick={() => setLocation(`/admin/webinar/${webinar.id}`)}
                          data-testid={`button-edit-${webinar.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">{s.actionEdit}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start gap-2 text-xs w-full"
                          onClick={() => setLocation(`/admin/webinar/${webinar.id}/control`)}
                          data-testid={`button-control-${webinar.id}`}
                        >
                          <Radio className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">{s.actionControl}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start gap-2 text-xs w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(webinar);
                          }}
                          data-testid={`button-share-${webinar.id}`}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">{s.actionShare}</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start gap-2 text-xs w-full"
                              data-testid={`button-more-${webinar.id}`}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                              <span className="hidden md:inline">{s.actionMore}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/register/${webinar.id}`, "_blank");
                              }}
                              data-testid={`button-view-registration-${webinar.id}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-2" />
                              {s.actionPreview}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateMutation.mutate(webinar.id);
                              }}
                              disabled={duplicateMutation.isPending}
                              data-testid={`button-duplicate-${webinar.id}`}
                            >
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              {s.actionDuplicate}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                  data-testid={`button-delete-${webinar.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  {s.actionDelete}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{s.deleteConfirmTitle}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {s.deleteConfirmDesc(webinar.title)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="button-cancel-delete">{s.deleteCancel}</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(webinar.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid="button-confirm-delete"
                                  >
                                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                    {s.deleteConfirm}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">{s.emptyTitle}</h3>
              <p className="text-muted-foreground mb-4">{s.emptyDesc}</p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-webinar">
                <Plus className="h-4 w-4 mr-2" />
                {s.createWebinar}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
