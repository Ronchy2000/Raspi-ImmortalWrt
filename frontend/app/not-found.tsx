import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <h1>404</h1>
      <p>文档不存在，可能是路径已变更。</p>
      <Link href="/">返回文档首页</Link>
    </section>
  );
}
