import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaybookRegionPage } from "@/components/playbook/PlaybookRegionPage";
import { getPlaybookScope } from "@/lib/playbook-landing";
import { PLAYBOOK_KEYS, isPlaybookKey } from "@/lib/playbooks";

/**
 * Region playbook page: /playbook/bali, /playbook/dubai, /playbook/london.
 * Statically generated for the three catalog keys; anything else 404s.
 * (/playbook/thanks is a static sibling segment, so it never reaches here.)
 */
export function generateStaticParams() {
  return PLAYBOOK_KEYS.map((market) => ({ market }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ market: string }>;
}): Promise<Metadata> {
  const { market } = await params;
  if (!isPlaybookKey(market)) return {};
  const scope = getPlaybookScope(market);
  return { title: scope.metaTitle, description: scope.metaDescription };
}

export default async function RegionPlaybook({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isPlaybookKey(market)) notFound();
  return <PlaybookRegionPage scope={getPlaybookScope(market)} />;
}
