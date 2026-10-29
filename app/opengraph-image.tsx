import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Starlane: who owes you, and who to call today";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({ kicker: "Morning cash brief", title: "Who owes you.", italic: "Who to call today." });
}
