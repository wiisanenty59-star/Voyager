import { Router, type IRouter } from "express";
import {
  db,
  crewsTable,
  crewMembersTable,
  chatRoomsTable,
  roomMessagesTable,
  usersTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import {
  CreateCrewBody,
  ListCrewMessagesParams,
  SendCrewMessageParams,
  SendCrewMessageBody,
} from "@workspace/api-zod";
import { type AuthedRequest, requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function loadCrewWithMembers(crewId: number) {
  const [crew] = await db
    .select({
      id: crewsTable.id,
      name: crewsTable.name,
      description: crewsTable.description,
      creatorId: crewsTable.creatorId,
      creatorUsername: usersTable.username,
      roomId: crewsTable.roomId,
      createdAt: crewsTable.createdAt,
    })
    .from(crewsTable)
    .leftJoin(usersTable, eq(usersTable.id, crewsTable.creatorId))
    .where(eq(crewsTable.id, crewId));

  if (!crew) return null;

  const members = await db
    .select({
      userId: crewMembersTable.userId,
      username: usersTable.username,
      trustLevel: usersTable.trustLevel,
      joinedAt: crewMembersTable.joinedAt,
    })
    .from(crewMembersTable)
    .leftJoin(usersTable, eq(usersTable.id, crewMembersTable.userId))
    .where(eq(crewMembersTable.crewId, crewId));

  return { ...crew, memberCount: members.length, members };
}

router.get("/crews", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;

  const myCrewRows = await db
    .select({ crewId: crewMembersTable.crewId })
    .from(crewMembersTable)
    .where(eq(crewMembersTable.userId, user.id));

  if (myCrewRows.length === 0) {
    res.json([]);
    return;
  }

  const ids = myCrewRows.map((c) => c.crewId);
  const crews = await Promise.all(ids.map(loadCrewWithMembers));
  res.json(crews.filter(Boolean));
});

router.post("/crews", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCrewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as AuthedRequest).user;

  // Lookup additional members by username
  const memberUsernames = (parsed.data.memberUsernames ?? []).filter(
    (u) => u && u !== user.username,
  );
  let extraMembers: { id: number }[] = [];
  if (memberUsernames.length > 0) {
    extraMembers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(inArray(usersTable.username, memberUsernames));
  }

  // Create the backing chat room
  const slug = `crew-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
  const [room] = await db
    .insert(chatRoomsTable)
    .values({
      slug,
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      kind: "crew",
    })
    .returning();
  if (!room) {
    res.status(500).json({ error: "Could not create crew room" });
    return;
  }

  const [crew] = await db
    .insert(crewsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      creatorId: user.id,
      roomId: room.id,
    })
    .returning();
  if (!crew) {
    res.status(500).json({ error: "Could not create crew" });
    return;
  }

  // Add creator + extras
  const allMemberIds = Array.from(
    new Set([user.id, ...extraMembers.map((m) => m.id)]),
  );
  await db.insert(crewMembersTable).values(
    allMemberIds.map((uid) => ({
      crewId: crew.id,
      userId: uid,
    })),
  );

  const full = await loadCrewWithMembers(crew.id);
  res.status(201).json(full);
});

router.get(
  "/crews/:id/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListCrewMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = (req as AuthedRequest).user;

    const [membership] = await db
      .select()
      .from(crewMembersTable)
      .where(
        and(
          eq(crewMembersTable.crewId, params.data.id),
          eq(crewMembersTable.userId, user.id),
        ),
      );
    if (!membership) {
      res.status(403).json({ error: "Not a crew member" });
      return;
    }

    const [crew] = await db
      .select({ roomId: crewsTable.roomId })
      .from(crewsTable)
      .where(eq(crewsTable.id, params.data.id));
    if (!crew) {
      res.status(404).json({ error: "Crew not found" });
      return;
    }

    const sinceParam = req.query.sinceId;
    const sinceId =
      typeof sinceParam === "string"
        ? Number.parseInt(sinceParam, 10)
        : undefined;

    const filters = [eq(roomMessagesTable.roomId, crew.roomId)];
    if (sinceId && Number.isFinite(sinceId)) {
      filters.push(gt(roomMessagesTable.id, sinceId));
    }

    const rows = await db
      .select({
        id: roomMessagesTable.id,
        body: roomMessagesTable.body,
        authorId: roomMessagesTable.authorId,
        authorUsername: usersTable.username,
        authorTrustLevel: usersTable.trustLevel,
        createdAt: roomMessagesTable.createdAt,
      })
      .from(roomMessagesTable)
      .leftJoin(usersTable, eq(usersTable.id, roomMessagesTable.authorId))
      .where(and(...filters))
      .orderBy(desc(roomMessagesTable.id))
      .limit(sinceId ? 200 : 100);

    res.json({ messages: rows.reverse() });
  },
);

router.post(
  "/crews/:id/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SendCrewMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SendCrewMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!parsed.data.body.trim()) {
      res.status(400).json({ error: "Message cannot be empty" });
      return;
    }
    const user = (req as AuthedRequest).user;

    const [membership] = await db
      .select()
      .from(crewMembersTable)
      .where(
        and(
          eq(crewMembersTable.crewId, params.data.id),
          eq(crewMembersTable.userId, user.id),
        ),
      );
    if (!membership) {
      res.status(403).json({ error: "Not a crew member" });
      return;
    }

    const [crew] = await db
      .select({ roomId: crewsTable.roomId })
      .from(crewsTable)
      .where(eq(crewsTable.id, params.data.id));
    if (!crew) {
      res.status(404).json({ error: "Crew not found" });
      return;
    }

    const [created] = await db
      .insert(roomMessagesTable)
      .values({
        roomId: crew.roomId,
        authorId: user.id,
        body: parsed.data.body,
      })
      .returning();
    if (!created) {
      res.status(500).json({ error: "Could not send" });
      return;
    }

    res.status(201).json({
      id: created.id,
      body: created.body,
      authorId: created.authorId,
      authorUsername: user.username,
      authorTrustLevel: user.trustLevel ?? 0,
      createdAt: created.createdAt,
    });
  },
);

export default router;

// Suppress unused warning for `asc` and `sql`
void asc;
void sql;
