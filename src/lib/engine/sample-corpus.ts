import type { DataOrigin } from "@/lib/types";
import { offsetFromNow } from "./dates";

/** A raw document as collected — before normalization, dedupe and scoring. */
export interface RawDocument {
  docId: string;
  sourceId: string;
  title: string;
  url: string;
  publishedAt: string;
  text: string;
  author?: string;
  dataOrigin: DataOrigin;
}

interface Seed {
  docId: string;
  sourceId: string;
  title: string;
  /** hours ago relative to "now" so the demo never looks frozen in time */
  hoursAgo: number;
  text: string;
  author?: string;
  url?: string;
}

const SEEDS: Seed[] = [
  // ---------- 政策线：学生票 30 天预约 ----------
  {
    docId: "doc-policy-student-notice",
    sourceId: "src-01",
    title: "关于优化学生票预约购票服务的通知",
    hoursAgo: 30,
    url: "https://www.12306.cn/index/",
    text: "为进一步优化学生旅客购票体验，自本月起，学生票预约购票功能新增开学季预约通道。学生旅客可在乘车日期前 30 天内提交预约申请，较此前的 15 天提前期延长一倍。预约成功后系统将在放票时自动提交订单，未预约成功的学生仍可参与常规抢票。各铁路局集团公司要做好车站窗口与客服口径的同步。",
  },
  {
    docId: "doc-policy-student-syndicated",
    sourceId: "src-02",
    title: "学生票预约购票提前期调整为 30 天",
    hoursAgo: 26,
    url: "https://www.china-railway.com.cn/",
    text: "国铁集团转发铁路部门通知：学生票预约购票新增开学季预约通道，学生旅客可在乘车日期前 30 天内提交预约申请，较此前的 15 天提前期延长一倍。预约成功后系统将在放票时自动提交订单，未预约成功的学生仍可参与常规抢票。",
  },
  {
    docId: "doc-policy-student-wechat",
    sourceId: "src-06",
    title: "开学季学生票怎么约？一张图看懂 30 天预约",
    hoursAgo: 20,
    url: "https://mp.weixin.qq.com/",
    author: "12306 客服中心",
    text: "很多同学问：预约是不是等于买到了？不是。预约只是把你的需求提前排队，放票时系统按顺序自动提交。乘车日期前 30 天内都可以提交预约申请，开学季高峰期建议提前 20 天以上。学生资质每学年需要核验一次，核验不通过会直接影响预约。",
  },
  {
    docId: "doc-sentiment-student-xhs",
    sourceId: "src-13",
    title: "小红书：学生票 30 天预约攻略（收藏 1.2 万）",
    hoursAgo: 16,
    url: "https://www.xiaohongshu.com/",
    text: "开学季学生票预约通道已经开了，提前期从 15 天变成 30 天。笔记整理了三步：先做学生资质核验、再选乘车日期提交预约、最后盯放票时间。评论区高频问题：预约失败会不会影响正常抢票、资质核验要多久、能不能改签。近 48 小时相关笔记 128 篇。",
  },
  {
    docId: "doc-sentiment-student-weibo",
    sourceId: "src-14",
    title: "微博：学生票预约提前 30 天，评论区吵翻了",
    hoursAgo: 12,
    url: "https://weibo.com/",
    text: "话题阅读量 420 万。支持的一方认为提前 30 天能缓解开学季抢票焦虑；质疑的一方担心预约名额不透明、预约失败后还要重新抢。也有用户反映学生资质核验入口藏得深，找不到在哪里做核验。",
  },
  {
    docId: "doc-internal-student-tickets",
    sourceId: "src-17",
    title: "客服工单聚合：学生票预约咨询 3 日 41 单",
    hoursAgo: 8,
    url: "internal://cs-tickets",
    text: "近 3 日 41 单咨询集中在三个问题：预约是否等于购票成功（21 单）、学生资质核验入口在哪（12 单）、预约后能否改签（8 单）。典型话术：页面只写了预约成功，没说还要抢；核验入口在个人中心第三层，用户找不到。",
  },
  // ---------- 冲突样本：低权威自媒体的错误数字 ----------
  {
    docId: "doc-conflict-student-rumor",
    sourceId: "src-15",
    title: "B站 UP 主：学生票预约提前期延长到 60 天？（未证实）",
    hoursAgo: 14,
    url: "https://www.bilibili.com/",
    text: "视频称学生票预约购票提前期将延长至 60 天，并称已经内部确认。评论区大量用户信以为真。该说法未在 12306 官网或国铁集团任何公告中出现，与官方 30 天口径不一致。",
  },
  // ---------- 政策线：儿童票 ----------
  {
    docId: "doc-policy-child-rule",
    sourceId: "src-06",
    title: "儿童票到底怎么算？年龄与身高双标准再说明",
    hoursAgo: 44,
    url: "https://mp.weixin.qq.com/",
    text: "儿童票按实际乘车儿童年龄与身高双重标准判定：6 周岁以下且身高不超过 1.2 米免票；6 至 14 周岁购买儿童优惠票；身高超过 1.5 米但未满 14 周岁的，凭年龄证明仍可购买儿童优惠票。购票时需填写同行儿童信息，进站核验以证件年龄为准。",
  },
  {
    docId: "doc-internal-child-tickets",
    sourceId: "src-17",
    title: "客服工单聚合：儿童票下单页价格不一致 7 日 18 单",
    hoursAgo: 18,
    url: "internal://cs-tickets",
    text: "7 日 18 单反馈下单页先显示儿童全价、填写身高后才变成优惠价，用户以为被多收钱。典型话术：为什么填完身高价格突然变了、页面没有任何提示。建议在价格区直接展示判定依据。",
  },
  {
    docId: "doc-sentiment-child-weibo",
    sourceId: "src-14",
    title: "微博：带娃坐高铁，儿童票规则看不懂",
    hoursAgo: 36,
    url: "https://weibo.com/",
    text: "讨论量 96 万。家长普遍反映年龄和身高两个标准记不住，1.2 米、1.5 米、6 周岁、14 周岁四个数字容易混淆；也有人反映同一单里两个孩子一个免票一个半价，页面没有解释。",
  },
  // ---------- 政策线：退改签 / 规程修订 ----------
  {
    docId: "doc-policy-regulation-draft",
    sourceId: "src-03",
    title: "《铁路旅客运输规程（修订征求意见稿）》公开征求意见",
    hoursAgo: 52,
    url: "https://www.mot.gov.cn/",
    text: "征求意见稿对退票、改签、儿童票、行李等条款作出调整，反馈截止日期为本月末。其中退票手续费分档表述改为按开车前时间区间计算，并要求售票渠道在支付前明示退改签规则。意见可通过官网提交。",
  },
  {
    docId: "doc-internal-refund-tickets",
    sourceId: "src-17",
    title: "客服工单聚合：退票手续费说明不清 7 日 32 单",
    hoursAgo: 40,
    url: "internal://cs-tickets",
    text: "近 7 日 32 单涉及退票手续费不清晰。典型话术：页面写 5%，实际扣了 20%；开车前 48 小时和 24 小时的分档看不懂。多数用户在支付后才发现规则，退款到账后才知道扣了多少。",
  },
  {
    docId: "doc-sentiment-refund-bilibili",
    sourceId: "src-15",
    title: "B站：三分钟看懂退改签手续费（播放 12 万）",
    hoursAgo: 34,
    url: "https://www.bilibili.com/",
    text: "视频播放 12 万，弹幕和评论高频出现根本没写清楚、每次退票都被扣一笔、分档规则全靠猜。评论区有用户贴出自己退票被扣 20% 的截图，与页面 5% 的提示不一致。",
  },
  // ---------- 竞品：规则助手 / 退票费预估 / 学生认证 ----------
  {
    docId: "doc-competitor-ctrip",
    sourceId: "src-08",
    title: "携程火车票「规则助手」升级：退票费一键估算",
    hoursAgo: 28,
    url: "https://trains.ctrip.com/",
    text: "携程火车票规则助手升级，支持退票手续费一键估算、儿童票场景化解释、学生票资质自动识别。下单页在价格旁直接给出不同时间退票的费用预览，并在支付前展示规则摘要。",
  },
  {
    docId: "doc-competitor-qunar",
    sourceId: "src-09",
    title: "去哪儿火车票新增「退票费预估」入口",
    hoursAgo: 48,
    url: "https://train.qunar.com/",
    text: "去哪儿火车票下单页新增退票费预估入口，用户可查看开车前 8 天、48 小时、24 小时等不同分档下的手续费，并在订单详情页保留预估记录。产品说明称目标是降低退票纠纷。",
  },
  {
    docId: "doc-competitor-fliggy",
    sourceId: "src-10",
    title: "飞猪上线学生资质自动核验，支持开学季预约提醒",
    hoursAgo: 60,
    url: "https://www.fliggy.com/",
    text: "飞猪火车票上线学生资质自动核验，接入学信网数据，核验通过后自动提醒开学季预约时间窗。同时提供预约失败后的替代方案推荐，包括临近车次与中转方案。",
  },
  {
    docId: "doc-competitor-appstore-invoice",
    sourceId: "src-11",
    title: "App Store 评论：电子发票入口找不到（近 7 日 21 条）",
    hoursAgo: 22,
    url: "https://apps.apple.com/cn/app/id564818797",
    text: "近 7 日 21 条评论提到发票入口在哪、找了半天开不出发票，相关评论平均评分 2.3。有用户建议把开发票放到订单详情首屏，而不是藏在售后入口里。",
  },
  {
    docId: "doc-competitor-app-version",
    sourceId: "src-07",
    title: "12306 App 版本更新说明（候补反馈与发票入口优化）",
    hoursAgo: 66,
    url: "https://apps.apple.com/cn/app/id564818797",
    text: "新版本更新包含：优化候补购票排队反馈、优化电子发票入口、修复部分机型闪退。更新说明未提及退改签规则展示的调整。",
  },
  // ---------- 舆情：候补失败 ----------
  {
    docId: "doc-sentiment-waiting-weibo",
    sourceId: "src-14",
    title: "微博话题：候补失败到底算不算提交成功（48 小时 1800+）",
    hoursAgo: 10,
    url: "https://weibo.com/",
    text: "近 48 小时候补失败话题讨论量 1800+。用户不理解为什么显示提交成功、排队中，最后却通知候补失败；也有人反映候补失败后抢票金没有立刻退回。话题下大量晒图与客服对话截图。",
  },
  {
    docId: "doc-sentiment-waiting-heimao",
    sourceId: "src-16",
    title: "黑猫投诉：候补失败未及时退款（3 日 14 单）",
    hoursAgo: 15,
    url: "https://tousu.sina.com.cn/",
    text: "近 3 日 14 起投诉指向候补购票失败后未及时退款、候补失败但抢票金被冻结。投诉人诉求集中在退款时效与失败原因说明，部分用户要求提供候补排队位次。",
  },
  {
    docId: "doc-internal-research-waiting",
    sourceId: "src-18",
    title: "用户调研：候补流程满意度 2.9 分（10 分制）",
    hoursAgo: 70,
    url: "internal://research",
    text: "本周回收 216 份问卷，候补购票流程满意度 2.9 分。主要扣分项：不知道自己在队列第几位、失败原因只有一句系统繁忙、退款到账时间不明确。",
  },
  // ---------- 舆情：稳定性 ----------
  {
    docId: "doc-sentiment-crash-tencent",
    sourceId: "src-12",
    title: "应用宝评论：支付环节闪退（近 3 日 9 条）",
    hoursAgo: 58,
    url: "https://sj.qq.com/",
    text: "近 3 日 9 条评论反映在支付环节闪退，集中在两个安卓机型。用户反映重新进入后订单状态仍显示待支付，需要重新下单。",
  },
  // ---------- 过期样本：用来演示新鲜度衰减 ----------
  {
    docId: "doc-stale-policy-2023",
    sourceId: "src-05",
    title: "某站临时停运公告（历史存档）",
    hoursAgo: 240,
    url: "https://www.china-railway.com.cn/",
    text: "因设备检修，某站部分列车临时停运，已购票旅客可全额退票。该公告为历史存档，当前已恢复运行。",
  },
];

/** Deterministic sample corpus. dataOrigin is always `sample` — never presented as live data. */
export function buildSampleCorpus(now = new Date()): RawDocument[] {
  return SEEDS.map((seed) => ({
    docId: seed.docId,
    sourceId: seed.sourceId,
    title: seed.title,
    url: seed.url ?? "internal://sample",
    publishedAt: offsetFromNow(seed.hoursAgo, now),
    text: seed.text,
    author: seed.author,
    dataOrigin: "sample" as DataOrigin,
  }));
}
