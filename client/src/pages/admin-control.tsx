import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdminLang, type LangAdmin } from "@/hooks/use-lang";
import { 
  ArrowLeft, Send, Users, Heart, MessageSquare, 
  Loader2, Radio, BarChart, User, MessageCircle, Clock, Languages
} from "lucide-react";
import type { Webinar, ChatMessage, Poll } from "@shared/schema";

const t: Record<LangAdmin, Record<string, string>> = {
  "zh-TW": {
    defaultHostName: "主辦人",
    toastBroadcast: "訊息已廣播給所有觀眾",
    toastReply: "已回覆此觀眾",
    toastPollSelected: "投票已發送給選定觀眾",
    toastPollAll: "投票已發送給所有觀眾",
    connected: "已連線",
    connecting: "連線中...",
    headerSubtitle: "即時控制台 - 獨立觀眾視圖",
    viewerCount: "人觀看",
    viewerList: "觀眾列表",
    allMessages: "所有訊息",
    noViewers: "尚無觀眾加入",
    messageCount: "則訊息",
    viewerFallback: "觀眾",
    conversation: "的對話",
    allChat: "所有聊天訊息",
    badgeHost: "主辦",
    badgeDummy: "假人",
    viewConversation: "查看對話",
    displayName: "顯示名稱",
    replyPlaceholder: "回覆此觀眾...",
    broadcastPlaceholder: "廣播給所有觀眾...",
    replyHintPrefix: "只有 ",
    replyHintSuffix: " 會看到此回覆",
    controlPanel: "控制面板",
    quickPoll: "快速投票",
    noPollSettings: "尚無投票設定",
    sendToViewer: "發送給此觀眾",
    sendToAll: "發送給所有人",
    liveStatus: "直播狀態",
    onlineCount: "在線人數",
    interactiveViewers: "互動觀眾",
    likeCount: "按讚數",
    messageTotal: "訊息數",
    notFound: "找不到此直播間",
  },
  "zh-CN": {
    defaultHostName: "主办人",
    toastBroadcast: "消息已广播给所有观众",
    toastReply: "已回复此观众",
    toastPollSelected: "投票已发送给选定观众",
    toastPollAll: "投票已发送给所有观众",
    connected: "已连线",
    connecting: "连线中...",
    headerSubtitle: "实时控制台 - 独立观众视图",
    viewerCount: "人观看",
    viewerList: "观众列表",
    allMessages: "所有消息",
    noViewers: "尚无观众加入",
    messageCount: "则消息",
    viewerFallback: "观众",
    conversation: "的对话",
    allChat: "所有聊天消息",
    badgeHost: "主办",
    badgeDummy: "假人",
    viewConversation: "查看对话",
    displayName: "显示名称",
    replyPlaceholder: "回复此观众...",
    broadcastPlaceholder: "广播给所有观众...",
    replyHintPrefix: "只有 ",
    replyHintSuffix: " 会看到此回复",
    controlPanel: "控制面板",
    quickPoll: "快速投票",
    noPollSettings: "尚无投票设定",
    sendToViewer: "发送给此观众",
    sendToAll: "发送给所有人",
    liveStatus: "直播状态",
    onlineCount: "在线人数",
    interactiveViewers: "互动观众",
    likeCount: "点赞数",
    messageTotal: "消息数",
    notFound: "找不到此直播间",
  },
};

interface WebSocketMessage {
  type: string;
  data: any;
}

interface ViewerSession {
  sessionId: string;
  nickname: string;
  messages: ChatMessage[];
  lastActivity: Date;
}

