import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play, MessageCircle, BarChart3, Zap, Users, Clock,
  Shield, ArrowRight, CheckCircle2, MousePointerClick, Bot,
  Globe, ChevronRight, Layers, Languages
} from "lucide-react";
import { useLang, type LangFull } from "@/hooks/use-lang";

type Lang = LangFull;

const langLabels: Record<Lang, string> = {
  "zh-TW": "繁體中文",
  "zh-CN": "简体中文",
  "en": "English",
};

const langShort: Record<Lang, string> = {
  "zh-TW": "繁",
  "zh-CN": "简",
  "en": "EN",
};

const t = {
  "zh-TW": {
    navFeatures: "功能特色",
    navHow: "運作方式",
    navPricing: "方案價格",
    signIn: "登入",
    getStarted: "立即開始",
    heroBadge: "自動化研討會平台",
    heroTitle1: "將預錄影片轉化為",
    heroTitle2: "直播研討會",
    heroTitle3: "體驗",
    heroDesc: "打造彷彿直播的自動化研討會。透過模擬聊天、定時 CTA、投票互動等功能，全程自動運行，吸引觀眾參與。",
    heroStart: "免費開始",
    heroDemo: "了解運作方式",
    trustNoCc: "無需信用卡",
    trustFree: "提供免費方案",
    trustSetup: "幾分鐘內完成設定",
    previewChat: "即時聊天",
    previewMsg1: "內容真的很棒！",
    previewMsg2: "超級實用的分享",
    previewMsg3: "哪裡可以學更多？",
    previewDesc: "您的研討會在此播放 — 搭配即時聊天、CTA 按鈕和投票功能",
    featuresBadge: "功能特色",
    featuresTitle: "自動化研討會所需的一切功能",
    featuresSubtitle: "完整的工具組，幫助您建立、管理和分析能帶來轉換的研討會 — 無需真正直播。",
    feat1Title: "Vimeo 影片播放",
    feat1Desc: "使用預錄的 Vimeo 影片，打造無縫的直播研討會體驗。",
    feat2Title: "模擬即時聊天",
    feat2Desc: "預排假人角色的聊天訊息，營造真實的觀眾互動氛圍。",
    feat3Title: "定時 CTA 按鈕",
    feat3Desc: "在最佳時機顯示行動呼籲按鈕，提升轉換率。",
    feat4Title: "投票與互動",
    feat4Desc: "在特定影片時間點觸發投票、小提示卡和問答功能。",
    feat5Title: "全自動化",
    feat5Desc: "設定一次，全天候自動運行。支援循環排程。",
    feat6Title: "嵌入任何網站",
    feat6Desc: "透過簡單的嵌入代碼，將報名表和直播間嵌入任何網站。",
    howBadge: "運作方式",
    howTitle: "3 個簡單步驟即可上線",
    howSubtitle: "從設定到第一場自動化研討會，不到 10 分鐘。",
    step1Title: "上傳您的影片",
    step1Desc: "貼上 Vimeo 連結，設定研討會參數。",
    step2Title: "設定互動元素",
    step2Desc: "新增聊天角色、CTA 按鈕、投票和小提示卡，依影片時間觸發。",
    step3Title: "排程與分享",
    step3Desc: "設定循環排程或隨選播放，然後分享報名連結。",
    trustBadge: "值得信賴",
    trustTitle: "行銷人與教育者的首選",
    statWebinars: "場研討會",
    statAttendees: "位參與者",
    statUptime: "運行時間",
    statAuto: "全自動化",
    pricingBadge: "方案價格",
    pricingTitle: "簡單透明的定價",
    pricingSubtitle: "免費開始，隨業務成長擴展。無隱藏費用。",
    planStarterName: "入門版",
    planStarterDesc: "開始使用自動化研討會",
    planStarterF1: "1 場研討會",
    planStarterF2: "最多 50 位報名者",
    planStarterF3: "基本聊天模擬",
    planStarterF4: "Email 通知",
    planStarterF5: "嵌入支援",
    planStarterCta: "免費開始",
    planProName: "專業版",
    planProDesc: "適合成長中的企業與行銷人",
    planProF1: "無限場研討會",
    planProF2: "無限報名人數",
    planProF3: "進階聊天與投票",
    planProF4: "CTA 按鈕與小提示卡",
    planProF5: "數據分析儀表板",
    planProF6: "Webhook 整合",
    planProF7: "CSV 匯出",
    planProF8: "優先客服",
    planProCta: "免費試用",
    planEntName: "企業版",
    planEntDesc: "適合大型團隊與組織",
    planEntF1: "專業版全部功能",
    planEntF2: "自訂品牌",
    planEntF3: "專屬客服",
    planEntF4: "SLA 保證",
    planEntF5: "API 存取",
    planEntF6: "SSO 整合",
    planEntCta: "聯繫銷售",
    mostPopular: "最受歡迎",
    ctaTitle: "準備好自動化您的研討會了嗎？",
    ctaDesc: "加入數千位使用 ICTA-WEBINAR 全天候舉辦精彩自動化研討會的行銷人和教育者。",
    ctaButton: "建立您的第一場研討會",
    footerRights: "保留所有權利。",
    seoTitle: "ICTA-WEBINAR - 自動化研討會平台 | 將影片轉化為直播體驗",
    seoDesc: "打造彷彿直播的自動化研討會。透過模擬聊天、定時 CTA、投票等功能，全程自動運行。",
    price_free: "免費",
    price_pro: "$49",
    price_pro_period: "/月",
    price_ent: "洽詢",
  },
  "zh-CN": {
    navFeatures: "功能特色",
    navHow: "运作方式",
    navPricing: "方案价格",
    signIn: "登录",
    getStarted: "立即开始",
    heroBadge: "自动化研讨会平台",
    heroTitle1: "将预录视频转化为",
    heroTitle2: "直播研讨会",
    heroTitle3: "体验",
    heroDesc: "打造仿佛直播的自动化研讨会。通过模拟聊天、定时 CTA、投票互动等功能，全程自动运行，吸引观众参与。",
    heroStart: "免费开始",
    heroDemo: "了解运作方式",
    trustNoCc: "无需信用卡",
    trustFree: "提供免费方案",
    trustSetup: "几分钟内完成设置",
    previewChat: "即时聊天",
    previewMsg1: "内容真的很棒！",
    previewMsg2: "超级实用的分享",
    previewMsg3: "哪里可以学更多？",
    previewDesc: "您的研讨会在此播放 — 搭配即时聊天、CTA 按钮和投票功能",
    featuresBadge: "功能特色",
    featuresTitle: "自动化研讨会所需的一切功能",
    featuresSubtitle: "完整的工具组，帮助您创建、管理和分析能带来转化的研讨会 — 无需真正直播。",
    feat1Title: "Vimeo 视频播放",
    feat1Desc: "使用预录的 Vimeo 视频，打造无缝的直播研讨会体验。",
    feat2Title: "模拟即时聊天",
    feat2Desc: "预排假人角色的聊天消息，营造真实的观众互动氛围。",
    feat3Title: "定时 CTA 按钮",
    feat3Desc: "在最佳时机显示行动呼吁按钮，提升转化率。",
    feat4Title: "投票与互动",
    feat4Desc: "在特定视频时间点触发投票、小提示卡和问答功能。",
    feat5Title: "全自动化",
    feat5Desc: "设置一次，全天候自动运行。支持循环排程。",
    feat6Title: "嵌入任何网站",
    feat6Desc: "通过简单的嵌入代码，将报名表和直播间嵌入任何网站。",
    howBadge: "运作方式",
    howTitle: "3 个简单步骤即可上线",
    howSubtitle: "从设置到第一场自动化研讨会，不到 10 分钟。",
    step1Title: "上传您的视频",
    step1Desc: "粘贴 Vimeo 链接，设置研讨会参数。",
    step2Title: "设置互动元素",
    step2Desc: "添加聊天角色、CTA 按钮、投票和小提示卡，依视频时间触发。",
    step3Title: "排程与分享",
    step3Desc: "设置循环排程或随选播放，然后分享报名链接。",
    trustBadge: "值得信赖",
    trustTitle: "营销人与教育者的首选",
    statWebinars: "场研讨会",
    statAttendees: "位参与者",
    statUptime: "运行时间",
    statAuto: "全自动化",
    pricingBadge: "方案价格",
    pricingTitle: "简单透明的定价",
    pricingSubtitle: "免费开始，随业务增长扩展。无隐藏费用。",
    planStarterName: "入门版",
    planStarterDesc: "开始使用自动化研讨会",
    planStarterF1: "1 场研讨会",
    planStarterF2: "最多 50 位报名者",
    planStarterF3: "基本聊天模拟",
    planStarterF4: "Email 通知",
    planStarterF5: "嵌入支持",
    planStarterCta: "免费开始",
    planProName: "专业版",
    planProDesc: "适合成长中的企业与营销人",
    planProF1: "无限场研讨会",
    planProF2: "无限报名人数",
    planProF3: "进阶聊天与投票",
    planProF4: "CTA 按钮与小提示卡",
    planProF5: "数据分析仪表板",
    planProF6: "Webhook 集成",
    planProF7: "CSV 导出",
    planProF8: "优先客服",
    planProCta: "免费试用",
    planEntName: "企业版",
    planEntDesc: "适合大型团队与组织",
    planEntF1: "专业版全部功能",
    planEntF2: "自定义品牌",
    planEntF3: "专属客服",
    planEntF4: "SLA 保证",
    planEntF5: "API 访问",
    planEntF6: "SSO 集成",
    planEntCta: "联系销售",
    mostPopular: "最受欢迎",
    ctaTitle: "准备好自动化您的研讨会了吗？",
    ctaDesc: "加入数千位使用 ICTA-WEBINAR 全天候举办精彩自动化研讨会的营销人和教育者。",
    ctaButton: "创建您的第一场研讨会",
    footerRights: "保留所有权利。",
    seoTitle: "ICTA-WEBINAR - 自动化研讨会平台 | 将视频转化为直播体验",
    seoDesc: "打造仿佛直播的自动化研讨会。通过模拟聊天、定时 CTA、投票等功能，全程自动运行。",
    price_free: "免费",
    price_pro: "$49",
    price_pro_period: "/月",
    price_ent: "洽询",
  },
  "en": {
    navFeatures: "Features",
    navHow: "How It Works",
    navPricing: "Pricing",
    signIn: "Sign In",
    getStarted: "Get Started",
    heroBadge: "Automated Webinar Platform",
    heroTitle1: "Turn Pre-Recorded Videos Into ",
    heroTitle2: "Live Webinar",
    heroTitle3: " Experiences",
    heroDesc: "Create automated webinars that feel live. Engage your audience with simulated chat, timed CTAs, polls, and more — all running on autopilot.",
    heroStart: "Start For Free",
    heroDemo: "See How It Works",
    trustNoCc: "No credit card required",
    trustFree: "Free tier available",
    trustSetup: "Set up in minutes",
    previewChat: "Live Chat",
    previewMsg1: "Great content!",
    previewMsg2: "This is so helpful",
    previewMsg3: "Where can I learn more?",
    previewDesc: "Your webinar plays here — complete with live chat, CTAs, and polls",
    featuresBadge: "Features",
    featuresTitle: "Everything You Need to Run Automated Webinars",
    featuresSubtitle: "A complete toolkit to create, manage, and analyze webinars that convert — without going live.",
    feat1Title: "Vimeo Video Playback",
    feat1Desc: "Use pre-recorded Vimeo videos to create a seamless live webinar experience.",
    feat2Title: "Simulated Live Chat",
    feat2Desc: "Pre-schedule chat messages with fake personas to create authentic audience engagement.",
    feat3Title: "Timed CTA Buttons",
    feat3Desc: "Display call-to-action buttons at the perfect moment to drive conversions.",
    feat4Title: "Polls & Interactions",
    feat4Desc: "Trigger polls, tip cards, and Q&A at specific video timestamps.",
    feat5Title: "Full Automation",
    feat5Desc: "Set it up once. Your webinar runs on autopilot 24/7 with recurring schedules.",
    feat6Title: "Embed Anywhere",
    feat6Desc: "Embed registration forms and webinar rooms on any website with a simple script.",
    howBadge: "How It Works",
    howTitle: "Up and Running in 3 Simple Steps",
    howSubtitle: "From setup to your first automated webinar in under 10 minutes.",
    step1Title: "Upload Your Video",
    step1Desc: "Paste your Vimeo URL and configure your webinar settings.",
    step2Title: "Set Up Interactions",
    step2Desc: "Add chat personas, CTAs, polls, and tip cards timed to your video.",
    step3Title: "Schedule & Share",
    step3Desc: "Set recurring schedules or on-demand access, then share your registration link.",
    trustBadge: "Built for Scale",
    trustTitle: "Trusted by Marketers & Educators",
    statWebinars: "Webinars hosted",
    statAttendees: "Attendees served",
    statUptime: "Uptime",
    statAuto: "Automation",
    pricingBadge: "Pricing",
    pricingTitle: "Simple, Transparent Pricing",
    pricingSubtitle: "Start free and scale as you grow. No hidden fees.",
    planStarterName: "Starter",
    planStarterDesc: "Get started with automated webinars",
    planStarterF1: "1 Webinar",
    planStarterF2: "Up to 50 registrations",
    planStarterF3: "Basic chat simulation",
    planStarterF4: "Email notifications",
    planStarterF5: "Embed support",
    planStarterCta: "Get Started",
    planProName: "Professional",
    planProDesc: "For growing businesses and marketers",
    planProF1: "Unlimited Webinars",
    planProF2: "Unlimited registrations",
    planProF3: "Advanced chat & polls",
    planProF4: "CTA buttons & tip cards",
    planProF5: "Analytics dashboard",
    planProF6: "Webhook integrations",
    planProF7: "CSV export",
    planProF8: "Priority support",
    planProCta: "Start Free Trial",
    planEntName: "Enterprise",
    planEntDesc: "For large teams and organizations",
    planEntF1: "Everything in Pro",
    planEntF2: "Custom branding",
    planEntF3: "Dedicated support",
    planEntF4: "SLA guarantee",
    planEntF5: "API access",
    planEntF6: "SSO integration",
    planEntCta: "Contact Sales",
    mostPopular: "Most Popular",
    ctaTitle: "Ready to Automate Your Webinars?",
    ctaDesc: "Join thousands of marketers and educators who use ICTA-WEBINAR to run engaging, automated webinars around the clock.",
    ctaButton: "Create Your First Webinar",
    footerRights: "All rights reserved.",
    seoTitle: "ICTA-WEBINAR - Automated Webinar Platform | Turn Videos Into Live Experiences",
    seoDesc: "Create automated webinars that feel live. Engage your audience with simulated chat, timed CTAs, polls, and more — all running on autopilot with ICTA-WEBINAR.",
    price_free: "Free",
    price_pro: "$49",
    price_pro_period: "/mo",
    price_ent: "Custom",
  },
};

