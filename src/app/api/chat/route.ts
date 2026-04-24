import { streamText, type CoreMessage } from "ai";
import { auth } from "@/auth";
import { openrouter, MODELS } from "@/lib/openrouter";
import { PRD_SYSTEM_PROMPT } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const {
    messages,
    model,
    conversationId,
  }: {
    messages: CoreMessage[];
    model?: "default" | "premium";
    conversationId?: string;
  } = await req.json();

  const modelKey = model === "premium" ? "premium" : "default";
  const modelId = MODELS[modelKey];

  // Ensure conversation exists & belongs to this user.
  let convId = conversationId;
  if (convId) {
    const owns = await prisma.conversation.findFirst({
      where: { id: convId, userId },
      select: { id: true },
    });
    if (!owns) convId = undefined;
  }
  if (!convId) {
    const created = await prisma.conversation.create({
      data: { userId, model: modelId },
      select: { id: true },
    });
    convId = created.id;
  }

  // Persist the latest user message (the one just sent).
  const latestUser = [...messages].reverse().find((m) => m.role === "user");
  if (latestUser && typeof latestUser.content === "string") {
    await prisma.message.create({
      data: {
        conversationId: convId,
        role: "USER",
        content: latestUser.content,
      },
    });
  }

  const result = streamText({
    model: openrouter.chatModel(modelId),
    system: PRD_SYSTEM_PROMPT,
    messages,
    temperature: 0.4,
    onFinish: async ({ text, usage }) => {
      try {
        await prisma.message.create({
          data: {
            conversationId: convId!,
            role: "ASSISTANT",
            content: text,
            tokensIn: usage?.promptTokens ?? null,
            tokensOut: usage?.completionTokens ?? null,
          },
        });
        // Auto-title the conversation from first exchange if still untitled.
        const conv = await prisma.conversation.findUnique({
          where: { id: convId! },
          select: { title: true },
        });
        if (!conv?.title) {
          const t = deriveTitle(text, latestUser?.content);
          await prisma.conversation.update({
            where: { id: convId! },
            data: { title: t, updatedAt: new Date() },
          });
        } else {
          await prisma.conversation.update({
            where: { id: convId! },
            data: { updatedAt: new Date() },
          });
        }
      } catch (e) {
        console.error("[chat] persist failed", e);
      }
    },
  });

  return result.toDataStreamResponse({
    headers: {
      "X-Conversation-Id": convId,
    },
  });
}

/**
 * Pick the best title from the first AI response.
 * Preference: artifact title > first H1/H2 in response > first sentence of user msg.
 */
function deriveTitle(aiText: string, userText: unknown): string {
  // 1. Try artifact title attribute
  const artifactMatch = aiText.match(/<artifact[^>]*\btitle\s*=\s*"([^"]{3,80})"/i);
  if (artifactMatch) return cleanTitle(artifactMatch[1]);

  // 2. Try first H1 or H2 in AI text
  const headingMatch = aiText.match(/^#{1,2}\s+(.{3,80})$/m);
  if (headingMatch) return cleanTitle(headingMatch[1]);

  // 3. Fallback: first ~50 chars of user message, cut at word boundary
  if (typeof userText === "string" && userText.trim()) {
    const flat = userText.trim().replace(/\s+/g, " ");
    if (flat.length <= 50) return cleanTitle(flat);
    const truncated = flat.slice(0, 50);
    const lastSpace = truncated.lastIndexOf(" ");
    return cleanTitle((lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "…");
  }
  return "Untitled";
}

function cleanTitle(s: string): string {
  return s.trim().replace(/[#*_`]/g, "").replace(/\s+/g, " ").slice(0, 80) || "Untitled";
}
