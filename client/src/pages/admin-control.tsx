import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Send, Users, Heart, MessageSquare, 
  Loader2, Radio, BarChart, Play, Pause
} from "lucide-react";
import type { Webinar, ChatMessage, Poll } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  data: any;
}

export default function AdminControl() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Host chat state
  const [hostName, setHostName] = useState("主辦人");
  const [messageInput, setMessageInput] = useState("");
  
  // Room state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  // WebSocket
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

  // WebSocket connection
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
        case "chat":
          setMessages((prev) => [...prev, msg.data]);
          break;
        case "like":
          setLikeCount(msg.data.count);
          break;
        case "viewerCount":
          setViewerCount(msg.data.count);
          break;
        case "scheduledMessage":
          setMessages((prev) => [...prev, msg.data]);
          break;
        case "history":
          setMessages(msg.data.messages || []);
          setLikeCount(msg.data.likeCount || 0);
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [id]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
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
  };

  const triggerPoll = (poll: Poll) => {
    if (!wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: "triggerPoll",
      data: {
        webinarId: id,
        pollId: poll.id
      }
    }));
    
    toast({ title: "投票已發送" });
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
        <p>找不到此直播間</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/webinar/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{webinar.title}</h1>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "已連線" : "連線中..."}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">即時控制台</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{viewerCount} 人觀看</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>{likeCount}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat Panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                即時聊天
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Messages */}
              <ScrollArea className="h-[400px] mb-4 pr-4">
                <div className="space-y-3">
                  {messages.map((msg, index) => (
                    <div key={msg.id || index} className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            msg.senderType === "host" 
                              ? "text-red-500" 
                              : msg.senderType === "bot" 
                              ? "text-blue-500" 
                              : "text-foreground"
                          }`}>
                            {msg.senderName}
                            {msg.senderType === "host" && (
                              <Badge variant="destructive" className="ml-1 text-xs">主辦</Badge>
                            )}
                            {msg.senderType === "bot" && (
                              <Badge variant="secondary" className="ml-1 text-xs">假人</Badge>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Host Name Input */}
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="顯示名稱"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="max-w-[150px]"
                  data-testid="input-host-name"
                />
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="輸入訊息..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  data-testid="input-host-message"
                />
                <Button onClick={sendMessage} size="icon" data-testid="button-send-host-message">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Control Panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4" />
                控制面板
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Quick Actions */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">快速投票</h4>
                  {polls && polls.length > 0 ? (
                    <div className="space-y-2">
                      {polls.map((poll) => (
                        <div key={poll.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{poll.question}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(poll.options as string[]).map((opt, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{opt}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => triggerPoll(poll)}
                            data-testid={`button-trigger-poll-${poll.id}`}
                          >
                            <BarChart className="h-4 w-4 mr-1" />
                            發送
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">尚無投票設定</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">直播狀態</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold">{viewerCount}</div>
                      <div className="text-xs text-muted-foreground">觀看人數</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold">{likeCount}</div>
                      <div className="text-xs text-muted-foreground">按讚數</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold">{messages.length}</div>
                      <div className="text-xs text-muted-foreground">訊息數</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold">{polls?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">投票數</div>
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
