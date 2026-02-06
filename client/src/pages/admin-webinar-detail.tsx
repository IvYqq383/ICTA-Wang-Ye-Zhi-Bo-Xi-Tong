import { useState, useEffect, useRef, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, Plus, Users, MessageSquare, MousePointerClick, 
  BarChart, Trash2, Loader2, Clock, Radio, Copy, ExternalLink,
  Lightbulb, HelpCircle, Star, TrendingUp, Settings, Code,
  Mail, Palette, Calendar, Edit, Save, RefreshCw, FileText, Eye,
  Upload, ImagePlus, X, Bell, Link2, Download, Globe, Languages
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from "recharts";
import type { Webinar, FakeUser, ScheduledMessage, CtaButton, Poll, Registration, Tip, Question, FeedbackSurvey, Webhook } from "@shared/schema";
import type { FeedbackResponse } from "@shared/schema";
import { useAdminLang, type LangAdmin } from "@/hooks/use-lang";

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

const t: Record<LangAdmin, Record<string, string>> = {
  "zh-TW": {
    valEnterName: "請輸入名稱",
    valSelectFakeUser: "請選擇假人",
    valEnterMessage: "請輸入訊息",
    valEnterTriggerTime: "請輸入觸發時間",
    valEnterButtonText: "請輸入按鈕文字",
    valEnterValidUrl: "請輸入有效網址",
    valEnterStartTime: "請輸入開始時間",
    valEnterQuestion: "請輸入問題",
    valEnterOptions: "請輸入選項（用逗號分隔）",
    valEnterTitle: "請輸入標題",
    valEnterContent: "請輸入內容",
    toastFakeUserCreated: "假人已建立",
    toastScheduledMsgCreated: "預排訊息已建立",
    toastCtaCreated: "CTA 按鈕已建立",
    toastPollCreated: "投票已建立",
    toastTipCreated: "小提示已建立",
    toastSettingsSaved: "設定已儲存",
    toastSaveFailed: "儲存失敗",
    toastQuestionAnswered: "已回覆問題",
    toastDeleted: "已刪除",
    toastWebhookCreated: "Webhook 已建立",
    toastCreateFailed: "建立失敗",
    toastWebhookDeleted: "Webhook 已刪除",
    toastCopied: "已複製到剪貼簿",
    toastUploadFailed: "上傳失敗",
    toastCoverUploaded: "封面上傳成功",
    toastSessionAdded: "場次已新增",
    toastAddFailed: "新增失敗",
    toastSessionsGenerated: "已產生未來 30 天的場次",
    toastGenerateFailed: "產生場次失敗",
    toastSessionDeleted: "場次已刪除",
    toastDeleteFailed: "刪除失敗",
    toastEnterTargetUrl: "請輸入目標網址",
    toastDefaultSurveyCreated: "預設問卷已建立",
    toastEmbedCodeCopied: "已複製嵌入代碼",
    toastScriptCodeCopied: "已複製 Script 代碼",
    toastButtonCodeCopied: "已複製按鈕代碼",
    toastCopiedSimple: "已複製",
    toastInlineCodeCopied: "已複製內嵌代碼",
    notFound: "找不到此直播間",
    placeholderTitle: "直播標題",
    placeholderVimeoUrl: "Vimeo 網址",
    placeholderDescription: "直播描述（選填）",
    labelCoverImage: "封面圖片",
    altCoverPreview: "封面預覽",
    clickUploadCover: "點擊上傳封面圖片",
    uploading: "上傳中...",
    placeholderImageUrl: "或輸入圖片網址",
    btnSave: "儲存",
    btnCancel: "取消",
    headerSubtitle: "直播間設定",
    btnLiveControl: "即時控制台",
    tabSchedule: "排程",
    tabNotifications: "通知",
    tabInteractions: "互動",
    tabChat: "聊天",
    tabRegistrations: "報名",
    tabAnalytics: "分析",
    tabSettings: "設定",
    schedNavTitle: "排程",
    schedNavEventSettings: "活動設定",
    schedNavScheduledWebinars: "排程場次",
    schedNavOnDemand: "隨選觀看",
    schedNavJustInTime: "即時開始",
    schedNavReplays: "重播設定",
    schedNavSessionMgmt: "場次管理",
    schedEventSettingsTitle: "活動設定",
    schedEventType: "活動類型",
    schedRecurring: "循環排程",
    schedOneTime: "單次活動",
    schedSpecificDates: "指定日期時間",
    schedOnDemandOnly: "僅隨選",
    schedStartDate: "開始日期",
    schedEndDate: "結束日期",
    schedNeverEnd: "永不結束",
    schedSpecifyEndDate: "指定結束日期",
    schedTimezone: "時區",
    schedAttendeeTimezone: "觀眾所在時區",
    schedFixedTimezone: "固定時區",
    schedShowTimezoneOnForm: "在報名表單顯示時區",
    schedSaveEventSettings: "儲存活動設定",
    tzTaipei: "台北",
    tzTokyo: "東京",
    tzShanghai: "上海",
    tzHongKong: "香港",
    tzNewYork: "紐約",
    tzLosAngeles: "洛杉磯",
    tzLondon: "倫敦",
    tzParis: "巴黎",
    tzSydney: "雪梨",
    schedScheduledTitle: "排程場次",
    schedScheduledDesc: "循環活動會自動在指定時間排程",
    schedEveryDay: "每天",
    schedEveryWeek: "每週",
    schedEveryTwoWeeks: "每兩週",
    schedAt: "於",
    schedDayMon: "一",
    schedDayTue: "二",
    schedDayWed: "三",
    schedDayThu: "四",
    schedDayFri: "五",
    schedDaySat: "六",
    schedDaySun: "日",
    schedAtFollowingTimes: "於以下時間：",
    schedExcludeDates: "排除日期（用逗號分隔）",
    schedSaveRecurring: "儲存排程設定",
    schedGenerateSessions: "產生未來 30 天場次",
    schedOnDemandTitle: "隨選觀看",
    schedOnDemandDesc: "觀眾可以隨時觀看直播錄影",
    schedOnDemandNote: "啟用隨選觀看模式後，觀眾無需等待特定時間即可觀看。",
    schedEnableOnDemand: "啟用隨選觀看",
    schedJitTitle: "即時開始",
    schedJitDesc: "觀眾進入後，在指定分鐘內自動開始直播",
    schedJitWaitMinutes: "等待分鐘數",
    schedJitNote: "觀眾進入後，下一場將在此分鐘數內開始",
    schedSaveJit: "儲存即時開始設定",
    schedReplaysTitle: "重播設定",
    schedReplaysDesc: "直播結束後的重播影片設定",
    schedEnableReplay: "啟用重播",
    schedReplayHours: "重播可用時數",
    schedReplayNote: "直播結束後，重播影片的可用時數",
    schedSaveReplay: "儲存重播設定",
    schedSessionMgmtTitle: "場次管理",
    schedSessionMgmtDesc: "新增直播場次讓觀眾在報名時自行選擇",
    schedAddSession: "新增場次",
    schedSessionUpcoming: "即將到來",
    schedSessionExpired: "已過期",
    schedNoSessions: "尚未新增場次，觀眾將無法選擇時段",
    notifEmailTitle: "郵件設定",
    notifEmailDesc: "控制自動郵件通知的開關和內容",
    notifEmailConfirmation: "報名確認信",
    notifEmail24h: "24 小時前提醒",
    notifEmail1h: "1 小時前提醒",
    notifEmailFollowUp: "結束後跟進信",
    notifEmailSubject: "自訂郵件主旨（選填）",
    notifEmailSubjectPlaceholder: "留空使用預設主旨",
    notifEmailTemplate: "自訂郵件模板（選填）",
    notifEmailTemplatePlaceholder: "留空使用預設模板，支援 HTML",
    notifSaveEmail: "儲存郵件設定",
    notifWebhookTitle: "Webhook 管理",
    notifWebhookDesc: "設定事件觸發時自動通知的 Webhook",
    notifAddWebhook: "新增 Webhook",
    notifWebhookDialogTitle: "新增 Webhook",
    notifWebhookDialogDesc: "當指定事件發生時，系統會向目標網址發送 POST 請求",
    notifWebhookEventType: "事件類型",
    notifWebhookRegistration: "報名 (registration)",
    notifWebhookAttendance: "出席 (attendance)",
    notifWebhookCompletion: "完播 (completion)",
    notifWebhookTargetUrl: "目標網址",
    notifWebhookSecret: "密鑰（選填）",
    notifWebhookSecretPlaceholder: "用於驗證請求來源",
    btnCreate: "建立",
    notifWebhookEnabled: "啟用",
    notifWebhookDisabled: "停用",
    notifNoWebhooks: "尚無 Webhook",
    interCtaTitle: "CTA 按鈕",
    interCtaDesc: "在影片上顯示行動呼籲按鈕",
    interAddCta: "新增 CTA",
    interCtaDialogTitle: "新增 CTA 按鈕",
    interCtaButtonText: "按鈕文字",
    interCtaButtonTextPlaceholder: "立即報名",
    interCtaLinkUrl: "連結網址",
    interCtaStartTime: "開始時間 (分:秒)",
    interCtaEndTime: "結束時間（選填）",
    interCtaStyle: "樣式",
    interCtaStylePrimary: "主要（藍色）",
    interCtaStyleSecondary: "次要（灰色）",
    interCtaStyleDanger: "強調（紅色）",
    interCtaEnd: "結束",
    interNoCtaButtons: "尚無 CTA 按鈕",
    interPollTitle: "投票管理",
    interPollDesc: "設定在特定時間彈出的投票問題",
    interAddPoll: "新增投票",
    interPollDialogTitle: "新增投票",
    interPollQuestion: "問題",
    interPollQuestionPlaceholder: "您覺得這個課程如何？",
    interPollOptions: "選項（用逗號分隔）",
    interPollOptionsPlaceholder: "非常好, 還可以, 需要改進",
    interPollTriggerTime: "觸發時間 (分:秒)",
    interPollDuration: "持續時間（秒）",
    interNoPolls: "尚無投票",
    interTipTitle: "小提示卡",
    interTipDesc: "在特定時間點顯示的提示訊息",
    interAddTip: "新增提示",
    interTipDialogTitle: "新增小提示",
    interTipTitleLabel: "標題",
    interTipTitlePlaceholder: "重要提示",
    interTipContent: "內容",
    interTipContentPlaceholder: "輸入提示內容...",
    interTipTriggerTime: "觸發時間 (分:秒)",
    interTipDisplayDuration: "顯示時間（秒）",
    interTipSeconds: "秒",
    interNoTips: "尚無提示",
    interFeedbackTitle: "回饋問卷",
    interFeedbackDesc: "直播結束後向觀眾收集回饋",
    interFeedbackActive: "啟用中",
    interFeedbackInactive: "已停用",
    interFeedbackRating: "評分",
    interFeedbackText: "文字",
    interFeedbackChoice: "選擇",
    interFeedbackRequired: "必填",
    interNoSurvey: "尚未設定問卷",
    interDefaultSurveyTitle: "請給我們回饋",
    interDefaultQ1: "您對本次直播的整體評價？",
    interDefaultQ2: "您最喜歡哪個部分？",
    interDefaultQ3: "您會推薦給朋友嗎？",
    interDefaultOpt1: "一定會",
    interDefaultOpt2: "可能會",
    interDefaultOpt3: "不確定",
    interDefaultOpt4: "不會",
    interCreateDefaultSurvey: "建立預設問卷",
    interFeedbackStatsTitle: "問卷回覆統計",
    interFeedbackResponseCount: "份回覆",
    interNoFeedbackResponses: "尚無問卷回覆",
    interQaTitle: "觀眾問答",
    interQaDesc: "觀眾在直播中提交的問題",
    interQaAnonymous: "匿名",
    interQaAnswered: "已回覆",
    interQaPending: "待回覆",
    interQaReply: "回覆",
    interQaReplyPlaceholder: "輸入回覆...",
    interQaSubmit: "送出",
    interNoQuestions: "尚無問題",
    chatFakeUserTitle: "假人管理",
    chatFakeUserDesc: "建立虛擬觀眾以營造熱絡氣氛",
    chatAddFakeUser: "新增假人",
    chatFakeUserDialogTitle: "新增假人",
    chatFakeUserName: "名稱",
    chatFakeUserNamePlaceholder: "小明",
    chatNoFakeUsers: "尚無假人",
    chatScheduledMsgTitle: "預排訊息",
    chatScheduledMsgDesc: "設定在特定時間自動發送的訊息",
    chatAddMessage: "新增訊息",
    chatMsgDialogTitle: "新增預排訊息",
    chatMsgSender: "發送者",
    chatMsgSelectFakeUser: "選擇假人",
    chatMsgContent: "訊息內容",
    chatMsgContentPlaceholder: "太棒了！",
    chatMsgTriggerTime: "觸發時間 (分:秒)",
    chatMsgUnknown: "未知",
    chatNoScheduledMessages: "尚無預排訊息",
    regTitle: "報名名單",
    regDesc: "已報名參加此直播的觀眾",
    regExportCsv: "匯出 CSV",
    regSource: "來源:",
    regMedium: "媒介:",
    regCampaign: "活動:",
    regAttended: "已參加",
    regNoRegistrations: "尚無報名",
    analyticsRegistrations: "報名人數",
    analyticsAttended: "參加人數",
    analyticsAttendanceRate: "出席率",
    analyticsAvgWatchTime: "平均觀看時間",
    analyticsCompletionRate: "完播率",
    analyticsAvgCompletion: "平均觀看比例",
    analyticsRegVsAttend: "報名 vs 出席",
    analyticsAttendedLabel: "已出席",
    analyticsNotAttendedLabel: "未出席",
    analyticsNoData: "尚無數據",
    analyticsWatchDuration: "觀看時長分佈",
    analyticsViewerCount: "觀眾數",
    analyticsRetention: "觀眾留存曲線",
    analyticsRetentionDesc: "觀眾在影片各時間點的留存比例",
    analyticsRetentionRate: "留存率",
    analyticsViewerDetail: "觀眾出席詳情",
    analyticsViewerDetailDesc: "每位觀眾的觀看時長、跳出時間及完播狀態",
    analyticsNoAttendance: "尚無出席記錄",
    analyticsCompleted: "已完播",
    analyticsWatchPct: "觀看",
    analyticsEntered: "進入:",
    analyticsLeft: "離開:",
    analyticsDropOff: "跳出於影片",
    analyticsDropOffSuffix: "處",
    analyticsNoAnalytics: "尚無分析數據",
    settingsWebinarInfo: "直播資訊",
    settingsWebinarInfoDesc: "編輯直播標題、描述、影片網址與封面圖片",
    settingsTitle: "直播標題",
    settingsDescription: "直播描述",
    settingsVimeoUrl: "Vimeo 網址",
    settingsStartTime: "開始時間",
    settingsCoverImage: "封面圖片",
    settingsSaveWebinarInfo: "儲存直播資訊",
    settingsBrandTitle: "品牌設定",
    settingsBrandDesc: "自訂直播間的外觀和品牌元素",
    settingsLogoUrl: "Logo 網址",
    settingsPrimaryColor: "主色調",
    settingsSecondaryColor: "副色調",
    settingsBgColor: "背景色",
    settingsLogoPreview: "Logo 預覽：",
    settingsSaveBrand: "儲存品牌設定",
    settingsLinksTitle: "直播連結",
    settingsLinksDesc: "分享報名連結給觀眾",
    settingsShareLink: "將此報名連結分享給觀眾",
    settingsEmbedRegTitle: "嵌入報名表單",
    settingsEmbedRegDesc: "將報名表單嵌入到其他網站，訪客可以直接在你的網站上報名",
    settingsPreviewEffect: "預覽效果：",
    settingsRegFormPreview: "報名表單預覽",
    settingsEmbedWebinarTitle: "嵌入直播間播放器",
    settingsEmbedWebinarDesc: "將直播間嵌入到其他網站，觀眾可直接在你的網站上觀看直播",
    settingsPopupTitle: "彈出式報名按鈕",
    settingsPopupDesc: "在其他網站加入一段 JavaScript，訪客點擊按鈕後彈出報名視窗",
    settingsStep1Script: "步驟 1：加入 Script 標籤（放在 </body> 前）",
    settingsStep2Button: "步驟 2：在按鈕上加入屬性",
    settingsOrJsCall: "或用 JavaScript 直接呼叫",
    settingsRegisterNow: "立即報名",
    settingsInlineTitle: "內嵌報名元件（Inline Widget）",
    settingsInlineDesc: "直接嵌入到其他網頁中，訪客可以選擇時段並報名，無需彈出視窗",
    settingsStep2Container: "步驟 2：在頁面中放入容器元素",
    settingsInlineNote: "報名表單會自動嵌入到該容器中，支援時段選擇、品牌設定，並且會自動調整高度。",
    totalResponsesPrefix: "共 ",
    totalResponsesSuffix: " 份回覆",
  },
  "zh-CN": {
    valEnterName: "请输入名称",
    valSelectFakeUser: "请选择假人",
    valEnterMessage: "请输入消息",
    valEnterTriggerTime: "请输入触发时间",
    valEnterButtonText: "请输入按钮文字",
    valEnterValidUrl: "请输入有效网址",
    valEnterStartTime: "请输入开始时间",
    valEnterQuestion: "请输入问题",
    valEnterOptions: "请输入选项（用逗号分隔）",
    valEnterTitle: "请输入标题",
    valEnterContent: "请输入内容",
    toastFakeUserCreated: "假人已创建",
    toastScheduledMsgCreated: "预排消息已创建",
    toastCtaCreated: "CTA 按钮已创建",
    toastPollCreated: "投票已创建",
    toastTipCreated: "小提示已创建",
    toastSettingsSaved: "设置已保存",
    toastSaveFailed: "保存失败",
    toastQuestionAnswered: "已回复问题",
    toastDeleted: "已删除",
    toastWebhookCreated: "Webhook 已创建",
    toastCreateFailed: "创建失败",
    toastWebhookDeleted: "Webhook 已删除",
    toastCopied: "已复制到剪贴板",
    toastUploadFailed: "上传失败",
    toastCoverUploaded: "封面上传成功",
    toastSessionAdded: "场次已新增",
    toastAddFailed: "新增失败",
    toastSessionsGenerated: "已生成未来 30 天的场次",
    toastGenerateFailed: "生成场次失败",
    toastSessionDeleted: "场次已删除",
    toastDeleteFailed: "删除失败",
    toastEnterTargetUrl: "请输入目标网址",
    toastDefaultSurveyCreated: "默认问卷已创建",
    toastEmbedCodeCopied: "已复制嵌入代码",
    toastScriptCodeCopied: "已复制 Script 代码",
    toastButtonCodeCopied: "已复制按钮代码",
    toastCopiedSimple: "已复制",
    toastInlineCodeCopied: "已复制内嵌代码",
    notFound: "找不到此直播间",
    placeholderTitle: "直播标题",
    placeholderVimeoUrl: "Vimeo 网址",
    placeholderDescription: "直播描述（选填）",
    labelCoverImage: "封面图片",
    altCoverPreview: "封面预览",
    clickUploadCover: "点击上传封面图片",
    uploading: "上传中...",
    placeholderImageUrl: "或输入图片网址",
    btnSave: "保存",
    btnCancel: "取消",
    headerSubtitle: "直播间设置",
    btnLiveControl: "实时控制台",
    tabSchedule: "排程",
    tabNotifications: "通知",
    tabInteractions: "互动",
    tabChat: "聊天",
    tabRegistrations: "报名",
    tabAnalytics: "分析",
    tabSettings: "设置",
    schedNavTitle: "排程",
    schedNavEventSettings: "活动设置",
    schedNavScheduledWebinars: "排程场次",
    schedNavOnDemand: "随选观看",
    schedNavJustInTime: "即时开始",
    schedNavReplays: "重播设置",
    schedNavSessionMgmt: "场次管理",
    schedEventSettingsTitle: "活动设置",
    schedEventType: "活动类型",
    schedRecurring: "循环排程",
    schedOneTime: "单次活动",
    schedSpecificDates: "指定日期时间",
    schedOnDemandOnly: "仅随选",
    schedStartDate: "开始日期",
    schedEndDate: "结束日期",
    schedNeverEnd: "永不结束",
    schedSpecifyEndDate: "指定结束日期",
    schedTimezone: "时区",
    schedAttendeeTimezone: "观众所在时区",
    schedFixedTimezone: "固定时区",
    schedShowTimezoneOnForm: "在报名表单显示时区",
    schedSaveEventSettings: "保存活动设置",
    tzTaipei: "台北",
    tzTokyo: "东京",
    tzShanghai: "上海",
    tzHongKong: "香港",
    tzNewYork: "纽约",
    tzLosAngeles: "洛杉矶",
    tzLondon: "伦敦",
    tzParis: "巴黎",
    tzSydney: "悉尼",
    schedScheduledTitle: "排程场次",
    schedScheduledDesc: "循环活动会自动在指定时间排程",
    schedEveryDay: "每天",
    schedEveryWeek: "每周",
    schedEveryTwoWeeks: "每两周",
    schedAt: "于",
    schedDayMon: "一",
    schedDayTue: "二",
    schedDayWed: "三",
    schedDayThu: "四",
    schedDayFri: "五",
    schedDaySat: "六",
    schedDaySun: "日",
    schedAtFollowingTimes: "于以下时间：",
    schedExcludeDates: "排除日期（用逗号分隔）",
    schedSaveRecurring: "保存排程设置",
    schedGenerateSessions: "生成未来 30 天场次",
    schedOnDemandTitle: "随选观看",
    schedOnDemandDesc: "观众可以随时观看直播录像",
    schedOnDemandNote: "启用随选观看模式后，观众无需等待特定时间即可观看。",
    schedEnableOnDemand: "启用随选观看",
    schedJitTitle: "即时开始",
    schedJitDesc: "观众进入后，在指定分钟内自动开始直播",
    schedJitWaitMinutes: "等待分钟数",
    schedJitNote: "观众进入后，下一场将在此分钟数内开始",
    schedSaveJit: "保存即时开始设置",
    schedReplaysTitle: "重播设置",
    schedReplaysDesc: "直播结束后的重播视频设置",
    schedEnableReplay: "启用重播",
    schedReplayHours: "重播可用时数",
    schedReplayNote: "直播结束后，重播视频的可用时数",
    schedSaveReplay: "保存重播设置",
    schedSessionMgmtTitle: "场次管理",
    schedSessionMgmtDesc: "新增直播场次让观众在报名时自行选择",
    schedAddSession: "新增场次",
    schedSessionUpcoming: "即将到来",
    schedSessionExpired: "已过期",
    schedNoSessions: "尚未新增场次，观众将无法选择时段",
    notifEmailTitle: "邮件设置",
    notifEmailDesc: "控制自动邮件通知的开关和内容",
    notifEmailConfirmation: "报名确认信",
    notifEmail24h: "24 小时前提醒",
    notifEmail1h: "1 小时前提醒",
    notifEmailFollowUp: "结束后跟进信",
    notifEmailSubject: "自定义邮件主旨（选填）",
    notifEmailSubjectPlaceholder: "留空使用默认主旨",
    notifEmailTemplate: "自定义邮件模板（选填）",
    notifEmailTemplatePlaceholder: "留空使用默认模板，支持 HTML",
    notifSaveEmail: "保存邮件设置",
    notifWebhookTitle: "Webhook 管理",
    notifWebhookDesc: "设置事件触发时自动通知的 Webhook",
    notifAddWebhook: "新增 Webhook",
    notifWebhookDialogTitle: "新增 Webhook",
    notifWebhookDialogDesc: "当指定事件发生时，系统会向目标网址发送 POST 请求",
    notifWebhookEventType: "事件类型",
    notifWebhookRegistration: "报名 (registration)",
    notifWebhookAttendance: "出席 (attendance)",
    notifWebhookCompletion: "完播 (completion)",
    notifWebhookTargetUrl: "目标网址",
    notifWebhookSecret: "密钥（选填）",
    notifWebhookSecretPlaceholder: "用于验证请求来源",
    btnCreate: "创建",
    notifWebhookEnabled: "启用",
    notifWebhookDisabled: "停用",
    notifNoWebhooks: "尚无 Webhook",
    interCtaTitle: "CTA 按钮",
    interCtaDesc: "在视频上显示行动呼吁按钮",
    interAddCta: "新增 CTA",
    interCtaDialogTitle: "新增 CTA 按钮",
    interCtaButtonText: "按钮文字",
    interCtaButtonTextPlaceholder: "立即报名",
    interCtaLinkUrl: "链接网址",
    interCtaStartTime: "开始时间 (分:秒)",
    interCtaEndTime: "结束时间（选填）",
    interCtaStyle: "样式",
    interCtaStylePrimary: "主要（蓝色）",
    interCtaStyleSecondary: "次要（灰色）",
    interCtaStyleDanger: "强调（红色）",
    interCtaEnd: "结束",
    interNoCtaButtons: "尚无 CTA 按钮",
    interPollTitle: "投票管理",
    interPollDesc: "设置在特定时间弹出的投票问题",
    interAddPoll: "新增投票",
    interPollDialogTitle: "新增投票",
    interPollQuestion: "问题",
    interPollQuestionPlaceholder: "您觉得这个课程如何？",
    interPollOptions: "选项（用逗号分隔）",
    interPollOptionsPlaceholder: "非常好, 还可以, 需要改进",
    interPollTriggerTime: "触发时间 (分:秒)",
    interPollDuration: "持续时间（秒）",
    interNoPolls: "尚无投票",
    interTipTitle: "小提示卡",
    interTipDesc: "在特定时间点显示的提示消息",
    interAddTip: "新增提示",
    interTipDialogTitle: "新增小提示",
    interTipTitleLabel: "标题",
    interTipTitlePlaceholder: "重要提示",
    interTipContent: "内容",
    interTipContentPlaceholder: "输入提示内容...",
    interTipTriggerTime: "触发时间 (分:秒)",
    interTipDisplayDuration: "显示时间（秒）",
    interTipSeconds: "秒",
    interNoTips: "尚无提示",
    interFeedbackTitle: "反馈问卷",
    interFeedbackDesc: "直播结束后向观众收集反馈",
    interFeedbackActive: "启用中",
    interFeedbackInactive: "已停用",
    interFeedbackRating: "评分",
    interFeedbackText: "文字",
    interFeedbackChoice: "选择",
    interFeedbackRequired: "必填",
    interNoSurvey: "尚未设置问卷",
    interDefaultSurveyTitle: "请给我们反馈",
    interDefaultQ1: "您对本次直播的整体评价？",
    interDefaultQ2: "您最喜欢哪个部分？",
    interDefaultQ3: "您会推荐给朋友吗？",
    interDefaultOpt1: "一定会",
    interDefaultOpt2: "可能会",
    interDefaultOpt3: "不确定",
    interDefaultOpt4: "不会",
    interCreateDefaultSurvey: "创建默认问卷",
    interFeedbackStatsTitle: "问卷回复统计",
    interFeedbackResponseCount: "份回复",
    interNoFeedbackResponses: "尚无问卷回复",
    interQaTitle: "观众问答",
    interQaDesc: "观众在直播中提交的问题",
    interQaAnonymous: "匿名",
    interQaAnswered: "已回复",
    interQaPending: "待回复",
    interQaReply: "回复",
    interQaReplyPlaceholder: "输入回复...",
    interQaSubmit: "提交",
    interNoQuestions: "尚无问题",
    chatFakeUserTitle: "假人管理",
    chatFakeUserDesc: "创建虚拟观众以营造热烈气氛",
    chatAddFakeUser: "新增假人",
    chatFakeUserDialogTitle: "新增假人",
    chatFakeUserName: "名称",
    chatFakeUserNamePlaceholder: "小明",
    chatNoFakeUsers: "尚无假人",
    chatScheduledMsgTitle: "预排消息",
    chatScheduledMsgDesc: "设置在特定时间自动发送的消息",
    chatAddMessage: "新增消息",
    chatMsgDialogTitle: "新增预排消息",
    chatMsgSender: "发送者",
    chatMsgSelectFakeUser: "选择假人",
    chatMsgContent: "消息内容",
    chatMsgContentPlaceholder: "太棒了！",
    chatMsgTriggerTime: "触发时间 (分:秒)",
    chatMsgUnknown: "未知",
    chatNoScheduledMessages: "尚无预排消息",
    regTitle: "报名名单",
    regDesc: "已报名参加此直播的观众",
    regExportCsv: "导出 CSV",
    regSource: "来源:",
    regMedium: "媒介:",
    regCampaign: "活动:",
    regAttended: "已参加",
    regNoRegistrations: "尚无报名",
    analyticsRegistrations: "报名人数",
    analyticsAttended: "参加人数",
    analyticsAttendanceRate: "出席率",
    analyticsAvgWatchTime: "平均观看时间",
    analyticsCompletionRate: "完播率",
    analyticsAvgCompletion: "平均观看比例",
    analyticsRegVsAttend: "报名 vs 出席",
    analyticsAttendedLabel: "已出席",
    analyticsNotAttendedLabel: "未出席",
    analyticsNoData: "尚无数据",
    analyticsWatchDuration: "观看时长分布",
    analyticsViewerCount: "观众数",
    analyticsRetention: "观众留存曲线",
    analyticsRetentionDesc: "观众在视频各时间点的留存比例",
    analyticsRetentionRate: "留存率",
    analyticsViewerDetail: "观众出席详情",
    analyticsViewerDetailDesc: "每位观众的观看时长、跳出时间及完播状态",
    analyticsNoAttendance: "尚无出席记录",
    analyticsCompleted: "已完播",
    analyticsWatchPct: "观看",
    analyticsEntered: "进入:",
    analyticsLeft: "离开:",
    analyticsDropOff: "跳出于视频",
    analyticsDropOffSuffix: "处",
    analyticsNoAnalytics: "尚无分析数据",
    settingsWebinarInfo: "直播信息",
    settingsWebinarInfoDesc: "编辑直播标题、描述、视频网址与封面图片",
    settingsTitle: "直播标题",
    settingsDescription: "直播描述",
    settingsVimeoUrl: "Vimeo 网址",
    settingsStartTime: "开始时间",
    settingsCoverImage: "封面图片",
    settingsSaveWebinarInfo: "保存直播信息",
    settingsBrandTitle: "品牌设置",
    settingsBrandDesc: "自定义直播间的外观和品牌元素",
    settingsLogoUrl: "Logo 网址",
    settingsPrimaryColor: "主色调",
    settingsSecondaryColor: "副色调",
    settingsBgColor: "背景色",
    settingsLogoPreview: "Logo 预览：",
    settingsSaveBrand: "保存品牌设置",
    settingsLinksTitle: "直播链接",
    settingsLinksDesc: "分享报名链接给观众",
    settingsShareLink: "将此报名链接分享给观众",
    settingsEmbedRegTitle: "嵌入报名表单",
    settingsEmbedRegDesc: "将报名表单嵌入到其他网站，访客可以直接在你的网站上报名",
    settingsPreviewEffect: "预览效果：",
    settingsRegFormPreview: "报名表单预览",
    settingsEmbedWebinarTitle: "嵌入直播间播放器",
    settingsEmbedWebinarDesc: "将直播间嵌入到其他网站，观众可直接在你的网站上观看直播",
    settingsPopupTitle: "弹出式报名按钮",
    settingsPopupDesc: "在其他网站加入一段 JavaScript，访客点击按钮后弹出报名窗口",
    settingsStep1Script: "步骤 1：加入 Script 标签（放在 </body> 前）",
    settingsStep2Button: "步骤 2：在按钮上加入属性",
    settingsOrJsCall: "或用 JavaScript 直接调用",
    settingsRegisterNow: "立即报名",
    settingsInlineTitle: "内嵌报名组件（Inline Widget）",
    settingsInlineDesc: "直接嵌入到其他网页中，访客可以选择时段并报名，无需弹出窗口",
    settingsStep2Container: "步骤 2：在页面中放入容器元素",
    settingsInlineNote: "报名表单会自动嵌入到该容器中，支持时段选择、品牌设置，并且会自动调整高度。",
    totalResponsesPrefix: "共 ",
    totalResponsesSuffix: " 份回复",
  },
};

function createSchemas(s: Record<string, string>) {
  return {
    fakeUser: z.object({
      name: z.string().min(1, s.valEnterName),
      avatar: z.string().optional(),
    }),
    scheduledMessage: z.object({
      fakeUserId: z.string().min(1, s.valSelectFakeUser),
      message: z.string().min(1, s.valEnterMessage),
      triggerTime: z.string().min(1, s.valEnterTriggerTime),
    }),
    cta: z.object({
      text: z.string().min(1, s.valEnterButtonText),
      url: z.string().url(s.valEnterValidUrl),
      startTime: z.string().min(1, s.valEnterStartTime),
      endTime: z.string().optional(),
      style: z.string().default("primary"),
    }),
    poll: z.object({
      question: z.string().min(1, s.valEnterQuestion),
      options: z.string().min(1, s.valEnterOptions),
      triggerTime: z.string().min(1, s.valEnterTriggerTime),
      duration: z.string().default("60"),
    }),
    tip: z.object({
      title: z.string().min(1, s.valEnterTitle),
      content: z.string().min(1, s.valEnterContent),
      triggerTime: z.string().min(1, s.valEnterTriggerTime),
      duration: z.string().default("30"),
    }),
  };
}

export default function AdminWebinarDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { lang, setLang } = useAdminLang();
  const s = t[lang];
  const schemas = useMemo(() => createSchemas(s), [s]);
  
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
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const [brandLogo, setBrandLogo] = useState("");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#667eea");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#764ba2");
  const [brandBackgroundColor, setBrandBackgroundColor] = useState("#1a1a2e");

  const [emailConfirmation, setEmailConfirmation] = useState(true);
  const [emailReminder24h, setEmailReminder24h] = useState(true);
  const [emailReminder1h, setEmailReminder1h] = useState(true);
  const [emailFollowUp, setEmailFollowUp] = useState(true);
  const [emailCustomSubject, setEmailCustomSubject] = useState("");
  const [emailCustomTemplate, setEmailCustomTemplate] = useState("");

  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringTimes, setRecurringTimes] = useState("");
  const [recurringExcludeDates, setRecurringExcludeDates] = useState("");

  const [newSessionDate, setNewSessionDate] = useState("");

  const [scheduleSubSection, setScheduleSubSection] = useState("eventSettings");
  const [eventType, setEventType] = useState<"recurring" | "oneTime" | "specificDates" | "onDemandOnly">("recurring");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndType, setEventEndType] = useState<"never" | "endDate">("never");
  const [eventEndDate, setEventEndDate] = useState("");
  const [timezoneType, setTimezoneType] = useState<"attendee" | "fixed">("fixed");
  const [showTimezoneOnForm, setShowTimezoneOnForm] = useState(true);
  const [scheduledTimeSlots, setScheduledTimeSlots] = useState<string[]>(["11:00", "14:00", "18:00"]);
  const [scheduleFrequency, setScheduleFrequency] = useState("everyDay");
  const [newTimeSlot, setNewTimeSlot] = useState("09:00");

  const [isWebhookOpen, setIsWebhookOpen] = useState(false);
  const [newWebhookEvent, setNewWebhookEvent] = useState("registration");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");

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

  const { data: webinarSessions } = useQuery<Array<{ id: string; scheduledStart: string; status: string }>>({
    queryKey: ["/api/webinars", id, "sessions"],
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

  const { data: webhooks } = useQuery<Webhook[]>({
    queryKey: ["/api/webinars", id, "webhooks"],
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

      setEditTitle(webinar.title);
      setEditDescription(webinar.description || "");
      setEditVimeoUrl(webinar.vimeoUrl);
      setEditStartTime(new Date(webinar.startTime).toISOString().slice(0, 16));
      setEditCoverImage(webinar.coverImage || "");

      const bs = webinar.brandSettings as any;
      if (bs) {
        setBrandLogo(bs.logo || "");
        setBrandPrimaryColor(bs.primaryColor || "#667eea");
        setBrandSecondaryColor(bs.secondaryColor || "#764ba2");
        setBrandBackgroundColor(bs.backgroundColor || "#1a1a2e");
      }

      const es = webinar.emailSettings as any;
      if (es) {
        setEmailConfirmation(es.confirmationEnabled ?? true);
        setEmailReminder24h(es.reminder24hEnabled ?? true);
        setEmailReminder1h(es.reminder1hEnabled ?? true);
        setEmailFollowUp(es.followUpEnabled ?? true);
        setEmailCustomSubject(es.customSubject || "");
        setEmailCustomTemplate(es.customTemplate || "");
      }

      const rs = webinar.recurringSchedule as any;
      if (rs) {
        setRecurringEnabled(rs.enabled ?? false);
        setRecurringDays(rs.days || []);
        setRecurringTimes((rs.times || []).join(", "));
        setRecurringExcludeDates((rs.excludeDates || []).join(", "));
        if (rs.times && rs.times.length > 0) {
          setScheduledTimeSlots(rs.times);
        }
      }

      const sm2 = webinar.scheduleMode as any;
      if (sm2?.onDemand) {
        setEventType("onDemandOnly");
      } else if (sm2?.justInTime) {
        setEventType("oneTime");
        setScheduleSubSection("justInTime");
      } else if (rs?.enabled) {
        setEventType("recurring");
      } else {
        setEventType(sm2?.eventType || "oneTime");
      }

      if (sm2?.eventEndType) {
        setEventEndType(sm2.eventEndType);
      }
      if (sm2?.eventEndDate) {
        setEventEndDate(sm2.eventEndDate);
      }
      if (sm2?.timezoneType) {
        setTimezoneType(sm2.timezoneType);
      }
      if (sm2?.showTimezoneOnForm !== undefined) {
        setShowTimezoneOnForm(sm2.showTimezoneOnForm);
      }

      if (rs?.frequency) {
        setScheduleFrequency(rs.frequency);
      }

      if (webinar.startTime) {
        setEventStartDate(new Date(webinar.startTime).toISOString().slice(0, 10));
      }
    }
  }, [webinar]);

  const fakeUserForm = useForm({
    resolver: zodResolver(schemas.fakeUser),
    defaultValues: { name: "", avatar: "" },
  });

  const messageForm = useForm({
    resolver: zodResolver(schemas.scheduledMessage),
    defaultValues: { fakeUserId: "", message: "", triggerTime: "" },
  });

  const ctaForm = useForm({
    resolver: zodResolver(schemas.cta),
    defaultValues: { text: "", url: "", startTime: "", endTime: "", style: "primary" },
  });

  const pollForm = useForm({
    resolver: zodResolver(schemas.poll),
    defaultValues: { question: "", options: "", triggerTime: "", duration: "60" },
  });

  const tipForm = useForm({
    resolver: zodResolver(schemas.tip),
    defaultValues: { title: "", content: "", triggerTime: "", duration: "30" },
  });

  const createFakeUser = useMutation({
    mutationFn: async (data: z.infer<typeof schemas.fakeUser>) => {
      return apiRequest("POST", `/api/webinars/${id}/fake-users`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "fake-users"] });
      setIsFakeUserOpen(false);
      fakeUserForm.reset();
      toast({ title: s.toastFakeUserCreated });
    },
  });

  const createMessage = useMutation({
    mutationFn: async (data: z.infer<typeof schemas.scheduledMessage>) => {
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
      toast({ title: s.toastScheduledMsgCreated });
    },
  });

  const createCta = useMutation({
    mutationFn: async (data: z.infer<typeof schemas.cta>) => {
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
      toast({ title: s.toastCtaCreated });
    },
  });

  const createPoll = useMutation({
    mutationFn: async (data: z.infer<typeof schemas.poll>) => {
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
      toast({ title: s.toastPollCreated });
    },
  });

  const createTip = useMutation({
    mutationFn: async (data: z.infer<typeof schemas.tip>) => {
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
      toast({ title: s.toastTipCreated });
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
      toast({ title: s.toastSettingsSaved });
    },
    onError: (error: Error) => {
      toast({ title: s.toastSaveFailed, description: error.message, variant: "destructive" });
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
      toast({ title: s.toastQuestionAnswered });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, itemId }: { type: string; itemId: string }) => {
      return apiRequest("DELETE", `/api/webinars/${id}/${type}/${itemId}`, {});
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, type] });
      toast({ title: s.toastDeleted });
    },
  });

  const createWebhook = useMutation({
    mutationFn: async (data: { webinarId: string; eventType: string; targetUrl: string; secret: string; enabled: boolean }) => {
      return apiRequest("POST", `/api/webinars/${id}/webhooks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "webhooks"] });
      setIsWebhookOpen(false);
      setNewWebhookEvent("registration");
      setNewWebhookUrl("");
      setNewWebhookSecret("");
      toast({ title: s.toastWebhookCreated });
    },
    onError: (error: Error) => {
      toast({ title: s.toastCreateFailed, description: error.message, variant: "destructive" });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (hookId: string) => {
      return apiRequest("DELETE", `/api/webinars/${id}/webhooks/${hookId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "webhooks"] });
      toast({ title: s.toastWebhookDeleted });
    },
  });

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: s.toastCopied });
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
        <p>{s.notFound}</p>
      </div>
    );
  }

  const registrationUrl = `${window.location.origin}/register/${id}`;
  const webinarUrl = `${window.location.origin}/webinar/${id}`;

  return (
    <div className="min-h-screen bg-background">
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
                  placeholder={s.placeholderTitle}
                  data-testid="input-edit-title"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    value={editVimeoUrl}
                    onChange={(e) => setEditVimeoUrl(e.target.value)}
                    placeholder={s.placeholderVimeoUrl}
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
                  placeholder={s.placeholderDescription}
                  className="resize-none"
                  rows={2}
                  data-testid="input-edit-description"
                />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{s.labelCoverImage}</Label>
                  {editCoverImage ? (
                    <div className="relative rounded-md overflow-hidden border">
                      <img src={editCoverImage} alt={s.altCoverPreview} className="w-full h-32 object-cover" />
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                        onClick={() => setEditCoverImage("")}
                        data-testid="button-remove-cover"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover-elevate"
                      onClick={() => coverFileRef.current?.click()}
                      data-testid="button-upload-cover-area"
                    >
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{s.clickUploadCover}</span>
                    </div>
                  )}
                  <input
                    ref={coverFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingCover(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        const res = await fetch("/api/upload", {
                          method: "POST",
                          body: formData,
                        });
                        if (!res.ok) {
                          const errData = await res.json();
                          throw new Error(errData.message || s.toastUploadFailed);
                        }
                        const { url } = await res.json();
                        setEditCoverImage(url);
                        toast({ title: s.toastCoverUploaded });
                      } catch (err: any) {
                        toast({ title: s.toastUploadFailed, description: err.message, variant: "destructive" });
                      } finally {
                        setUploadingCover(false);
                        if (coverFileRef.current) coverFileRef.current.value = "";
                      }
                    }}
                    data-testid="input-upload-cover-file"
                  />
                  {uploadingCover && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {s.uploading}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      value={editCoverImage}
                      onChange={(e) => setEditCoverImage(e.target.value)}
                      placeholder={s.placeholderImageUrl}
                      className="flex-1 text-xs"
                      data-testid="input-edit-cover"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => coverFileRef.current?.click()}
                      disabled={uploadingCover}
                      data-testid="button-upload-cover"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const oldCover = webinar.coverImage;
                      const newCover = editCoverImage || null;
                      if (oldCover && oldCover.startsWith("/uploads/") && oldCover !== newCover) {
                        try {
                          await fetch("/api/upload", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: oldCover }),
                          });
                        } catch {}
                      }
                      updateWebinar.mutate({
                        title: editTitle,
                        description: editDescription || null,
                        vimeoUrl: editVimeoUrl,
                        startTime: new Date(editStartTime).toISOString(),
                        coverImage: newCover,
                      });
                    }}
                    disabled={updateWebinar.isPending || !editTitle || !editVimeoUrl}
                    data-testid="button-save-info"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {s.btnSave}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingInfo(false)}>
                    {s.btnCancel}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {webinar.coverImage && (
                  <img
                    src={webinar.coverImage}
                    alt={webinar.title}
                    className="w-16 h-10 object-cover rounded-md flex-shrink-0 border"
                    data-testid="img-cover-preview"
                  />
                )}
                <div>
                  <h1 className="text-lg font-bold">{webinar.title}</h1>
                  <p className="text-sm text-muted-foreground">{s.headerSubtitle}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingInfo(true)} data-testid="button-edit-info">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "zh-TW" ? "zh-CN" : "zh-TW")}
            data-testid="button-detail-lang-toggle"
          >
            <Languages className="h-4 w-4 mr-1" />
            {lang === "zh-TW" ? "繁" : "简"}
          </Button>
          <Button onClick={() => setLocation(`/admin/webinar/${id}/control`)} data-testid="button-go-control">
            <Radio className="h-4 w-4 mr-2" />
            {s.btnLiveControl}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="schedule">
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="schedule" data-testid="tab-schedule">
              <Calendar className="h-4 w-4 mr-1" />
              {s.tabSchedule}
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="h-4 w-4 mr-1" />
              {s.tabNotifications}
            </TabsTrigger>
            <TabsTrigger value="interactions" data-testid="tab-interactions">
              <MousePointerClick className="h-4 w-4 mr-1" />
              {s.tabInteractions}
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageSquare className="h-4 w-4 mr-1" />
              {s.tabChat}
            </TabsTrigger>
            <TabsTrigger value="registrations" data-testid="tab-registrations">
              <Users className="h-4 w-4 mr-1" />
              {s.tabRegistrations} ({registrations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <TrendingUp className="h-4 w-4 mr-1" />
              {s.tabAnalytics}
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="h-4 w-4 mr-1" />
              {s.tabSettings}
            </TabsTrigger>
          </TabsList>

          {/* ===== Schedule Tab ===== */}
          <TabsContent value="schedule">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-52 shrink-0">
                <h3 className="font-semibold mb-3">{s.schedNavTitle}</h3>
                <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                  {[
                    { id: "eventSettings", label: s.schedNavEventSettings, icon: Settings },
                    { id: "scheduledWebinars", label: s.schedNavScheduledWebinars, icon: Calendar },
                    { id: "onDemand", label: s.schedNavOnDemand, icon: Eye },
                    { id: "justInTime", label: s.schedNavJustInTime, icon: Clock },
                    { id: "replays", label: s.schedNavReplays, icon: RefreshCw },
                    { id: "sessionManagement", label: s.schedNavSessionMgmt, icon: Calendar },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setScheduleSubSection(item.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm text-left whitespace-nowrap transition-colors",
                        scheduleSubSection === item.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover-elevate"
                      )}
                      data-testid={`button-schedule-nav-${item.id}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="flex-1 min-w-0">
                <Card>
                  <CardContent className="p-6">
                    {scheduleSubSection === "eventSettings" && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold" data-testid="text-event-settings-title">{s.schedEventSettingsTitle}</h2>

                        <div className="space-y-3">
                          <Label className="font-medium">{s.schedEventType}</Label>
                          <div className="flex flex-wrap gap-4">
                            {[
                              { value: "recurring" as const, label: s.schedRecurring },
                              { value: "oneTime" as const, label: s.schedOneTime },
                              { value: "specificDates" as const, label: s.schedSpecificDates },
                              { value: "onDemandOnly" as const, label: s.schedOnDemandOnly },
                            ].map(opt => (
                              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="eventType"
                                  value={opt.value}
                                  checked={eventType === opt.value}
                                  onChange={() => setEventType(opt.value)}
                                  className="accent-primary"
                                  data-testid={`radio-event-type-${opt.value}`}
                                />
                                <span className="text-sm">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {eventType !== "onDemandOnly" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{s.schedStartDate}</Label>
                              <Input
                                type="date"
                                value={eventStartDate}
                                onChange={(e) => setEventStartDate(e.target.value)}
                                data-testid="input-event-start-date"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{s.schedEndDate}</Label>
                              <div className="flex items-center gap-4 flex-wrap">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="eventEndType"
                                    value="never"
                                    checked={eventEndType === "never"}
                                    onChange={() => setEventEndType("never")}
                                    className="accent-primary"
                                    data-testid="radio-end-type-never"
                                  />
                                  <span className="text-sm">{s.schedNeverEnd}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="eventEndType"
                                    value="endDate"
                                    checked={eventEndType === "endDate"}
                                    onChange={() => setEventEndType("endDate")}
                                    className="accent-primary"
                                    data-testid="radio-end-type-date"
                                  />
                                  <span className="text-sm">{s.schedSpecifyEndDate}</span>
                                </label>
                              </div>
                              {eventEndType === "endDate" && (
                                <Input
                                  type="date"
                                  value={eventEndDate}
                                  onChange={(e) => setEventEndDate(e.target.value)}
                                  data-testid="input-event-end-date"
                                />
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-4 border-t pt-6 mt-6">
                          <h3 className="text-base font-semibold">{s.schedTimezone}</h3>
                          <div className="flex items-center gap-6 flex-wrap">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="timezoneType"
                                value="attendee"
                                checked={timezoneType === "attendee"}
                                onChange={() => setTimezoneType("attendee")}
                                className="accent-primary"
                                data-testid="radio-timezone-attendee"
                              />
                              <span className="text-sm">{s.schedAttendeeTimezone}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="timezoneType"
                                value="fixed"
                                checked={timezoneType === "fixed"}
                                onChange={() => setTimezoneType("fixed")}
                                className="accent-primary"
                                data-testid="radio-timezone-fixed"
                              />
                              <span className="text-sm">{s.schedFixedTimezone}</span>
                            </label>
                          </div>
                          {timezoneType === "fixed" && (
                            <Select value={settingsTimezone} onValueChange={setSettingsTimezone}>
                              <SelectTrigger data-testid="select-timezone">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Asia/Taipei">Asia/Taipei ({s.tzTaipei})</SelectItem>
                                <SelectItem value="Asia/Tokyo">Asia/Tokyo ({s.tzTokyo})</SelectItem>
                                <SelectItem value="Asia/Shanghai">Asia/Shanghai ({s.tzShanghai})</SelectItem>
                                <SelectItem value="Asia/Hong_Kong">Asia/Hong_Kong ({s.tzHongKong})</SelectItem>
                                <SelectItem value="America/New_York">America/New_York ({s.tzNewYork})</SelectItem>
                                <SelectItem value="America/Los_Angeles">America/Los_Angeles ({s.tzLosAngeles})</SelectItem>
                                <SelectItem value="Europe/London">Europe/London ({s.tzLondon})</SelectItem>
                                <SelectItem value="Europe/Paris">Europe/Paris ({s.tzParis})</SelectItem>
                                <SelectItem value="Australia/Sydney">Australia/Sydney ({s.tzSydney})</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm">{s.schedShowTimezoneOnForm}</Label>
                            <Switch
                              checked={showTimezoneOnForm}
                              onCheckedChange={setShowTimezoneOnForm}
                              data-testid="switch-show-timezone"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={() => {
                            const isOnDemand = eventType === "onDemandOnly";
                            const existingSm = webinar?.scheduleMode as any;
                            const scheduleMode = {
                              recurring: eventType === "recurring",
                              onDemand: isOnDemand,
                              justInTime: existingSm?.justInTime || false,
                              justInTimeMinutes: existingSm?.justInTimeMinutes || 15,
                              eventType,
                              eventEndType,
                              eventEndDate: eventEndType === "endDate" ? eventEndDate : null,
                              timezoneType,
                              showTimezoneOnForm,
                            };
                            updateWebinar.mutate({
                              scheduleMode,
                              timezone: timezoneType === "fixed" ? settingsTimezone : (webinar?.timezone || "Asia/Taipei"),
                              startTime: eventStartDate ? new Date(eventStartDate).toISOString() : undefined,
                            });
                          }}
                          disabled={updateWebinar.isPending}
                          data-testid="button-save-event-settings"
                        >
                          {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {s.schedSaveEventSettings}
                        </Button>
                      </div>
                    )}

                    {scheduleSubSection === "scheduledWebinars" && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold" data-testid="text-scheduled-webinars-title">{s.schedScheduledTitle}</h2>
                        <p className="text-sm text-muted-foreground">{s.schedScheduledDesc}</p>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                              <SelectTrigger className="w-40" data-testid="select-schedule-frequency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="everyDay">{s.schedEveryDay}</SelectItem>
                                <SelectItem value="everyWeek">{s.schedEveryWeek}</SelectItem>
                                <SelectItem value="everyTwoWeeks">{s.schedEveryTwoWeeks}</SelectItem>
                              </SelectContent>
                            </Select>

                            <span className="text-sm text-muted-foreground">{s.schedAt}</span>

                            <div className="flex items-center gap-1 flex-wrap">
                              {[
                                { label: s.schedDayMon, value: 1 },
                                { label: s.schedDayTue, value: 2 },
                                { label: s.schedDayWed, value: 3 },
                                { label: s.schedDayThu, value: 4 },
                                { label: s.schedDayFri, value: 5 },
                                { label: s.schedDaySat, value: 6 },
                                { label: s.schedDaySun, value: 0 },
                              ].map(day => (
                                <label key={day.value} className="flex items-center gap-1 cursor-pointer">
                                  <Checkbox
                                    checked={recurringDays.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      setRecurringDays(prev =>
                                        checked ? [...prev, day.value].sort() : prev.filter(d => d !== day.value)
                                      );
                                    }}
                                    data-testid={`checkbox-recurring-day-${day.value}`}
                                  />
                                  <span className="text-sm">{day.label}</span>
                                </label>
                              ))}
                            </div>

                            <span className="text-sm text-muted-foreground">{s.schedAtFollowingTimes}</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {scheduledTimeSlots.map((time, index) => (
                              <Badge key={index} variant="secondary" className="gap-1 px-3 py-1.5">
                                {time}
                                <button
                                  onClick={() => setScheduledTimeSlots(prev => prev.filter((_, i) => i !== index))}
                                  className="ml-1"
                                  data-testid={`button-remove-time-${index}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            <div className="flex items-center gap-1">
                              <Input
                                type="time"
                                value={newTimeSlot}
                                onChange={(e) => setNewTimeSlot(e.target.value)}
                                className="w-28"
                                data-testid="input-new-time-slot"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (newTimeSlot && /^\d{2}:\d{2}$/.test(newTimeSlot)) {
                                    setScheduledTimeSlots(prev => [...prev, newTimeSlot].sort());
                                    setNewTimeSlot("09:00");
                                  }
                                }}
                                data-testid="button-add-time-slot"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>{s.schedExcludeDates}</Label>
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
                                  enabled: true,
                                  frequency: scheduleFrequency,
                                  days: recurringDays,
                                  times: scheduledTimeSlots,
                                  excludeDates: recurringExcludeDates.split(",").map(d => d.trim()).filter(Boolean),
                                },
                              });
                            }}
                            disabled={updateWebinar.isPending}
                            data-testid="button-save-recurring"
                          >
                            {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {s.schedSaveRecurring}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                await apiRequest("PATCH", `/api/webinars/${id}`, {
                                  recurringSchedule: {
                                    enabled: true,
                                    frequency: scheduleFrequency,
                                    days: recurringDays,
                                    times: scheduledTimeSlots,
                                    excludeDates: recurringExcludeDates.split(",").map(d => d.trim()).filter(Boolean),
                                  },
                                });
                                await apiRequest("POST", `/api/webinars/${id}/generate-sessions`, { days: 30 });
                                queryClient.invalidateQueries({ queryKey: ["/api/webinars", id] });
                                queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "sessions"] });
                                toast({ title: s.toastSessionsGenerated });
                              } catch (err: any) {
                                toast({ title: s.toastGenerateFailed, description: err.message, variant: "destructive" });
                              }
                            }}
                            data-testid="button-generate-sessions"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            {s.schedGenerateSessions}
                          </Button>
                        </div>
                      </div>
                    )}

                    {scheduleSubSection === "onDemand" && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold" data-testid="text-on-demand-title">{s.schedOnDemandTitle}</h2>
                        <p className="text-sm text-muted-foreground">{s.schedOnDemandDesc}</p>
                        <div className="p-4 bg-muted rounded-md">
                          <p className="text-sm">{s.schedOnDemandNote}</p>
                        </div>
                        <Button
                          onClick={() => {
                            setSettingsScheduleMode("onDemand");
                            setEventType("onDemandOnly");
                            updateWebinar.mutate({
                              scheduleMode: { recurring: false, onDemand: true, justInTime: false, justInTimeMinutes: 15 },
                            });
                          }}
                          disabled={updateWebinar.isPending}
                          data-testid="button-enable-on-demand"
                        >
                          {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {s.schedEnableOnDemand}
                        </Button>
                      </div>
                    )}

                    {scheduleSubSection === "justInTime" && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold" data-testid="text-jit-title">{s.schedJitTitle}</h2>
                        <p className="text-sm text-muted-foreground">{s.schedJitDesc}</p>
                        <div className="space-y-2">
                          <Label>{s.schedJitWaitMinutes}</Label>
                          <Input
                            type="number"
                            min="1"
                            value={settingsJitMinutes}
                            onChange={(e) => setSettingsJitMinutes(e.target.value)}
                            data-testid="input-jit-minutes"
                          />
                          <p className="text-xs text-muted-foreground">{s.schedJitNote}</p>
                        </div>
                        <Button
                          onClick={() => {
                            setSettingsScheduleMode("justInTime");
                            updateWebinar.mutate({
                              scheduleMode: { recurring: false, onDemand: false, justInTime: true, justInTimeMinutes: parseInt(settingsJitMinutes) || 15 },
                            });
                          }}
                          disabled={updateWebinar.isPending}
                          data-testid="button-save-jit"
                        >
                          {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {s.schedSaveJit}
                        </Button>
                      </div>
                    )}

                    {scheduleSubSection === "replays" && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold" data-testid="text-replays-title">{s.schedReplaysTitle}</h2>
                        <p className="text-sm text-muted-foreground">{s.schedReplaysDesc}</p>
                        <div className="flex items-center justify-between gap-2">
                          <Label>{s.schedEnableReplay}</Label>
                          <Switch
                            checked={settingsReplayEnabled}
                            onCheckedChange={setSettingsReplayEnabled}
                            data-testid="switch-replay-enabled"
                          />
                        </div>
                        {settingsReplayEnabled && (
                          <div className="space-y-2">
                            <Label>{s.schedReplayHours}</Label>
                            <Input
                              type="number"
                              min="1"
                              value={settingsReplayHours}
                              onChange={(e) => setSettingsReplayHours(e.target.value)}
                              data-testid="input-replay-hours"
                            />
                            <p className="text-xs text-muted-foreground">{s.schedReplayNote}</p>
                          </div>
                        )}
                        <Button
                          onClick={() => {
                            updateWebinar.mutate({
                              replayEnabled: settingsReplayEnabled,
                              replayAvailableHours: parseInt(settingsReplayHours) || 48,
                            });
                          }}
                          disabled={updateWebinar.isPending}
                          data-testid="button-save-replay"
                        >
                          {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {s.schedSaveReplay}
                        </Button>
                      </div>
                    )}

                    {scheduleSubSection === "sessionManagement" && (
                      <div className="space-y-6">
                        <h2 className="text-lg font-semibold" data-testid="text-session-mgmt-title">{s.schedSessionMgmtTitle}</h2>
                        <p className="text-sm text-muted-foreground">{s.schedSessionMgmtDesc}</p>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="datetime-local"
                            value={newSessionDate}
                            onChange={(e) => setNewSessionDate(e.target.value)}
                            data-testid="input-new-session-date"
                          />
                          <Button
                            onClick={async () => {
                              if (!newSessionDate) return;
                              try {
                                await apiRequest("POST", `/api/webinars/${id}/sessions`, {
                                  scheduledStart: new Date(newSessionDate).toISOString(),
                                });
                                queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "sessions"] });
                                setNewSessionDate("");
                                toast({ title: s.toastSessionAdded });
                              } catch (err: any) {
                                toast({ title: s.toastAddFailed, description: err.message, variant: "destructive" });
                              }
                            }}
                            disabled={!newSessionDate}
                            data-testid="button-add-session"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {s.schedAddSession}
                          </Button>
                        </div>

                        {webinarSessions && webinarSessions.length > 0 ? (
                          <div className="space-y-2">
                            {webinarSessions.map((session) => (
                              <div key={session.id} className="flex items-center justify-between gap-2 p-3 bg-muted rounded-md">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {new Date(session.scheduledStart).toLocaleString(lang, {
                                      year: "numeric", month: "2-digit", day: "2-digit",
                                      hour: "2-digit", minute: "2-digit",
                                    })}
                                  </span>
                                  <Badge variant={
                                    new Date(session.scheduledStart) > new Date() ? "default" : "secondary"
                                  }>
                                    {new Date(session.scheduledStart) > new Date() ? s.schedSessionUpcoming : s.schedSessionExpired}
                                  </Badge>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      await apiRequest("DELETE", `/api/webinars/${id}/sessions/${session.id}`);
                                      queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "sessions"] });
                                      toast({ title: s.toastSessionDeleted });
                                    } catch (err: any) {
                                      toast({ title: s.toastDeleteFailed, description: err.message, variant: "destructive" });
                                    }
                                  }}
                                  data-testid={`button-delete-session-${session.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">{s.schedNoSessions}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ===== Notifications Tab ===== */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {s.notifEmailTitle}
                  </CardTitle>
                  <CardDescription>{s.notifEmailDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label>{s.notifEmailConfirmation}</Label>
                      <Switch
                        checked={emailConfirmation}
                        onCheckedChange={setEmailConfirmation}
                        data-testid="switch-email-confirmation"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>{s.notifEmail24h}</Label>
                      <Switch
                        checked={emailReminder24h}
                        onCheckedChange={setEmailReminder24h}
                        data-testid="switch-email-24h"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>{s.notifEmail1h}</Label>
                      <Switch
                        checked={emailReminder1h}
                        onCheckedChange={setEmailReminder1h}
                        data-testid="switch-email-1h"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label>{s.notifEmailFollowUp}</Label>
                      <Switch
                        checked={emailFollowUp}
                        onCheckedChange={setEmailFollowUp}
                        data-testid="switch-email-followup"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{s.notifEmailSubject}</Label>
                    <Input
                      value={emailCustomSubject}
                      onChange={(e) => setEmailCustomSubject(e.target.value)}
                      placeholder={s.notifEmailSubjectPlaceholder}
                      data-testid="input-email-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{s.notifEmailTemplate}</Label>
                    <Textarea
                      value={emailCustomTemplate}
                      onChange={(e) => setEmailCustomTemplate(e.target.value)}
                      placeholder={s.notifEmailTemplatePlaceholder}
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
                    {s.notifSaveEmail}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      {s.notifWebhookTitle}
                    </CardTitle>
                    <CardDescription>{s.notifWebhookDesc}</CardDescription>
                  </div>
                  <Dialog open={isWebhookOpen} onOpenChange={setIsWebhookOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-webhook">
                        <Plus className="h-4 w-4 mr-1" />
                        {s.notifAddWebhook}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{s.notifWebhookDialogTitle}</DialogTitle>
                        <DialogDescription>{s.notifWebhookDialogDesc}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>{s.notifWebhookEventType}</Label>
                          <Select value={newWebhookEvent} onValueChange={setNewWebhookEvent}>
                            <SelectTrigger data-testid="select-webhook-event">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="registration">{s.notifWebhookRegistration}</SelectItem>
                              <SelectItem value="attendance">{s.notifWebhookAttendance}</SelectItem>
                              <SelectItem value="completion">{s.notifWebhookCompletion}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{s.notifWebhookTargetUrl}</Label>
                          <Input
                            value={newWebhookUrl}
                            onChange={(e) => setNewWebhookUrl(e.target.value)}
                            placeholder="https://example.com/webhook"
                            data-testid="input-webhook-url"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{s.notifWebhookSecret}</Label>
                          <Input
                            value={newWebhookSecret}
                            onChange={(e) => setNewWebhookSecret(e.target.value)}
                            placeholder={s.notifWebhookSecretPlaceholder}
                            data-testid="input-webhook-secret"
                          />
                        </div>
                        <Button
                          onClick={() => {
                            if (!newWebhookUrl) {
                              toast({ title: s.toastEnterTargetUrl, variant: "destructive" });
                              return;
                            }
                            createWebhook.mutate({
                              webinarId: id!,
                              eventType: newWebhookEvent,
                              targetUrl: newWebhookUrl,
                              secret: newWebhookSecret,
                              enabled: true,
                            });
                          }}
                          disabled={createWebhook.isPending || !newWebhookUrl}
                          data-testid="button-submit-webhook"
                        >
                          {createWebhook.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {s.btnCreate}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {webhooks && webhooks.length > 0 ? (
                    <div className="space-y-2">
                      {webhooks.map((hook) => (
                        <div key={hook.id} className="flex items-center justify-between p-3 bg-muted rounded-md gap-2" data-testid={`webhook-item-${hook.id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{hook.eventType}</Badge>
                              <Badge variant={hook.enabled ? "default" : "secondary"}>
                                {hook.enabled ? s.notifWebhookEnabled : s.notifWebhookDisabled}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{hook.targetUrl}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteWebhook.mutate(hook.id)}
                            data-testid={`button-delete-webhook-${hook.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">{s.notifNoWebhooks}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== Interactions Tab ===== */}
          <TabsContent value="interactions">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.interCtaTitle}</CardTitle>
                    <CardDescription>{s.interCtaDesc}</CardDescription>
                  </div>
                  <Dialog open={isCtaOpen} onOpenChange={setIsCtaOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-cta">
                        <Plus className="h-4 w-4 mr-1" />
                        {s.interAddCta}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{s.interCtaDialogTitle}</DialogTitle>
                      </DialogHeader>
                      <Form {...ctaForm}>
                        <form onSubmit={ctaForm.handleSubmit((data) => createCta.mutate(data))} className="space-y-4">
                          <FormField
                            control={ctaForm.control}
                            name="text"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{s.interCtaButtonText}</FormLabel>
                                <FormControl>
                                  <Input placeholder={s.interCtaButtonTextPlaceholder} {...field} />
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
                                <FormLabel>{s.interCtaLinkUrl}</FormLabel>
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
                                  <FormLabel>{s.interCtaStartTime}</FormLabel>
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
                                  <FormLabel>{s.interCtaEndTime}</FormLabel>
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
                                <FormLabel>{s.interCtaStyle}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="primary">{s.interCtaStylePrimary}</SelectItem>
                                    <SelectItem value="secondary">{s.interCtaStyleSecondary}</SelectItem>
                                    <SelectItem value="danger">{s.interCtaStyleDanger}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={createCta.isPending}>
                            {createCta.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {s.btnCreate}
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
                                {formatTime(cta.startTime)} - {cta.endTime ? formatTime(cta.endTime) : s.interCtaEnd}
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
                    <p className="text-center text-muted-foreground py-8">{s.interNoCtaButtons}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.interPollTitle}</CardTitle>
                    <CardDescription>{s.interPollDesc}</CardDescription>
                  </div>
                  <Dialog open={isPollOpen} onOpenChange={setIsPollOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-poll">
                        <Plus className="h-4 w-4 mr-1" />
                        {s.interAddPoll}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{s.interPollDialogTitle}</DialogTitle>
                      </DialogHeader>
                      <Form {...pollForm}>
                        <form onSubmit={pollForm.handleSubmit((data) => createPoll.mutate(data))} className="space-y-4">
                          <FormField
                            control={pollForm.control}
                            name="question"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{s.interPollQuestion}</FormLabel>
                                <FormControl>
                                  <Input placeholder={s.interPollQuestionPlaceholder} {...field} />
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
                                <FormLabel>{s.interPollOptions}</FormLabel>
                                <FormControl>
                                  <Input placeholder={s.interPollOptionsPlaceholder} {...field} />
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
                                  <FormLabel>{s.interPollTriggerTime}</FormLabel>
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
                                  <FormLabel>{s.interPollDuration}</FormLabel>
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
                            {s.btnCreate}
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
                    <p className="text-center text-muted-foreground py-8">{s.interNoPolls}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.interTipTitle}</CardTitle>
                    <CardDescription>{s.interTipDesc}</CardDescription>
                  </div>
                  <Dialog open={isTipOpen} onOpenChange={setIsTipOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-tip">
                        <Plus className="h-4 w-4 mr-1" />
                        {s.interAddTip}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{s.interTipDialogTitle}</DialogTitle>
                      </DialogHeader>
                      <Form {...tipForm}>
                        <form onSubmit={tipForm.handleSubmit((data) => createTip.mutate(data))} className="space-y-4">
                          <FormField
                            control={tipForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{s.interTipTitleLabel}</FormLabel>
                                <FormControl>
                                  <Input placeholder={s.interTipTitlePlaceholder} {...field} />
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
                                <FormLabel>{s.interTipContent}</FormLabel>
                                <FormControl>
                                  <Textarea placeholder={s.interTipContentPlaceholder} {...field} />
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
                                  <FormLabel>{s.interTipTriggerTime}</FormLabel>
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
                                  <FormLabel>{s.interTipDisplayDuration}</FormLabel>
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
                            {s.btnCreate}
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
                              <Badge variant="secondary">{tip.duration}{s.interTipSeconds}</Badge>
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
                    <p className="text-center text-muted-foreground py-8">{s.interNoTips}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{s.interFeedbackTitle}</CardTitle>
                  <CardDescription>{s.interFeedbackDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  {feedbackSurvey ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{feedbackSurvey.title}</span>
                        <Badge variant={feedbackSurvey.isActive ? "default" : "secondary"}>
                          {feedbackSurvey.isActive ? s.interFeedbackActive : s.interFeedbackInactive}
                        </Badge>
                      </div>
                      {feedbackSurvey.questions && (feedbackSurvey.questions as any[]).length > 0 && (
                        <div className="space-y-2">
                          {(feedbackSurvey.questions as any[]).map((q: any, i: number) => (
                            <div key={q.id || i} className="p-3 bg-muted rounded-md">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {q.type === "rating" ? s.interFeedbackRating : q.type === "text" ? s.interFeedbackText : s.interFeedbackChoice}
                                </Badge>
                                {q.required && <Badge variant="secondary" className="text-xs">{s.interFeedbackRequired}</Badge>}
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
                      <p className="text-muted-foreground mb-4">{s.interNoSurvey}</p>
                      <Button
                        size="sm"
                        onClick={() => {
                          apiRequest("POST", `/api/webinars/${id}/feedback-survey`, {
                            webinarId: id,
                            title: s.interDefaultSurveyTitle,
                            questions: [
                              { id: "q1", type: "rating", question: s.interDefaultQ1, required: true },
                              { id: "q2", type: "text", question: s.interDefaultQ2, required: false },
                              { id: "q3", type: "multiChoice", question: s.interDefaultQ3, options: [s.interDefaultOpt1, s.interDefaultOpt2, s.interDefaultOpt3, s.interDefaultOpt4], required: true },
                            ],
                            isActive: true,
                          }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ["/api/webinars", id, "feedback-survey"] });
                            toast({ title: s.toastDefaultSurveyCreated });
                          });
                        }}
                        data-testid="button-create-default-survey"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {s.interCreateDefaultSurvey}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {feedbackSurvey && feedbackResponses && feedbackResponses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{s.interFeedbackStatsTitle}</CardTitle>
                    <CardDescription>{s.totalResponsesPrefix}{feedbackResponses.length}{s.totalResponsesSuffix}</CardDescription>
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
                                  <span className="text-sm text-muted-foreground">/ 5 ({nums.length} {s.interFeedbackResponseCount})</span>
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
                    <p className="text-center text-muted-foreground">{s.interNoFeedbackResponses}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{s.interQaTitle}</CardTitle>
                  <CardDescription>{s.interQaDesc}</CardDescription>
                </CardHeader>
                <CardContent>
                  {questions && questions.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {questions.map((q) => (
                          <div key={q.id} className="p-3 bg-muted rounded-md" data-testid={`qa-item-${q.id}`}>
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{q.askerName || s.interQaAnonymous}</span>
                                <Badge variant={q.answer ? "secondary" : "outline"}>
                                  {q.answer ? s.interQaAnswered : s.interQaPending}
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
                                    {s.interQaReply}
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
                                  placeholder={s.interQaReplyPlaceholder}
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
                                  {s.interQaSubmit}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAnsweringQuestionId(null)}
                                >
                                  {s.btnCancel}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">{s.interNoQuestions}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== Chat Tab ===== */}
          <TabsContent value="chat">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.chatFakeUserTitle}</CardTitle>
                    <CardDescription>{s.chatFakeUserDesc}</CardDescription>
                  </div>
                  <Dialog open={isFakeUserOpen} onOpenChange={setIsFakeUserOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-fake-user">
                        <Plus className="h-4 w-4 mr-1" />
                        {s.chatAddFakeUser}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{s.chatFakeUserDialogTitle}</DialogTitle>
                      </DialogHeader>
                      <Form {...fakeUserForm}>
                        <form onSubmit={fakeUserForm.handleSubmit((data) => createFakeUser.mutate(data))} className="space-y-4">
                          <FormField
                            control={fakeUserForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{s.chatFakeUserName}</FormLabel>
                                <FormControl>
                                  <Input placeholder={s.chatFakeUserNamePlaceholder} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={createFakeUser.isPending}>
                            {createFakeUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {s.btnCreate}
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
                    <p className="text-center text-muted-foreground py-8">{s.chatNoFakeUsers}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.chatScheduledMsgTitle}</CardTitle>
                    <CardDescription>{s.chatScheduledMsgDesc}</CardDescription>
                  </div>
                  <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-scheduled-message">
                        <Plus className="h-4 w-4 mr-1" />
                        {s.chatAddMessage}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{s.chatMsgDialogTitle}</DialogTitle>
                      </DialogHeader>
                      <Form {...messageForm}>
                        <form onSubmit={messageForm.handleSubmit((data) => createMessage.mutate(data))} className="space-y-4">
                          <FormField
                            control={messageForm.control}
                            name="fakeUserId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{s.chatMsgSender}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={s.chatMsgSelectFakeUser} />
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
                                <FormLabel>{s.chatMsgContent}</FormLabel>
                                <FormControl>
                                  <Textarea placeholder={s.chatMsgContentPlaceholder} {...field} />
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
                                <FormLabel>{s.chatMsgTriggerTime}</FormLabel>
                                <FormControl>
                                  <Input placeholder="2:30" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={createMessage.isPending}>
                            {createMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {s.btnCreate}
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
                                  <span className="font-medium text-sm">{sender?.name || s.chatMsgUnknown}</span>
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
                    <p className="text-center text-muted-foreground py-8">{s.chatNoScheduledMessages}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== Registration Tab ===== */}
          <TabsContent value="registrations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{s.regTitle}</CardTitle>
                  <CardDescription>{s.regDesc}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/webinars/${id}/registrations/export`, "_blank")} data-testid="button-export-csv">
                  <Download className="h-4 w-4 mr-1" />
                  {s.regExportCsv}
                </Button>
              </CardHeader>
              <CardContent>
                {registrations && registrations.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {registrations.map((reg) => (
                        <div key={reg.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <div>
                            <p className="font-medium">{reg.name}</p>
                            {reg.phone && <p className="text-sm text-muted-foreground">{reg.phone}</p>}
                            <p className="text-sm text-muted-foreground">{reg.email}</p>
                            {(reg.utmSource || reg.utmMedium || reg.utmCampaign) && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {reg.utmSource && (
                                  <Badge variant="outline" className="text-xs">
                                    {s.regSource} {reg.utmSource}
                                  </Badge>
                                )}
                                {reg.utmMedium && (
                                  <Badge variant="outline" className="text-xs">
                                    {s.regMedium} {reg.utmMedium}
                                  </Badge>
                                )}
                                {reg.utmCampaign && (
                                  <Badge variant="outline" className="text-xs">
                                    {s.regCampaign} {reg.utmCampaign}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {new Date(reg.registeredAt!).toLocaleString(lang)}
                            </p>
                            {reg.attended && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                <Star className="h-3 w-3 mr-1" />
                                {s.regAttended}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">{s.regNoRegistrations}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Analytics Tab ===== */}
          <TabsContent value="analytics">
            {analytics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-total-registrations">{analytics.summary?.totalRegistrations || 0}</p>
                      <p className="text-xs text-muted-foreground">{s.analyticsRegistrations}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-attended">{analytics.summary?.attended || 0}</p>
                      <p className="text-xs text-muted-foreground">{s.analyticsAttended}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-attendance-rate">{analytics.summary?.attendanceRate?.toFixed(1) || 0}%</p>
                      <p className="text-xs text-muted-foreground">{s.analyticsAttendanceRate}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-avg-watch-time">{formatTime(analytics.summary?.avgWatchTime || 0)}</p>
                      <p className="text-xs text-muted-foreground">{s.analyticsAvgWatchTime}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-completion-rate">
                        {(() => {
                          const dur = analytics.summary?.videoDuration || 0;
                          if (!dur) return "0%";
                          const attended = analytics.registrations?.filter(r => r.attended) || [];
                          if (attended.length === 0) return "0%";
                          const completed = attended.filter(r => ((r.watchDuration || 0) / dur) >= 0.9).length;
                          return `${Math.round((completed / attended.length) * 100)}%`;
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.analyticsCompletionRate}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold" data-testid="text-avg-completion">
                        {(() => {
                          const dur = analytics.summary?.videoDuration || 0;
                          if (!dur) return "0%";
                          const attended = analytics.registrations?.filter(r => r.attended && r.watchDuration) || [];
                          if (attended.length === 0) return "0%";
                          const avg = attended.reduce((s, r) => s + Math.min(100, ((r.watchDuration || 0) / dur) * 100), 0) / attended.length;
                          return `${Math.round(avg)}%`;
                        })()}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.analyticsAvgCompletion}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{s.analyticsRegVsAttend}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const pieData = [
                          { name: s.analyticsAttendedLabel, value: analytics.summary?.attended || 0 },
                          { name: s.analyticsNotAttendedLabel, value: (analytics.summary?.totalRegistrations || 0) - (analytics.summary?.attended || 0) },
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
                          <p className="text-center text-muted-foreground py-8">{s.analyticsNoData}</p>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{s.analyticsWatchDuration}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const attendedRegs = analytics.registrations?.filter(r => r.attended && r.watchDuration) || [];
                        if (attendedRegs.length === 0) return <p className="text-center text-muted-foreground py-8">{s.analyticsNoData}</p>;
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
                              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={s.analyticsViewerCount} />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{s.analyticsRetention}</CardTitle>
                    <CardDescription>{s.analyticsRetentionDesc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const attendedRegs = analytics.registrations?.filter(r => r.attended && r.watchDuration) || [];
                      if (attendedRegs.length === 0) return <p className="text-center text-muted-foreground py-8">{s.analyticsNoData}</p>;
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
                            <Tooltip formatter={(val: number, name: string) => name === "retention" ? [`${val}%`, s.analyticsRetentionRate] : [val, s.analyticsViewerCount]} />
                            <Area type="monotone" dataKey="retention" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="retention" />
                          </AreaChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{s.analyticsViewerDetail}</CardTitle>
                    <CardDescription>{s.analyticsViewerDetailDesc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2">
                        {analytics.registrations?.filter((r) => r.attended).length === 0 && (
                          <p className="text-center text-muted-foreground py-4">{s.analyticsNoAttendance}</p>
                        )}
                        {analytics.registrations
                          ?.filter((r) => r.attended)
                          .sort((a, b) => (b.watchDuration || 0) - (a.watchDuration || 0))
                          .map((reg) => {
                          const dur = analytics.summary?.videoDuration || 0;
                          const pct = dur ? Math.min(100, Math.round(((reg.watchDuration || 0) / dur) * 100)) : 0;
                          const isCompleted = pct >= 90;
                          return (
                            <div key={reg.id} className="p-3 bg-muted rounded-md text-sm space-y-2" data-testid={`viewer-detail-${reg.id}`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">{reg.name}</span>
                                  {reg.phone && <span className="text-muted-foreground ml-2">{reg.phone}</span>}
                                  <span className="text-muted-foreground ml-2">{reg.email}</span>
                                </div>
                                <Badge variant={isCompleted ? "default" : "secondary"}>
                                  {isCompleted ? s.analyticsCompleted : `${s.analyticsWatchPct} ${pct}%`}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-background rounded-full h-2">
                                  <div className={`h-2 rounded-full ${isCompleted ? "bg-green-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-muted-foreground text-xs w-24 text-right shrink-0">
                                  {formatTime(reg.watchDuration || 0)}{dur ? ` / ${formatTime(dur)}` : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                {reg.attendedAt && (
                                  <span>{s.analyticsEntered} {new Date(reg.attendedAt).toLocaleString(lang, { hour: "2-digit", minute: "2-digit" })}</span>
                                )}
                                {reg.leftAt && (
                                  <span>{s.analyticsLeft} {new Date(reg.leftAt).toLocaleString(lang, { hour: "2-digit", minute: "2-digit" })}</span>
                                )}
                                {!isCompleted && dur > 0 && (
                                  <span>{s.analyticsDropOff} {formatTime(reg.watchDuration || 0)} {s.analyticsDropOffSuffix} ({pct}%)</span>
                                )}
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
                  <p className="text-center text-muted-foreground">{s.analyticsNoAnalytics}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== Settings Tab ===== */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{s.settingsWebinarInfo}</CardTitle>
                  <CardDescription>{s.settingsWebinarInfoDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{s.settingsTitle}</Label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder={s.placeholderTitle}
                      data-testid="input-settings-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{s.settingsDescription}</Label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder={s.placeholderDescription}
                      className="resize-none"
                      rows={3}
                      data-testid="input-settings-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{s.settingsVimeoUrl}</Label>
                    <Input
                      value={editVimeoUrl}
                      onChange={(e) => setEditVimeoUrl(e.target.value)}
                      placeholder={s.placeholderVimeoUrl}
                      data-testid="input-settings-vimeo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{s.settingsStartTime}</Label>
                    <Input
                      type="datetime-local"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      data-testid="input-settings-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{s.settingsCoverImage}</Label>
                    {editCoverImage ? (
                      <div className="relative rounded-md overflow-hidden border">
                        <img src={editCoverImage} alt={s.altCoverPreview} className="w-full h-32 object-cover" />
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                          onClick={() => setEditCoverImage("")}
                          data-testid="button-settings-remove-cover"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover-elevate"
                        onClick={() => coverFileRef.current?.click()}
                        data-testid="button-settings-upload-cover-area"
                      >
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{s.clickUploadCover}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        value={editCoverImage}
                        onChange={(e) => setEditCoverImage(e.target.value)}
                        placeholder={s.placeholderImageUrl}
                        className="flex-1 text-xs"
                        data-testid="input-settings-cover"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => coverFileRef.current?.click()}
                        disabled={uploadingCover}
                        data-testid="button-settings-upload-cover"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      const oldCover = webinar.coverImage;
                      const newCover = editCoverImage || null;
                      if (oldCover && oldCover.startsWith("/uploads/") && oldCover !== newCover) {
                        try {
                          await fetch("/api/upload", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: oldCover }),
                          });
                        } catch {}
                      }
                      updateWebinar.mutate({
                        title: editTitle,
                        description: editDescription || null,
                        vimeoUrl: editVimeoUrl,
                        startTime: new Date(editStartTime).toISOString(),
                        coverImage: newCover,
                      });
                    }}
                    disabled={updateWebinar.isPending || !editTitle || !editVimeoUrl}
                    data-testid="button-save-webinar-info"
                  >
                    {updateWebinar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {s.settingsSaveWebinarInfo}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    {s.settingsBrandTitle}
                  </CardTitle>
                  <CardDescription>{s.settingsBrandDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{s.settingsLogoUrl}</Label>
                    <Input
                      value={brandLogo}
                      onChange={(e) => setBrandLogo(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      data-testid="input-brand-logo"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{s.settingsPrimaryColor}</Label>
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
                      <Label>{s.settingsSecondaryColor}</Label>
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
                      <Label>{s.settingsBgColor}</Label>
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
                      <p className="text-xs text-muted-foreground mb-2">{s.settingsLogoPreview}</p>
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
                    {s.settingsSaveBrand}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {s.settingsLinksTitle}
                  </CardTitle>
                  <CardDescription>{s.settingsLinksDesc}</CardDescription>
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
                  <p className="text-xs text-muted-foreground">{s.settingsShareLink}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    {s.settingsEmbedRegTitle}
                  </CardTitle>
                  <CardDescription>{s.settingsEmbedRegDesc}</CardDescription>
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
                        toast({ title: s.toastEmbedCodeCopied });
                      }}
                      data-testid="button-copy-embed-register"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-xs text-muted-foreground">{s.settingsPreviewEffect}</p>
                    <div className="mt-2 border rounded-md overflow-hidden" style={{ maxWidth: 460 }}>
                      <iframe
                        src={`/embed/register/${id}`}
                        width="100%"
                        height="400"
                        style={{ border: "none" }}
                        title={s.settingsRegFormPreview}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{s.settingsEmbedWebinarTitle}</CardTitle>
                  <CardDescription>{s.settingsEmbedWebinarDesc}</CardDescription>
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
                        toast({ title: s.toastEmbedCodeCopied });
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
                  <CardTitle className="text-base">{s.settingsPopupTitle}</CardTitle>
                  <CardDescription>{s.settingsPopupDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">{s.settingsStep1Script}</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-script-code">{`<script src="${window.location.origin}/livecast-widget.js"></script>`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`<script src="${window.location.origin}/livecast-widget.js"></script>`);
                          toast({ title: s.toastScriptCodeCopied });
                        }}
                        data-testid="button-copy-embed-script"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">{s.settingsStep2Button}</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-button-code">{`<button data-livecast-register="${id}">${s.settingsRegisterNow}</button>`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`<button data-livecast-register="${id}">${s.settingsRegisterNow}</button>`);
                          toast({ title: s.toastButtonCodeCopied });
                        }}
                        data-testid="button-copy-embed-button"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">{s.settingsOrJsCall}</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all">{`ICTA_WEBINAR.openRegister("${id}");`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`ICTA_WEBINAR.openRegister("${id}");`);
                          toast({ title: s.toastCopiedSimple });
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
                  <CardTitle className="text-base">{s.settingsInlineTitle}</CardTitle>
                  <CardDescription>{s.settingsInlineDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">{s.settingsStep1Script}</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-inline-script">{`<script src="${window.location.origin}/livecast-widget.js"></script>`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`<script src="${window.location.origin}/livecast-widget.js"></script>`);
                          toast({ title: s.toastScriptCodeCopied });
                        }}
                        data-testid="button-copy-inline-script"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">{s.settingsStep2Container}</p>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-inline-div">{`<div data-livecast-inline-register="${id}"></div>`}</pre>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`<div data-livecast-inline-register="${id}"></div>`);
                          toast({ title: s.toastInlineCodeCopied });
                        }}
                        data-testid="button-copy-inline-div"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.settingsInlineNote}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
