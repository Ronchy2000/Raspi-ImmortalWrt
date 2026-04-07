import Link from "next/link";

import LocalePreferenceLink from "@/components/LocalePreferenceLink";
import { DocLocale, DocMeta, docHrefFromKey, getAllDocs, homeHref } from "@/lib/docs";

function isCatalogVisible(docKey: string): boolean {
  if (docKey.startsWith("changelogs/") && docKey !== "changelogs/README") {
    return false;
  }
  return true;
}

function isDatedChangelog(docKey: string): boolean {
  return /^changelogs\/\d{4}-\d{2}-\d{2}$/.test(docKey);
}

function changelogDateLabel(docKey: string): string | null {
  const match = docKey.match(/^changelogs\/(\d{4}-\d{2}-\d{2})$/);
  return match?.[1] ?? null;
}

function groupName(docKey: string): string {
  if (docKey === "README" || docKey === "docs/Write_Image") return "onboarding";
  if (
    docKey === "docs/Lan_Connectioin" ||
    docKey === "docs/PPPoE_Connection" ||
    docKey === "docs/Openclash_Config"
  ) {
    return "network";
  }
  if (
    docKey === "docs/OpenWrt_Backup_Resotre" ||
    docKey === "docs/OpenWrt_AutoBackup" ||
    docKey === "docs/System_Maintenance" ||
    docKey === "docs/ExtendOverlaySize" ||
    docKey === "docs/Storage_Expansion_Guide"
  ) {
    return "maintenance";
  }
  if (docKey === "scripts/README" || docKey === "changelogs/README") return "updates";
  return "other";
}

type GroupMeta = {
  label: string;
  description: string;
  tone: "start" | "guide" | "log" | "script" | "other";
  rank: number;
};

type HeroBadge = {
  href: string;
  src: string;
  alt: string;
};

const HERO_BADGES: Record<DocLocale, HeroBadge[]> = {
  zh: [
    {
      href: "https://immortalwrt.org/",
      src: "https://img.shields.io/badge/ImmortalWrt-24.10.3-2d75c9.svg",
      alt: "ImmortalWrt 24.10.3"
    },
    {
      href: "https://www.raspberrypi.org/",
      src: "https://img.shields.io/badge/Device-Raspberry%20Pi%204B%2F400%2FCM4-c73a3a.svg",
      alt: "Raspberry Pi 4B/400/CM4"
    },
    {
      href: "https://opensource.org/licenses/MIT",
      src: "https://img.shields.io/badge/License-MIT-cf9931.svg",
      alt: "MIT License"
    },
    {
      href: "https://github.com/Ronchy2000/Raspi-ImmortalWrt",
      src: "https://img.shields.io/badge/%E7%8A%B6%E6%80%81-%E6%8C%81%E7%BB%AD%E7%BB%B4%E6%8A%A4-2b8a7e.svg",
      alt: "状态 持续维护"
    }
  ],
  en: [
    {
      href: "https://immortalwrt.org/",
      src: "https://img.shields.io/badge/ImmortalWrt-24.10.3-2d75c9.svg",
      alt: "ImmortalWrt 24.10.3"
    },
    {
      href: "https://www.raspberrypi.org/",
      src: "https://img.shields.io/badge/Device-Raspberry%20Pi%204B%2F400%2FCM4-c73a3a.svg",
      alt: "Raspberry Pi 4B/400/CM4"
    },
    {
      href: "https://opensource.org/licenses/MIT",
      src: "https://img.shields.io/badge/License-MIT-cf9931.svg",
      alt: "MIT License"
    },
    {
      href: "https://github.com/Ronchy2000/Raspi-ImmortalWrt",
      src: "https://img.shields.io/badge/Status-Actively%20Maintained-2b8a7e.svg",
      alt: "Actively Maintained"
    }
  ]
};

