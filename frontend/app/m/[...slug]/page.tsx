import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import MarkdownView from "@/components/MarkdownView";
import {
  createMarkdownResolvers,
  docHrefFromKey,
  getAllDocs,
  getAvailableLocalesForKey,
  getDocByKey,
  homeHref
} from "@/lib/docs";

type DocPageProps = {
  params: { slug: string[] };
};

function decodeSegments(slug: string[]): string {
  return slug.map((segment) => decodeURIComponent(segment)).join("/");
}

export async function generateStaticParams() {
  const docs = await getAllDocs("zh");
  return docs.map((doc) => ({
    slug: doc.key.split("/").map((part) => encodeURIComponent(part))
  }));
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const key = decodeSegments(params.slug);
  const doc = await getDocByKey(key, "zh");
  if (!doc) return { title: "文档不存在" };
  return {
    title: `${doc.title} | Raspi ImmortalWrt Docs`,
    description: doc.summary
  };
}

export default async function DocPage({ params }: DocPageProps) {
  const key = decodeSegments(params.slug);
  const [doc, allDocs, locales] = await Promise.all([
    getDocByKey(key, "zh"),
    getAllDocs("zh"),
    getAvailableLocalesForKey(key)
  ]);
  if (!doc) notFound();

  const resolvers = createMarkdownResolvers(doc.repoPath, allDocs, "zh");
  const hasEnglish = locales.includes("en");

  return (
    <section className="doc-page">
      <nav className="crumb">
        <Link href={homeHref("zh")}>文档首页</Link>
        <span>/</span>
        <span>{doc.repoPath}</span>
      </nav>

      <div className="doc-actions">
        <Link href={homeHref("zh")} className="ghost-btn">
          中文首页
        </Link>
        {hasEnglish && (
          <Link href={docHrefFromKey(key, "en")} className="ghost-btn">
            Switch To English
          </Link>
        )}
      </div>

      <MarkdownView
        content={doc.content}
        resolveHref={resolvers.resolveHref}
        resolveSrc={resolvers.resolveSrc}
      />
    </section>
  );
}
