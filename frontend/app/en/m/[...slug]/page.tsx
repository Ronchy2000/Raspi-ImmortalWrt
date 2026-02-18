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
  const docs = await getAllDocs("en");
  return docs.map((doc) => ({
    slug: doc.key.split("/").map((part) => encodeURIComponent(part))
  }));
}

export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const key = decodeSegments(params.slug);
  const doc = await getDocByKey(key, "en");
  if (!doc) return { title: "Document Not Found" };
  return {
    title: `${doc.title} | Raspi ImmortalWrt Docs`,
    description: doc.summary
  };
}

export default async function EnDocPage({ params }: DocPageProps) {
  const key = decodeSegments(params.slug);
  const [doc, allDocs, locales] = await Promise.all([
    getDocByKey(key, "en"),
    getAllDocs("en"),
    getAvailableLocalesForKey(key)
  ]);
  if (!doc) notFound();

  const resolvers = createMarkdownResolvers(doc.repoPath, allDocs, "en");
  const hasChinese = locales.includes("zh");

  return (
    <section className="doc-page">
      <nav className="crumb">
        <Link href={homeHref("en")}>Docs Home</Link>
        <span>/</span>
        <span>{doc.repoPath}</span>
      </nav>

      <div className="doc-actions">
        <Link href={homeHref("en")} className="ghost-btn">
          English Home
        </Link>
        {hasChinese && (
          <Link href={docHrefFromKey(key, "zh")} className="ghost-btn">
            切换到中文
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