const GROUP_META: Record<DocLocale, Record<string, GroupMeta>> = {
  zh: {
    onboarding: { label: "开始使用", description: "从固件烧录到项目总览", tone: "start", rank: 0 },
    network: { label: "网络与代理", description: "LAN/拨号接入与 OpenClash 配置", tone: "guide", rank: 1 },
    maintenance: { label: "备份与维护", description: "备份策略、恢复流程和系统维护", tone: "log", rank: 2 },
    updates: { label: "脚本与更新", description: "部署脚本说明与更新日志索引", tone: "script", rank: 3 },
    other: { label: "其他文档", description: "补充资料", tone: "other", rank: 9 }
  },
  en: {
    onboarding: { label: "Getting Started", description: "Project overview and firmware flashing", tone: "start", rank: 0 },
    network: { label: "Network and Proxy", description: "LAN/PPPoE setup and OpenClash configuration", tone: "guide", rank: 1 },
    maintenance: { label: "Backup and Maintenance", description: "Backup strategy, restore flow, and maintenance", tone: "log", rank: 2 },
    updates: { label: "Scripts and Updates", description: "Script usage and changelog index", tone: "script", rank: 3 },
    other: { label: "Others", description: "Additional documents", tone: "other", rank: 9 }
  }
};

const COPY = {
  zh: {
    eyebrow: "Raspberry Pi + ImmortalWrt",
    title: "树莓派 ImmortalWrt 全流程文档站",
    lead: "从固件烧录、网络接入到 OpenClash、备份恢复与存储扩容，按真实使用场景拆分，并明确区分 `opkg` 与 `apk` 路线。",
    primary: "查看中文总览",
    secondary: "Read in English",
    tag1: "浏览器语言自动识别",
    tag2: "文档与前端同步更新",
    tag3: "先判断版本，再执行命令",
    points: [
      "覆盖从刷机、联网到插件配置的完整路径。",
      "提供智能备份、恢复、维护与排错方案。",
      "中文/英文独立浏览，不再混排。"
    ],
    quickTitle: "快速入口",
    latestTitle: "最近更新",
    latestEmpty: "暂无更新日志",
    splitTitle: "先判断你的系统分支",
    splitDesc: "现在很多教程失效，不是步骤错了，而是包管理器已经变了。仓库里的新版文档都会先分清 `24.10-` 和 `25.12+`，再给出对应命令。",
    splitStableTitle: "24.10 及更早稳定版",
    splitStableDesc: "继续使用 `opkg`。旧教程大多还是按这条路线写的。",
    splitNextTitle: "25.12 及更新版本",
    splitNextDesc: "改用 `apk`。不要再直接照抄旧的 `opkg install`。",
    splitAction: "查看 OpenClash 新手册",
    pathsTitle: "推荐阅读路径",
    pathsDesc: "按你当前想解决的问题进入，不用从头到尾硬读一遍。",
    metricGuides: "配置文档",
    metricGuidesDesc: "覆盖烧录、网络、维护与扩容",
    metricScripts: "自动化脚本",
    metricScriptsDesc: "备份与运维脚本说明",
    metricLogs: "更新记录",
    metricLogsDesc: "包含 docs/scripts/frontend 变更",
    firmwareTitle: "ImmortalWrt-Raspberry Pi 4B/400/CM4 (64bit) Latest",
    firmwareLead: "固件版本说明（Firmware Version Description）",
    firmwareAction: "前往 Releases 下载",
    ext4Title: "EXT4 版本",
    ext4Desc:
      "完整覆盖安装，会清除所有现有配置。适合首次安装或需要完全重置系统。支持更大的存储空间和更好的数据恢复能力，但刷机后需重新配置。",
    squashTitle: "SQUASHFS 版本",
    squashDesc:
      "增量更新安装，保留用户已有配置。适合已配置好系统仅需升级固件的用户。占用更小、启动更快，但存储容量有限。",
    tocTitle: "文档目录",
    tocDesc: "按用途分组浏览，点击标题进入完整文档页面。",
    count: "篇"
  },
  en: {
    eyebrow: "Raspberry Pi + ImmortalWrt",
    title: "Raspberry Pi ImmortalWrt Docs Hub",
    lead: "From firmware flashing and network onboarding to OpenClash, backup/restore, and storage expansion, now rewritten around the `opkg` / `apk` split.",
    primary: "Read English Overview",
    secondary: "查看中文",
    tag1: "Browser language auto-detection",
    tag2: "Frontend and Markdown stay in sync",
    tag3: "Version first, commands second",
    points: [
      "Covers the full path from flashing to network and plugin setup.",
      "Includes backup, restore, maintenance, and troubleshooting workflows.",
      "Chinese and English views are separated for clean reading."
    ],
    quickTitle: "Quick Access",
    latestTitle: "Latest Updates",
    latestEmpty: "No changelog entries yet",
    splitTitle: "Identify your OpenWrt branch first",
    splitDesc: "Many older tutorials break not because the feature changed, but because the package manager changed. The updated docs now split the workflow before showing commands.",
    splitStableTitle: "24.10 and earlier stable releases",
    splitStableDesc: "Still use `opkg`. Most older tutorials assume this path.",
    splitNextTitle: "25.12 and newer",
    splitNextDesc: "Use `apk`. Do not keep copying old `opkg install` commands.",
    splitAction: "Open the new OpenClash guide",
    pathsTitle: "Recommended reading paths",
    pathsDesc: "Jump straight to the problem you are solving instead of reading everything linearly.",
    metricGuides: "Guides",
    metricGuidesDesc: "Flashing, network, maintenance, and expansion",
    metricScripts: "Scripts",
    metricScriptsDesc: "Automation and backup tooling docs",
    metricLogs: "Changelog Items",
    metricLogsDesc: "Tracks docs/scripts/frontend updates",
    firmwareTitle: "ImmortalWrt-Raspberry Pi 4B/400/CM4 (64bit) Latest",
    firmwareLead: "Firmware Version Description",
    firmwareAction: "Open Releases",
    ext4Title: "EXT4 Version",
    ext4Desc:
      "Complete installation that erases existing configurations. Best for first-time installation or full reset. Supports larger storage and better recovery, but requires reconfiguration after flashing.",
    squashTitle: "SQUASHFS Version",
    squashDesc:
      "Incremental update that keeps user configurations. Ideal for users who only need firmware upgrades. Smaller footprint and faster boot, but limited writable storage.",
    tocTitle: "Document Catalog",
    tocDesc: "Browse by category and open the full document with one click.",
    count: "docs"
  }
} as const;

