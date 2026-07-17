import { notFound } from "next/navigation";

import { getContentById } from "@/services/contentService";

import { ContentDetailView } from "./_components/ContentDetailView";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ContentDetailPage({ params }: Props) {
  const { id } = await params;

  let content: Awaited<ReturnType<typeof getContentById>>;
  try {
    content = await getContentById(id);
  } catch {
    notFound();
  }

  return <ContentDetailView content={content} />;
}
