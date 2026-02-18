import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

type MarkdownViewProps = {
  content: string;
  resolveHref: (href: string | undefined) => string;
  resolveSrc: (src: string | undefined) => string;
};

function isExternal(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href);
}

export default function MarkdownView({ content, resolveHref, resolveSrc }: MarkdownViewProps) {
  return (
    <article className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "append" }]
        ]}
        components={{
          a({ href, children, ...props }) {
            if (!href) {
              return <a {...props}>{children}</a>;
            }

            const target = resolveHref(href);
            if (isExternal(target)) {
              return (
                <a href={target} target="_blank" rel="noreferrer noopener" {...props}>
                  {children}
                </a>
              );
            }

            if (target.startsWith("#")) {
              return (
                <a href={target} {...props}>
                  {children}
                </a>
              );
            }

            return <Link href={target}>{children}</Link>;
          },
          img({ src, alt, ...props }) {
            const target = resolveSrc(src);
            return <img src={target} alt={alt ?? ""} loading="lazy" {...props} />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