const FEATURED_PATHS: Record<
  DocLocale,
  Array<{ key: string; label: string; description: string }>
> = {
  zh: [
    {
      key: "README",
      label: "第一次搭建",
      description: "从固件、连接方式到最基础的联网路径。"
    },
    {
      key: "docs/Openclash_Config",
      label: "代理与分流",
      description: "新版 OpenClash 教程，已区分 `opkg` / `apk`。"
    },
    {
      key: "docs/OpenWrt_Backup_Resotre",
      label: "备份与恢复",
      description: "换卡、迁移系统、恢复插件前先看这篇。"
    },
    {
      key: "docs/Storage_Expansion_Guide",
      label: "存储与扩容",
      description: "判断 `ext4`、`squashfs`、数据分区和 extroot。"
    }
  ],
  en: [
    {
      key: "README",
      label: "First-Time Setup",
      description: "Start from firmware, connection mode, and basic network onboarding."
    },
    {
      key: "docs/Openclash_Config",
      label: "Proxy and Routing",
      description: "Updated OpenClash guide with `opkg` / `apk` split."
    },
    {
      key: "docs/OpenWrt_Backup_Resotre",
      label: "Backup and Restore",
      description: "Read this before migration, card swap, or recovery."
    },
    {
      key: "docs/Storage_Expansion_Guide",
      label: "Storage and Expansion",
      description: "Choose between `ext4`, `squashfs`, data partition, and extroot."
    }
  ]
};

