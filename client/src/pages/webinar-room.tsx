import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Heart, Send, Users, Loader2, ExternalLink } from "lucide-react";
import type { Webinar, ChatMessage, CtaButton, Poll } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  data: any;
}

export default function WebinarRoom() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // User state
  const [nickname, setNickname] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  
  // Video state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Like state
  const [likeCount, setLikeCount] = useState(0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  
  // CTA state
  const [visibleCtas, setVisibleCtas] = useState<CtaButton[]>([]);
  
  // Poll state
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [pollResults, setPollResults] = useState<Record<number, number>>({});
  
  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const [viewerCount, setViewerCount] = useState(1);

  const { data: webinar, isLoading } = useQuery<Webinar>({
    queryKey: ["/api/webinars", id],
    enabled: !!id,
  });

  const { data: ctas } = useQuery<CtaButton[]>({
    queryKey: ["/api/webinars", id, "ctas"],
    enabled: !!id && isJoined,
  });

  // Initialize Vimeo player
  useEffect(() => {
    if (!webinar?.vimeoUrl || !isJoined) return;

    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (iframeRef.current && (window as any).Vimeo) {
        const player = new (window as any).Vimeo.Player(iframeRef.current);
        playerRef.current = player;

        player.on("timeupdate", (data: { seconds: number }) => {
          setCurrentTime(Math.floor(data.seconds));
        });

        player.on("play", () => setIsPlaying(true));
        player.on("pause", () => setIsPlaying(false));
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [webinar?.vimeoUrl, isJoined]);

  // Update visible CTAs based on current time
  useEffect(() => {
    if (!ctas) return;
    
    const visible = ctas.filter((cta) => {
      const isAfterStart = currentTime >= cta.startTime;
      const isBeforeEnd = !cta.endTime || currentTime <= cta.endTime;
      return isAfterStart && isBeforeEnd;
    });
    
    setVisibleCtas(visible);
  }, [currentTime, ctas]);

  // WebSocket connection
  useEffect(() => {
    if (!isJoined || !id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        data: { webinarId: id, nickname }
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
          setShowLikeAnimation(true);
          setTimeout(() => setShowLikeAnimation(false), 300);
          break;
        case "viewerCount":
          setViewerCount(msg.data.count);
          break;
        case "poll":
          setActivePoll(msg.data);
          setHasVoted(false);
          setSelectedOption(null);
          setPollResults({});
          break;
        case "pollResults":
          setPollResults(msg.data.results);
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
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [isJoined, id, nickname]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = () => {
    if (nicknameInput.trim().length < 2) {
      toast({
        title: "請輸入暱稱",
        description: "暱稱至少需要 2 個字",
        variant: "destructive",
      });
      return;
    }
    setNickname(nicknameInput.trim());
    setIsJoined(true);
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: "chat",
      data: {
        webinarId: id,
        senderName: nickname,
        message: messageInput.trim(),
        senderType: "viewer"
      }
    }));
    
    setMessageInput("");
  };

  const sendLike = () => {
    if (!wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: "like",
      data: { webinarId: id }
    }));
  };

  const submitVote = () => {
    if (selectedOption === null || !wsRef.current || !activePoll) return;
    
    wsRef.current.send(JSON.stringify({
      type: "vote",
      data: {
        pollId: activePoll.id,
        optionIndex: selectedOption
      }
    }));
    
    setHasVoted(true);
  };

  const extractVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : url;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">找不到此直播間</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join screen
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold text-center mb-2">{webinar.title}</h2>
            <p className="text-center text-muted-foreground mb-6">請輸入您的暱稱加入直播</p>
            <div className="space-y-4">
              <Input
                placeholder="輸入暱稱"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                data-testid="input-nickname"
              />
              <Button onClick={handleJoin} className="w-full" data-testid="button-join">
                進入直播間
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile: Stack layout, Desktop: Side by side */}
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Video Section */}
        <div className="flex-1 relative bg-black">
          <div className="relative w-full h-full min-h-[300px] lg:min-h-0">
            <iframe
              ref={iframeRef}
              src={`https://player.vimeo.com/video/${extractVimeoId(webinar.vimeoUrl)}?autoplay=0&title=0&byline=0&portrait=0`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              data-testid="video-player"
            />
            
            {/* CTA Overlays */}
            {visibleCtas.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 z-10">
                {visibleCtas.map((cta) => (
                  <Button
                    key={cta.id}
                    variant={cta.style === "primary" ? "default" : cta.style === "danger" ? "destructive" : "secondary"}
                    className="w-full sm:w-auto animate-pulse"
                    onClick={() => window.open(cta.url, "_blank")}
                    data-testid={`cta-button-${cta.id}`}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {cta.text}
                  </Button>
                ))}
              </div>
            )}

            {/* Viewer count */}
            <div className="absolute top-4 left-4 z-10">
              <Badge variant="secondary" className="bg-black/50 text-white border-0">
                <Users className="w-3 h-3 mr-1" />
                {viewerCount} 人觀看
              </Badge>
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-full lg:w-96 flex flex-col border-l bg-card h-[50vh] lg:h-full">
          {/* Chat Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">即時聊天</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={sendLike}
                className={`gap-1 ${showLikeAnimation ? "scale-125" : ""} transition-transform`}
                data-testid="button-like"
              >
                <Heart className={`w-4 h-4 ${likeCount > 0 ? "fill-red-500 text-red-500" : ""}`} />
                <span>{likeCount}</span>
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
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
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="輸入訊息..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                data-testid="input-chat-message"
              />
              <Button onClick={sendMessage} size="icon" data-testid="button-send-message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Poll Dialog */}
      <Dialog open={!!activePoll && !hasVoted} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>投票</DialogTitle>
            <DialogDescription>{activePoll?.question}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup
              value={selectedOption?.toString()}
              onValueChange={(v) => setSelectedOption(parseInt(v))}
            >
              {(activePoll?.options as string[] || []).map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <Button
            onClick={submitVote}
            disabled={selectedOption === null}
            className="w-full"
            data-testid="button-submit-vote"
          >
            提交投票
          </Button>
        </DialogContent>
      </Dialog>

      {/* Poll Results Dialog */}
      <Dialog open={hasVoted && Object.keys(pollResults).length > 0} onOpenChange={() => setHasVoted(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>投票結果</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {(activePoll?.options as string[] || []).map((option, index) => {
              const votes = pollResults[index] || 0;
              const total = Object.values(pollResults).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? Math.round((votes / total) * 100) : 0;
              
              return (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{option}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Button onClick={() => setHasVoted(false)} variant="outline" className="w-full">
            關閉
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
