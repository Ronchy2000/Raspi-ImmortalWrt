import HomePage from "@/components/HomePage";
import LocaleAutoRedirect from "@/components/LocaleAutoRedirect";

export default async function ZhHomePage() {
  return (
    <>
      <LocaleAutoRedirect />
      <HomePage locale="zh" />
    </>
  );
}
