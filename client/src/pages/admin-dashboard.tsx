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
import { 
  Plus, Video, Calendar, 
  ExternalLink, Loader2, LogOut, Radio, Copy,
  BarChart3, Users, Pencil, Share2, MessageCircle,
  Eye, Code, Trash2, MoreVertical
} from "lucide-react";
import type { Webinar } from "@shared/schema";

type WebinarStats = Record<string, {
  registered: number;
  attended: number;
  engaged: number;
  onlineCount: number;
}>;

const webinarSchema = z.object({
  title: z.string().min(1, "請輸入標題"),
  description: z.string().optional(),
  vimeoUrl: z.string().url("請輸入有效的 Vimeo 網址"),
  startTime: z.string().min(1, "請選擇開始時間"),
  coverImage: z.string().optional(),
});

type WebinarForm = z.infer<typeof webinarSchema>;

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
        title: "建立成功",
        description: "直播間已建立",
      });
    },
    onError: (error: any) => {
      toast({
        title: "建立失敗",
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
      toast({ title: "複製成功", description: "直播間已複製" });
    },
    onError: (error: any) => {
      toast({ title: "複製失敗", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (webinarId: string) => {
      return apiRequest("DELETE", `/api/webinars/${webinarId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars"] });
      toast({ title: "已刪除", description: "直播間已成功刪除" });
    },
    onError: (error: any) => {
      toast({ title: "刪除失敗", description: error.message, variant: "destructive" });
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
      return <Badge className="bg-red-500 text-white" data-testid={`badge-status-${webinar.id}`}>直播中</Badge>;
    } else if (now > end) {
      return <Badge variant="secondary" data-testid={`badge-status-${webinar.id}`}>已結束</Badge>;
    } else {
      return <Badge variant="outline" data-testid={`badge-status-${webinar.id}`}>即將開始</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("zh-TW", {
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
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleShare = (webinar: Webinar) => {
    const baseUrl = window.location.origin;
    const registerUrl = `${baseUrl}/register/${webinar.id}`;
    navigator.clipboard.writeText(registerUrl);
    toast({ title: "已複製連結", description: "報名頁連結已複製到剪貼簿" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">LiveCast 管理後台</h1>
          </div>
          <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />
            登出
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">直播間管理</h2>
            <p className="text-muted-foreground">建立和管理您的線上研討會</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-webinar">
                <Plus className="h-4 w-4 mr-2" />
                建立直播間
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>建立新直播間</DialogTitle>
                <DialogDescription>設定直播間基本資訊</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>直播標題</FormLabel>
                        <FormControl>
                          <Input placeholder="輸入直播標題" {...field} data-testid="input-webinar-title" />
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
                        <FormLabel>描述（選填）</FormLabel>
                        <FormControl>
                          <Textarea placeholder="直播簡介" {...field} data-testid="input-webinar-description" />
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
                        <FormLabel>Vimeo 影片網址</FormLabel>
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
                        <FormLabel>開始時間</FormLabel>
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
                        <FormLabel>封面圖片網址（選填）</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} data-testid="input-cover-image" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-webinar">
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          建立中...
                        </>
                      ) : (
                        "建立"
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
                      {/* Cover Image / Thumbnail */}
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
                            {onlineCount} 人在線
                          </div>
                        )}
                      </div>

                      {/* Middle: Info + Stats */}
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

                        {/* Stats Row */}
                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="text-center" data-testid={`stat-registered-${webinar.id}`}>
                            <div className="text-xl font-bold">{webinarStats?.registered ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">報名數</div>
                          </div>
                          <div className="text-center" data-testid={`stat-attended-${webinar.id}`}>
                            <div className="text-xl font-bold">{webinarStats?.attended ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">出席數</div>
                          </div>
                          <div className="text-center" data-testid={`stat-engaged-${webinar.id}`}>
                            <div className="text-xl font-bold">{webinarStats?.engaged !== undefined ? `${webinarStats.engaged}%` : "—"}</div>
                            <div className="text-xs text-muted-foreground">互動率</div>
                          </div>
                          {onlineCount > 0 && (
                            <div className="text-center">
                              <div className="text-xl font-bold text-red-500">{onlineCount}</div>
                              <div className="text-xs text-muted-foreground">在線觀眾</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Quick Actions - 4 buttons */}
                      <div className="flex md:flex-col items-center md:items-stretch gap-1 p-3 md:border-l border-t md:border-t-0 flex-wrap justify-center md:w-36 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start gap-2 text-xs w-full"
                          onClick={() => setLocation(`/admin/webinar/${webinar.id}`)}
                          data-testid={`button-edit-${webinar.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">編輯管理</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start gap-2 text-xs w-full"
                          onClick={() => setLocation(`/admin/webinar/${webinar.id}/control`)}
                          data-testid={`button-control-${webinar.id}`}
                        >
                          <Radio className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">控制台</span>
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
                          <span className="hidden md:inline">分享連結</span>
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
                              <span className="hidden md:inline">更多</span>
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
                              報名頁預覽
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
                              複製直播間
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
                                  刪除
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>確定要刪除此直播間？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    將會刪除「{webinar.title}」及其所有相關資料（報名記錄、聊天訊息、分析數據等），此操作無法復原。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid="button-cancel-delete">取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(webinar.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid="button-confirm-delete"
                                  >
                                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                    確定刪除
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
              <h3 className="text-lg font-medium mb-2">尚無直播間</h3>
              <p className="text-muted-foreground mb-4">建立您的第一個線上研討會</p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-webinar">
                <Plus className="h-4 w-4 mr-2" />
                建立直播間
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