const featureIcons = [Play, MessageCircle, MousePointerClick, BarChart3, Bot, Globe];

function getFeatures(lang: Lang) {
  const s = t[lang];
  return [
    { icon: featureIcons[0], title: s.feat1Title, desc: s.feat1Desc },
    { icon: featureIcons[1], title: s.feat2Title, desc: s.feat2Desc },
    { icon: featureIcons[2], title: s.feat3Title, desc: s.feat3Desc },
    { icon: featureIcons[3], title: s.feat4Title, desc: s.feat4Desc },
    { icon: featureIcons[4], title: s.feat5Title, desc: s.feat5Desc },
    { icon: featureIcons[5], title: s.feat6Title, desc: s.feat6Desc },
  ];
}

function getSteps(lang: Lang) {
  const s = t[lang];
  return [
    { num: "01", title: s.step1Title, desc: s.step1Desc },
    { num: "02", title: s.step2Title, desc: s.step2Desc },
    { num: "03", title: s.step3Title, desc: s.step3Desc },
  ];
}

function getPlans(lang: Lang) {
  const s = t[lang];
  return [
    {
      name: s.planStarterName,
      price: s.price_free,
      period: "",
      desc: s.planStarterDesc,
      features: [s.planStarterF1, s.planStarterF2, s.planStarterF3, s.planStarterF4, s.planStarterF5],
      cta: s.planStarterCta,
      popular: false,
    },
    {
      name: s.planProName,
      price: s.price_pro,
      period: s.price_pro_period,
      desc: s.planProDesc,
      features: [s.planProF1, s.planProF2, s.planProF3, s.planProF4, s.planProF5, s.planProF6, s.planProF7, s.planProF8],
      cta: s.planProCta,
      popular: true,
    },
    {
      name: s.planEntName,
      price: s.price_ent,
      period: "",
      desc: s.planEntDesc,
      features: [s.planEntF1, s.planEntF2, s.planEntF3, s.planEntF4, s.planEntF5, s.planEntF6],
      cta: s.planEntCta,
      popular: false,
    },
  ];
}

