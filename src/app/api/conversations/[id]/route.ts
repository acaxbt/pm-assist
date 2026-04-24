import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conv) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  await prisma.conversation.deleteMany({
    where: { id: params.id, userId: session.user.id },
  });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const conv = await prisma.conversation.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { title: body.title },
  });
  if (conv.count === 0) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ ok: true });
}