function sortChangelogs(list: DocMeta[]): DocMeta[] {
  return [...list].sort((a, b) => {
    const aDate = changelogDateLabel(a.key);
    const bDate = changelogDateLabel(b.key);
    if (aDate && bDate) {
      return bDate.localeCompare(aDate);
    }
    return b.mtimeMs - a.mtimeMs;
  });
}

export default async function HomePage({ locale }: { locale: DocLocale }) {
  const allDocs = await getAllDocs(locale);
  const docs = allDocs.filter((doc) => isCatalogVisible(doc.key));
  const groups = new Map<string, typeof docs>();
  const metaMap = GROUP_META[locale];
  const text = COPY[locale];
  const badges = HERO_BADGES[locale];

  for (const doc of docs) {
    const group = groupName(doc.key);
    const list = groups.get(group) ?? [];
    list.push(doc);
    groups.set(group, list);
  }

  const orderedGroups = [...groups.entries()].sort((a, b) => {
    const aMeta = metaMap[a[0]] ?? metaMap.other;
    const bMeta = metaMap[b[0]] ?? metaMap.other;
    const rankDiff = aMeta.rank - bMeta.rank;
    return rankDiff !== 0 ? rankDiff : a[0].localeCompare(b[0], locale === "zh" ? "zh-CN" : "en-US");
  });

  const readmeKey = "README";
  const lanKey = "docs/Lan_Connectioin";
  const openclashKey = "docs/Openclash_Config";
  const backupKey = "docs/OpenWrt_Backup_Resotre";
  const quickLinks = [lanKey, openclashKey, backupKey]
    .map((key) => docs.find((doc) => doc.key === key))
    .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc));

  const latestLogs = sortChangelogs(allDocs.filter((doc) => isDatedChangelog(doc.key))).slice(0, 3);
  const guideCount = docs.filter((doc) => doc.key === "README" || doc.key.startsWith("docs/")).length;
  const scriptCount = docs.filter((doc) => doc.key.startsWith("scripts/")).length;
  const changelogCount = allDocs.filter((doc) => isDatedChangelog(doc.key)).length;
  const metrics = [
    { label: text.metricGuides, value: guideCount, description: text.metricGuidesDesc },
    { label: text.metricScripts, value: scriptCount, description: text.metricScriptsDesc },
    { label: text.metricLogs, value: changelogCount, description: text.metricLogsDesc }
  ];
  const featuredPaths = FEATURED_PATHS[locale]
    .map((item) => {
      const doc = docs.find((entry) => entry.key === item.key);
      if (!doc) return null;
      return { ...item, doc };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const otherLocale = locale === "zh" ? "en" : "zh";

  return (
    <section className="home">
      <div className="hero-panel">
        <div className="hero-main">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="lead">{text.lead}</p>

          <div className="badge-strip" aria-label="Project badges">
            {badges.map((badge) => (
              <a key={badge.src} href={badge.href} target="_blank" rel="noreferrer noopener">
                <img src={badge.src} alt={badge.alt} />
              </a>
            ))}
          </div>

          <div className="hero-actions">
            <Link href={docHrefFromKey(readmeKey, locale)} className="primary-btn">
              {text.primary}
            </Link>
            <LocalePreferenceLink href={homeHref(otherLocale)} locale={otherLocale} className="secondary-btn">
              {text.secondary}
            </LocalePreferenceLink>
          </div>

          <ul className="hero-points">
            {text.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <div className="hero-tags">
            <span>{text.tag1}</span>
            <span>{text.tag2}</span>
            <span>{text.tag3}</span>
          </div>
        </div>

        <aside className="hero-side">
          <section className="hero-side-block">
            <h2>{text.quickTitle}</h2>
            <ul>
              {quickLinks.map((doc) => (
                <li key={doc.key}>
                  <Link href={docHrefFromKey(doc.key, locale)}>{doc.title}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="hero-side-block">
            <h2>{text.latestTitle}</h2>
            <ul className="update-links">
              {latestLogs.length === 0 ? (
                <li className="empty-note">{text.latestEmpty}</li>
              ) : (
                latestLogs.map((doc) => (
                  <li key={doc.key}>
                    <span>{changelogDateLabel(doc.key)}</span>
                    <Link href={docHrefFromKey(doc.key, locale)}>{doc.title}</Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </aside>
      </div>

      <section className="value-grid">
        {metrics.map((item) => (
          <article key={item.label} className="value-card">
            <p>{item.label}</p>
            <h3>{item.value}</h3>
            <small>{item.description}</small>
          </article>
        ))}
      </section>

      <section className="split-panel">
        <div className="split-copy">
          <p className="section-kicker">OpenWrt Version Split</p>
          <h2>{text.splitTitle}</h2>
          <p>{text.splitDesc}</p>
          <Link href={docHrefFromKey(openclashKey, locale)} className="primary-btn split-btn">
            {text.splitAction}
          </Link>
        </div>

        <div className="split-grid">
          <article className="split-card stable">
            <span>Stable</span>
            <h3>{text.splitStableTitle}</h3>
            <p>{text.splitStableDesc}</p>
            <strong>opkg</strong>
          </article>
          <article className="split-card next">
            <span>Current</span>
            <h3>{text.splitNextTitle}</h3>
            <p>{text.splitNextDesc}</p>
            <strong>apk</strong>
          </article>
        </div>
      </section>

      <section className="path-section">
        <div className="section-head">
          <h2>{text.pathsTitle}</h2>
          <p>{text.pathsDesc}</p>
        </div>

        <div className="path-grid">
          {featuredPaths.map((item, index) => (
            <article key={item.key} className="path-card" style={{ animationDelay: `${index * 70}ms` }}>
              <p>{item.label}</p>
              <h3>
                <Link href={docHrefFromKey(item.doc.key, locale)}>{item.doc.title}</Link>
              </h3>
              <span>{item.description}</span>
              <small>{item.doc.repoPath}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="firmware-panel">
        <header className="firmware-head">
          <div>
            <p>{text.firmwareLead}</p>
            <h2>{text.firmwareTitle}</h2>
          </div>
          <a
            className="secondary-btn firmware-link"
            href="https://github.com/Ronchy2000/Raspi-ImmortalWrt/releases"
            target="_blank"
            rel="noreferrer noopener"
          >
            {text.firmwareAction}
          </a>
        </header>

        <div className="firmware-grid">
          <article className="firmware-card ext4">
            <h3>{text.ext4Title}</h3>
            <p>{text.ext4Desc}</p>
          </article>
          <article className="firmware-card squashfs">
            <h3>{text.squashTitle}</h3>
            <p>{text.squashDesc}</p>
          </article>
        </div>
      </section>

      <div className="section-head">
        <h2>{text.tocTitle}</h2>
        <p>{text.tocDesc}</p>
      </div>

      <div className="group-grid">
        {orderedGroups.map(([group, items], index) => {
          const meta = metaMap[group] ?? metaMap.other;
          return (
            <section
              key={group}
              className={`group-card tone-${meta.tone}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <header className="group-header">
                <div>
                  <h3>{meta.label}</h3>
                  <p>{meta.description}</p>
                </div>
                <span>
                  {items.length} {text.count}
                </span>
              </header>

              <ul className="doc-list">
                {items.map((doc) => (
                  <li key={doc.key} className="doc-item">
                    <Link href={docHrefFromKey(doc.key, locale)} className="doc-link">
                      {doc.title}
                    </Link>
                    <p>{doc.summary}</p>
                    <small>{doc.repoPath}</small>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
