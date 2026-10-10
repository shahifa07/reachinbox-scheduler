import { Client } from "@elastic/elasticsearch";
import { config } from "./config";
import type { EmailDto } from "./services/emails";

const INDEX = "emails";
const es = new Client({ node: config.esUrl });

export type EmailDoc = EmailDto & { userId: string };

export async function initSearch() {
  try {
    const exists = await es.indices.exists({ index: INDEX });
    if (!exists) {
      await es.indices.create({
        index: INDEX,
        mappings: {
          properties: {
            userId: { type: "keyword" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
            toEmail: { type: "text" },
            subject: { type: "text" },
            body: { type: "text" },
          },
        },
      });
    }
  } catch (e) {
    console.warn("[search] Elasticsearch unavailable, search disabled:", (e as Error).message);
  }
}

export async function indexEmails(docs: EmailDoc[]) {
  if (!docs.length) return;
  try {
    const operations = docs.flatMap((d) => [{ index: { _index: INDEX, _id: d.id } }, d]);
    await es.bulk({ operations, refresh: false });
  } catch (e) {
    // Search is secondary: never block scheduling/sending because indexing failed.
    console.warn("[search] index failed:", (e as Error).message);
  }
}

export async function searchEmails(userId: string, q: string, statuses?: string[]): Promise<EmailDto[]> {
  const filter: object[] = [{ term: { userId } }];
  if (statuses) filter.push({ terms: { status: statuses } });
  const res = await es.search<EmailDoc>({
    index: INDEX,
    size: 200,
    query: {
      bool: {
        filter,
        must: [{ multi_match: { query: q, fields: ["toEmail", "subject", "body"], fuzziness: "AUTO" } }],
      },
    },
    sort: [{ scheduledAt: "asc" }],
  });
  return res.hits.hits.map((h) => {
    const { userId: _u, ...dto } = h._source as EmailDoc;
    return dto;
  });
}
