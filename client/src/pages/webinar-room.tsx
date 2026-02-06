import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Heart, Send, Users, Loader2, ExternalLink, X, Info, HelpCircle, MessageSquare, Star, Clock } from "lucide-react";
import type { Webinar, ChatMessage, CtaButton, Poll, ScheduledMessage, Tip, FakeUser, Question, FeedbackSurvey } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  data: any;
}

export default function WebinarRoom() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const [nickname, setNickname] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  
  const [sessionId] = useState(() => {
    const storageKey = `webinar_session_${id}`;
    let storedSession = localStorage.getItem(storageKey);
    if (!storedSession) {
      storedSession = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(storageKey, storedSession);
    }
    return storedSession;
  });
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [likeCount, setLikeCount] = useState(0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  
  const [visibleCtas, setVisibleCtas] = useState<CtaButton[]>([]);
  
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [pollResults, setPollResults] = useState<Record<number, number>>({});
  
  const wsRef = useRef<WebSocket | null>(null);
  const [viewerCount, setViewerCount] = useState(1);
  
  const shownMessagesRef = useRef<Set<string>>(new Set());
  
  const [visibleTip, setVisibleTip] = useState<Tip | null>(null);
  const shownTipsRef = useRef<Set<string>>(new Set());

  const [activePanel, setActivePanel] = useState<string>("chat");
  
  const [questionInput, setQuestionInput] = useState("");
  
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyResponses, setSurveyResponses] = useState<Record<string, any>>({});
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  const [waitingForStart, setWaitingForStart] = useState(false);
  const [countdown, setCountdown] = useState("");

  const progressSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: webinar, isLoading } = useQuery<Webinar>({
    queryKey: ["/api/webinars", id],
    enabled: !!id,
  });

  const { data: ctas } = useQuery<CtaButton[]>({
    queryKey: ["/api/webinars", id, "ctas"],
    enabled: !!id && isJoined,
  });
  
  const { data: scheduledMessages } = useQuery<ScheduledMessage[]>({
    queryKey: ["/api/webinars", id, "scheduled-messages"],
    enabled: !!id && isJoined,
  });
  
  const { data: fakeUsers } = useQuery<FakeUser[]>({
    queryKey: ["/api/webinars", id, "fake-users"],
    enabled: !!id && isJoined,
  });
  
  const { data: tips } = useQuery<Tip[]>({
    queryKey: ["/api/webinars", id, "tips"],
    enabled: !!id && isJoined,
  });

  const { data: presetQuestions } = useQuery<Question[]>({
    queryKey: ["/api/webinars", id, "questions", "preset"],
    enabled: !!id && isJoined,
  });

  const { data: feedbackSurvey } = useQuery<FeedbackSurvey>({
    queryKey: ["/api/webinars", id, "feedback-survey"],
    enabled: !!id && isJoined,
  });

  const { data: savedProgress } = useQuery<{ lastPosition: number; totalWatched: number }>({
    queryKey: ["/api/webinars", id, "progress", sessionId],
    enabled: !!id && isJoined,
  });

  const submitQuestionMutation = useMutation({
    mutationFn: async (data: { question: string; askerName: string }) => {
      return apiRequest("POST", `/api/webinars/${id}/questions`, data);
    },
    onSuccess: () => {
      setQuestionInput("");
      toast({ title: "問題已送出" });
    },
  });

  const submitSurveyMutation = useMutation({
    mutationFn: async (data: { surveyId: string; responses: Record<string, any> }) => {
      return apiRequest("POST", "/api/feedback-responses", data);
    },
    onSuccess: () => {
      setSurveySubmitted(true);
      toast({ title: "感謝您的回饋！" });
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (data: { viewerSessionId: string; lastPosition: number; totalWatched: number }) => {
      return apiRequest("POST", `/api/webinars/${id}/progress`, data);
    },
  });

  const isOnDemand = webinar?.scheduleMode && typeof webinar.scheduleMode === 'object' && (webinar.scheduleMode as any).onDemand;
  const isJustInTime = webinar?.scheduleMode && typeof webinar.scheduleMode === 'object' && (webinar.scheduleMode as any).justInTime;

  useEffect(() => {
    if (!webinar || !isJoined || isOnDemand) return;

    const checkTime = () => {
      const now = new Date();
      const start = new Date(webinar.startTime);
      const diff = start.getTime() - now.getTime();
      
      if (diff <= 0) {
        setWaitingForStart(false);
        setCountdown("");
        return;
      }
      
      setWaitingForStart(true);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setCountdown(`${days} 天 ${hours} 時 ${minutes} 分 ${seconds} 秒`);
      } else if (hours > 0) {
        setCountdown(`${hours} 時 ${minutes} 分 ${seconds} 秒`);
      } else {
        setCountdown(`${minutes} 分 ${seconds} 秒`);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [webinar, isJoined, isOnDemand]);

  useEffect(() => {
    if (!webinar?.vimeoUrl || !isJoined || waitingForStart) return;

    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (iframeRef.current && (window as any).Vimeo) {
        const player = new (window as any).Vimeo.Player(iframeRef.current);
        playerRef.current = player;

        if (savedProgress && savedProgress.lastPosition > 0) {
          player.setCurrentTime(savedProgress.lastPosition).catch(() => {});
        }

        player.on("timeupdate", (data: { seconds: number }) => {
          setCurrentTime(Math.floor(data.seconds));
        });

        player.on("play", () => setIsPlaying(true));
        player.on("pause", () => setIsPlaying(false));
        player.on("ended", () => {
          setVideoEnded(true);
          setIsPlaying(false);
          if (feedbackSurvey && feedbackSurvey.isActive && !surveySubmitted) {
            setShowSurvey(true);
          }
        });
      }
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [webinar?.vimeoUrl, isJoined, waitingForStart, savedProgress]);

  useEffect(() => {
    if (!isJoined || !isPlaying) return;

    progressSaveRef.current = setInterval(() => {
      saveProgressMutation.mutate({
        viewerSessionId: sessionId,
        lastPosition: currentTime,
        totalWatched: currentTime,
      });
    }, 30000);

    return () => {
      if (progressSaveRef.current) clearInterval(progressSaveRef.current);
    };
  }, [isJoined, isPlaying, currentTime, sessionId]);

  useEffect(() => {
    if (!ctas) return;
    const visible = ctas.filter((cta) => {
      const isAfterStart = currentTime >= cta.startTime;
      const isBeforeEnd = !cta.endTime || currentTime <= cta.endTime;
      return isAfterStart && isBeforeEnd;
    });
    setVisibleCtas(visible);
  }, [currentTime, ctas]);
  
  useEffect(() => {
    if (!scheduledMessages || !fakeUsers || !isPlaying) return;
    
    scheduledMessages.forEach((msg) => {
      const msgKey = `msg_${msg.id}`;
      if (currentTime >= msg.triggerTime && !shownMessagesRef.current.has(msgKey)) {
        shownMessagesRef.current.add(msgKey);
        const fakeUser = fakeUsers.find(u => u.id === msg.fakeUserId);
        const senderName = fakeUser?.name || "觀眾";
        const chatMsg: ChatMessage = {
          id: `scheduled_${msg.id}_${Date.now()}`,
          webinarId: id!,
          sessionId: null,
          senderName,
          message: msg.message,
          senderType: "scheduled",
          sentAt: new Date(),
          isPrivate: false
        };
        setMessages((prev) => [...prev, chatMsg]);
      }
    });
  }, [currentTime, scheduledMessages, fakeUsers, isPlaying, id]);
  
  useEffect(() => {
    if (!tips || !isPlaying) return;
    
    tips.forEach((tip) => {
      const tipKey = `tip_${tip.id}`;
      if (currentTime >= tip.triggerTime && !shownTipsRef.current.has(tipKey)) {
        shownTipsRef.current.add(tipKey);
        setVisibleTip(tip);
        setTimeout(() => {
          setVisibleTip((current) => current?.id === tip.id ? null : current);
        }, (tip.duration || 10) * 1000);
      }
    });
  }, [currentTime, tips, isPlaying]);

  useEffect(() => {
    if (!isJoined || !id || !sessionId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        data: { webinarId: id, sessionId, nickname }
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
        case "sessionConfirmed":
          break;
      }
    };

    ws.onclose = () => {};

    return () => {
      if (currentTime > 0) {
        saveProgressMutation.mutate({
          viewerSessionId: sessionId,
          lastPosition: currentTime,
          totalWatched: currentTime,
        });
      }
      ws.close();
    };
  }, [isJoined, id, nickname, sessionId]);

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
        sessionId,
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
      data: { webinarId: id, sessionId }
    }));
  };

  const submitVote = () => {
    if (selectedOption === null || !wsRef.current || !activePoll) return;
    wsRef.current.send(JSON.stringify({
      type: "vote",
      data: {
        pollId: activePoll.id,
        optionIndex: selectedOption,
        sessionId
      }
    }));
    setHasVoted(true);
  };

  const submitQuestion = () => {
    if (!questionInput.trim()) return;
    submitQuestionMutation.mutate({
      question: questionInput.trim(),
      askerName: nickname,
    });
  };

  const handleSurveySubmit = () => {
    if (!feedbackSurvey) return;
    submitSurveyMutation.mutate({
      surveyId: feedbackSurvey.id,
      responses: surveyResponses,
    });
  };

  const extractVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : url;
  };

  const formatStartTime = (date: Date | string) => {
    return new Date(date).toLocaleString("zh-TW", {
      month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
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

  const brandSettings = webinar.brandSettings as { logo?: string; primaryColor?: string; secondaryColor?: string; backgroundColor?: string } | null;
  const brandGradient = brandSettings?.primaryColor && brandSettings?.secondaryColor
    ? { background: `linear-gradient(135deg, ${brandSettings.primaryColor} 0%, ${brandSettings.secondaryColor} 100%)` }
    : undefined;

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={brandGradient || { background: "linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #be185d 100%)" }}>
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            {brandSettings?.logo && (
              <div className="flex justify-center mb-4">
                <img src={brandSettings.logo} alt="Logo" className="max-h-12 object-contain" />
              </div>
            )}
            <h2 className="text-xl font-bold text-center mb-2">{webinar.title}</h2>
            {!isOnDemand && (
              <p className="text-center text-sm text-muted-foreground mb-1">
                {formatStartTime(webinar.startTime)}
              </p>
            )}
            {isOnDemand && (
              <p className="text-center text-sm text-muted-foreground mb-1">
                隨時可觀看
              </p>
            )}
            {isJustInTime && (
              <p className="text-center text-sm text-muted-foreground mb-1">
                進入後即刻開始
              </p>
            )}
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

  if (waitingForStart) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={brandGradient || { background: "linear-gradient(135deg, #4338ca 0%, #7e22ce 50%, #be185d 100%)" }}>
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center">
            {brandSettings?.logo && (
              <div className="flex justify-center mb-4">
                <img src={brandSettings.logo} alt="Logo" className="max-h-12 object-contain" />
              </div>
            )}
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">{webinar.title}</h2>
            <p className="text-muted-foreground mb-6">直播即將開始，請稍候</p>
            <div className="bg-muted rounded-lg p-6 mb-4">
              <p className="text-sm text-muted-foreground mb-2">倒數計時</p>
              <p className="text-3xl font-bold font-mono" data-testid="text-countdown">{countdown}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              開始時間：{formatStartTime(webinar.startTime)}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const surveyQuestions = feedbackSurvey?.questions as { id: string; type: string; question: string; options?: string[]; required: boolean }[] || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row h-screen">
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

            <div className="absolute top-4 left-4 z-10">
              <Badge variant="secondary" className="bg-black/50 text-white border-0">
                <Users className="w-3 h-3 mr-1" />
                {viewerCount} 人觀看
              </Badge>
            </div>
            
            {visibleTip && (
              <div className="absolute top-4 right-4 z-20 max-w-xs animate-in slide-in-from-right duration-300" data-testid="tip-card">
                <Card className="bg-white/95 dark:bg-card/95 backdrop-blur shadow-lg">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{visibleTip.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{visibleTip.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setVisibleTip(null)}
                        data-testid="button-close-tip"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {videoEnded && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                <div className="text-center text-white">
                  <h3 className="text-xl font-bold mb-2">直播已結束</h3>
                  <p className="text-white/70 mb-4">感謝您的觀看</p>
                  {feedbackSurvey && feedbackSurvey.isActive && !surveySubmitted && (
                    <Button onClick={() => setShowSurvey(true)} variant="secondary" data-testid="button-open-survey">
                      <Star className="w-4 h-4 mr-2" />
                      填寫回饋問卷
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-96 flex flex-col border-l bg-card h-[50vh] lg:h-full">
          <Tabs value={activePanel} onValueChange={setActivePanel} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b h-auto p-0">
              <TabsTrigger value="chat" className="flex-1 rounded-none py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-chat">
                <MessageSquare className="w-4 h-4 mr-1" />
                聊天
              </TabsTrigger>
              <TabsTrigger value="qa" className="flex-1 rounded-none py-3 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-qa">
                <HelpCircle className="w-4 h-4 mr-1" />
                問答
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">即時聊天</h3>
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

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {messages.map((msg, index) => (
                    <div key={msg.id || index} className="flex gap-2" data-testid={`chat-message-${index}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-xs font-medium ${
                            msg.senderType === "host" 
                              ? "text-red-500" 
                              : msg.senderType === "scheduled" 
                              ? "text-blue-500" 
                              : "text-foreground"
                          }`}>
                            {msg.senderName}
                            {msg.senderType === "host" && (
                              <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">主辦</Badge>
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

              <div className="p-3 border-t">
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
            </TabsContent>

            <TabsContent value="qa" className="flex-1 flex flex-col m-0 overflow-hidden">
              <div className="p-3 border-b">
                <h3 className="font-semibold text-sm">問答 Q&A</h3>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {presetQuestions && presetQuestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">常見問題</p>
                      {presetQuestions.map((q) => (
                        <Card key={q.id} className="p-3" data-testid={`qa-preset-${q.id}`}>
                          <p className="text-sm font-medium">{q.question}</p>
                          {q.answer && (
                            <p className="text-sm text-muted-foreground mt-1">{q.answer}</p>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-3 border-t space-y-2">
                <p className="text-xs text-muted-foreground">有問題想問嗎？</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="輸入您的問題..."
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitQuestion()}
                    data-testid="input-question"
                  />
                  <Button
                    onClick={submitQuestion}
                    size="icon"
                    disabled={submitQuestionMutation.isPending}
                    data-testid="button-submit-question"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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

      <Dialog open={showSurvey && !surveySubmitted} onOpenChange={setShowSurvey}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{feedbackSurvey?.title || "回饋問卷"}</DialogTitle>
            <DialogDescription>請花一點時間分享您的想法</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {surveyQuestions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-sm font-medium">
                  {q.question}
                  {q.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                
                {q.type === "rating" && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        variant="ghost"
                        size="icon"
                        onClick={() => setSurveyResponses(prev => ({ ...prev, [q.id]: star }))}
                        data-testid={`survey-rating-${q.id}-${star}`}
                      >
                        <Star className={`w-6 h-6 ${(surveyResponses[q.id] || 0) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      </Button>
                    ))}
                  </div>
                )}
                
                {q.type === "text" && (
                  <Textarea
                    placeholder="請輸入您的回答..."
                    value={surveyResponses[q.id] || ""}
                    onChange={(e) => setSurveyResponses(prev => ({ ...prev, [q.id]: e.target.value }))}
                    data-testid={`survey-text-${q.id}`}
                  />
                )}
                
                {q.type === "multiChoice" && q.options && (
                  <RadioGroup
                    value={surveyResponses[q.id] || ""}
                    onValueChange={(v) => setSurveyResponses(prev => ({ ...prev, [q.id]: v }))}
                  >
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`survey-${q.id}-${i}`} />
                        <Label htmlFor={`survey-${q.id}-${i}`}>{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSurvey(false)} className="flex-1">
              稍後再說
            </Button>
            <Button
              onClick={handleSurveySubmit}
              disabled={submitSurveyMutation.isPending}
              className="flex-1"
              data-testid="button-submit-survey"
            >
              {submitSurveyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              提交回饋
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