export default function AdminControl() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { lang, setLang } = useAdminLang();
  const s = t[lang];
  
  const [hostName, setHostName] = useState(s.defaultHostName);
  const [hostNameEdited, setHostNameEdited] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [viewerSessions, setViewerSessions] = useState<Map<string, ViewerSession>>(new Map());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    if (!hostNameEdited) setHostName(s.defaultHostName);
  }, [lang, s.defaultHostName, hostNameEdited]);

  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: webinar, isLoading } = useQuery<Webinar>({
    queryKey: ["/api/webinars", id],
    enabled: !!id,
  });

  const { data: polls } = useQuery<Poll[]>({
    queryKey: ["/api/webinars", id, "polls"],
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: "joinAsHost",
        data: { webinarId: id }
      }));
    };

    ws.onmessage = (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);
      
      switch (msg.type) {
        case "chat": {
          const chatMsg = msg.data as ChatMessage & { sessionId?: string };
          setAllMessages((prev) => {
            if (chatMsg.id && prev.some((m) => m.id === chatMsg.id)) return prev;
            return [...prev, chatMsg];
          });
          
          if (chatMsg.sessionId && (chatMsg.senderType === "viewer" || chatMsg.senderType === "host")) {
            setViewerSessions((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(chatMsg.sessionId!) || {
                sessionId: chatMsg.sessionId!,
                nickname: chatMsg.senderType === "viewer" ? chatMsg.senderName : "觀眾",
                messages: [],
                lastActivity: new Date()
              };
              if (chatMsg.id && existing.messages.some((m) => m.id === chatMsg.id)) {
                return prev;
              }
              existing.messages = [...existing.messages, chatMsg];
              existing.lastActivity = new Date();
              if (chatMsg.senderType === "viewer") {
                existing.nickname = chatMsg.senderName;
              }
              updated.set(chatMsg.sessionId!, existing);
              return updated;
            });
          }
          break;
        }
        case "like":
          setLikeCount(msg.data.count);
          break;
        case "viewerCount":
          setViewerCount(msg.data.count);
          break;
        case "history": {
          const messages = msg.data.messages || [];
          setAllMessages(messages);
          setLikeCount(msg.data.likeCount || 0);
          
          const sessionsMap = new Map<string, ViewerSession>();
          messages.forEach((m: ChatMessage & { sessionId?: string }) => {
            if (m.sessionId && m.senderType === "viewer") {
              const existing = sessionsMap.get(m.sessionId) || {
                sessionId: m.sessionId,
                nickname: m.senderName,
                messages: [],
                lastActivity: new Date(m.sentAt || Date.now())
              };
              existing.messages.push(m);
              existing.nickname = m.senderName;
              sessionsMap.set(m.sessionId, existing);
            }
          });
          setViewerSessions(sessionsMap);
          break;
        }
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages, selectedSession]);

  const sendBroadcastMessage = () => {
    if (!messageInput.trim() || !wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: "chat",
      data: {
        webinarId: id,
        senderName: hostName,
        message: messageInput.trim(),
        senderType: "host"
      }
    }));
    
    setMessageInput("");
    toast({ title: s.toastBroadcast });
  };

  const sendReplyToSession = () => {
    if (!messageInput.trim() || !wsRef.current || !selectedSession) return;
    
    wsRef.current.send(JSON.stringify({
      type: "hostReply",
      data: {
        webinarId: id,
        sessionId: selectedSession,
        senderName: hostName,
        message: messageInput.trim()
      }
    }));
    
    setMessageInput("");
    toast({ title: s.toastReply });
  };

  const triggerPoll = (poll: Poll) => {
    if (!wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: "triggerPoll",
      data: {
        webinarId: id,
        pollId: poll.id,
        sessionId: selectedSession
      }
    }));
    
    toast({ 
      title: selectedSession ? s.toastPollSelected : s.toastPollAll 
    });
  };

  const getSessionMessages = () => {
    if (!selectedSession) return [];
    const session = viewerSessions.get(selectedSession);
    return session?.messages || [];
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{s.notFound}</p>
      </div>
    );
  }

  const sessionsList = Array.from(viewerSessions.values()).sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/webinar/${id}`)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{webinar.title}</h1>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? s.connected : s.connecting}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{s.headerSubtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{viewerCount} {s.viewerCount}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>{likeCount}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "zh-TW" ? "zh-CN" : "zh-TW")}
              data-testid="button-control-lang-toggle"
            >
              <Languages className="h-4 w-4 mr-1" />
              {lang === "zh-TW" ? "繁" : "简"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                {s.viewerList} ({sessionsList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  <Button
                    variant={selectedSession === null ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedSession(null)}
                    data-testid="button-view-all"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {s.allMessages} ({allMessages.length})
                  </Button>
                  
                  {sessionsList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {s.noViewers}
                    </p>
                  ) : (
                    sessionsList.map((session) => (
                      <Button
                        key={session.sessionId}
                        variant={selectedSession === session.sessionId ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setSelectedSession(session.sessionId)}
                        data-testid={`button-session-${session.sessionId}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate">{session.nickname}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {session.messages.length} {s.messageCount}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.lastActivity)}
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {selectedSession 
                  ? `${viewerSessions.get(selectedSession)?.nickname || s.viewerFallback} ${s.conversation}`
                  : s.allChat
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] mb-4 pr-4">
                <div className="space-y-3">
                  {(selectedSession ? getSessionMessages() : allMessages).map((msg, index) => {
                    const chatMsg = msg as ChatMessage & { sessionId?: string };
                    return (
                      <div key={msg.id || index} className="flex gap-2 p-2 rounded-md hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${
                              msg.senderType === "host" 
                                ? "text-red-500" 
                                : msg.senderType === "scheduled" 
                                ? "text-blue-500" 
                                : "text-foreground"
                            }`}>
                              {msg.senderName}
                            </span>
                            {msg.senderType === "host" && (
                              <Badge variant="destructive" className="text-xs">{s.badgeHost}</Badge>
                            )}
                            {msg.senderType === "scheduled" && (
                              <Badge variant="secondary" className="text-xs">{s.badgeDummy}</Badge>
                            )}
                            {msg.senderType === "viewer" && chatMsg.sessionId && !selectedSession && (
                              <Badge 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => setSelectedSession(chatMsg.sessionId!)}
                              >
                                {s.viewConversation}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTime(msg.sentAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="space-y-3 border-t pt-3">
                <div className="flex gap-2">
                  <Input
                    placeholder={s.displayName}
                    value={hostName}
                    onChange={(e) => { setHostName(e.target.value); setHostNameEdited(true); }}
                    className="max-w-[120px]"
                    data-testid="input-host-name"
                  />
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder={selectedSession ? s.replyPlaceholder : s.broadcastPlaceholder}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        selectedSession ? sendReplyToSession() : sendBroadcastMessage();
                      }
                    }}
                    data-testid="input-host-message"
                  />
                  <Button 
                    onClick={selectedSession ? sendReplyToSession : sendBroadcastMessage} 
                    size="icon"
                    variant={selectedSession ? "default" : "secondary"}
                    data-testid="button-send-host-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {selectedSession && (
                  <p className="text-xs text-muted-foreground">
                    {s.replyHintPrefix}{viewerSessions.get(selectedSession)?.nickname}{s.replyHintSuffix}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4" />
                {s.controlPanel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{s.quickPoll}</h4>
                  {polls && polls.length > 0 ? (
                    <div className="space-y-2">
                      {polls.map((poll) => (
                        <div key={poll.id} className="p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">{poll.question}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(poll.options as string[]).map((opt, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                            ))}
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => triggerPoll(poll)}
                            data-testid={`button-trigger-poll-${poll.id}`}
                          >
                            <BarChart className="h-4 w-4 mr-1" />
                            {selectedSession ? s.sendToViewer : s.sendToAll}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{s.noPollSettings}</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">{s.liveStatus}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="p-3 text-center">
                      <div className="text-xl font-bold">{viewerCount}</div>
                      <div className="text-xs text-muted-foreground">{s.onlineCount}</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-xl font-bold">{sessionsList.length}</div>
                      <div className="text-xs text-muted-foreground">{s.interactiveViewers}</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-xl font-bold">{likeCount}</div>
                      <div className="text-xs text-muted-foreground">{s.likeCount}</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-xl font-bold">{allMessages.length}</div>
                      <div className="text-xs text-muted-foreground">{s.messageTotal}</div>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