function getStats(lang: Lang) {
  const s = t[lang];
  return [
    { value: "10K+", label: s.statWebinars },
    { value: "500K+", label: s.statAttendees },
    { value: "99.9%", label: s.statUptime },
    { value: "24/7", label: s.statAuto },
  ];
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);

  const s = t[lang];
  const features = getFeatures(lang);
  const steps = getSteps(lang);
  const plans = getPlans(lang);
  const stats = getStats(lang);

  const switchLang = useCallback((newLang: Lang) => {
    setLang(newLang);
    setLangOpen(false);
  }, [setLang]);

  useEffect(() => {
    document.title = s.seoTitle;
    document.documentElement.lang = lang === "zh-CN" ? "zh-CN" : lang === "zh-TW" ? "zh-TW" : "en";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", s.seoDesc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", s.seoTitle);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", s.seoDesc);
  }, [lang, s.seoTitle, s.seoDesc]);

  useEffect(() => {
    if (!langOpen) return;
    const handler = () => setLangOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [langOpen]);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt="ICTA" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg tracking-tight" data-testid="text-brand-name">ICTA-WEBINAR</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground transition-colors" data-testid="link-features">{s.navFeatures}</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground transition-colors" data-testid="link-how">{s.navHow}</a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors" data-testid="link-pricing">{s.navPricing}</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLangOpen(!langOpen)}
                data-testid="button-lang-toggle"
              >
                <Languages className="w-4 h-4" />
              </Button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-md border bg-popover p-1 shadow-md">
                  {(["zh-TW", "zh-CN", "en"] as Lang[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => switchLang(l)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-sm hover-elevate flex items-center justify-between gap-2 ${lang === l ? "bg-accent text-accent-foreground" : ""}`}
                      data-testid={`button-lang-${l}`}
                    >
                      <span>{langLabels[l]}</span>
                      <span className="text-xs text-muted-foreground">{langShort[l]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" onClick={() => setLocation("/admin")} data-testid="button-sign-in">
              {s.signIn}
            </Button>
            <Button onClick={() => setLocation("/admin")} data-testid="button-get-started-nav">
              {s.getStarted}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
              <Zap className="w-3 h-3 mr-1" />
              {s.heroBadge}
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6" data-testid="text-hero-title">
              {s.heroTitle1}
              <span className="text-primary">{s.heroTitle2}</span>
              {s.heroTitle3}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-desc">
              {s.heroDesc}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={() => setLocation("/admin")} data-testid="button-hero-start">
                {s.heroStart}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} data-testid="button-hero-demo">
                <Play className="mr-1 h-4 w-4" />
                {s.heroDemo}
              </Button>
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground" data-testid="hero-trust-signals">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> {s.trustNoCc}</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> {s.trustFree}</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> {s.trustSetup}</span>
            </div>
          </div>

          <div className="mt-16 max-w-4xl mx-auto">
            <Card className="overflow-visible">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-md aspect-video flex items-center justify-center relative">
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                    <div className="w-3 h-3 rounded-full bg-green-400/70" />
                  </div>
                  <div className="text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                      <Play className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-white/60 text-sm">{s.previewDesc}</p>
                  </div>
                  <div className="absolute right-4 top-12 bottom-4 w-56 bg-white/5 backdrop-blur rounded-md border border-white/10 hidden lg:flex flex-col">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="text-white/80 text-xs font-medium">{s.previewChat}</p>
                    </div>
                    <div className="flex-1 p-2 space-y-2 overflow-hidden">
                      {[s.previewMsg1, s.previewMsg2, s.previewMsg3].map((msg, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/30 flex-shrink-0 mt-0.5" />
                          <p className="text-white/50 text-[10px] leading-tight">{msg}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              <Layers className="w-3 h-3 mr-1" />
              {s.featuresBadge}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">
              {s.featuresTitle}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {s.featuresSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {features.map((f) => (
              <Card key={f.title} className="hover-elevate" data-testid={`card-feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              <Clock className="w-3 h-3 mr-1" />
              {s.howBadge}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-how-title">
              {s.howTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {s.howSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map((st) => (
              <div key={st.num} className="text-center" data-testid={`step-${st.num}`}>
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-5">
                  {st.num}
                </div>
                <h3 className="font-semibold text-lg mb-2">{st.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-5">
            <Badge variant="secondary" className="mb-4">
              <Shield className="w-3 h-3 mr-1" />
              {s.trustBadge}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-trust-title">
              {s.trustTitle}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center mt-10">
            {stats.map((stat) => (
              <div key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              <Users className="w-3 h-3 mr-1" />
              {s.pricingBadge}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-pricing-title">
              {s.pricingTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {s.pricingSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto items-start">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.popular ? "border-primary relative" : ""}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>{s.mostPopular}</Badge>
                  </div>
                )}
                <CardContent className={`p-6 ${plan.popular ? "pt-8" : ""}`}>
                  <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <Button
                    className="w-full mb-6"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => setLocation("/admin")}
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto overflow-visible">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4" data-testid="text-cta-title">
                {s.ctaTitle}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                {s.ctaDesc}
              </p>
              <Button size="lg" onClick={() => setLocation("/admin")} data-testid="button-cta-final">
                {s.ctaButton}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="ICTA" className="w-6 h-6 object-contain" />
            <span className="text-sm font-semibold">ICTA-WEBINAR</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ICTA-WEBINAR. {s.footerRights}
          </p>
        </div>
      </footer>
    </div>
  );
}
