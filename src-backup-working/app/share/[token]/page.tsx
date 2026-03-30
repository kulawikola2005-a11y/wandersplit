import ShareClient from "./ShareClient";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const p = await params;
  return <ShareClient token={String(p.token || "")} />;
}