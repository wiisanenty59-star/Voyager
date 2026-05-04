import { Router, type IRouter } from "express";
import {
  db,
  chatRoomsTable,
  roomMessagesTable,
  statesTable,
  usersTable,
  crewsTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";
import {
  CreateChatRoomBody,
  ListRoomMessagesParams,
  SendRoomMessageParams,
  SendRoomMessageBody,
} from "@workspace/api-zod";
import {
  type AuthedRequest,
  requireAuth,
  requireAdmin,
} from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/chat/rooms",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = (req as AuthedRequest).user;

    // Crew rooms are private — exclude rooms attached to a crew
    const crewRoomIds = await db
      .select({ id: crewsTable.roomId })
      .from(crewsTable);
    const excluded = new Set(crewRoomIds.map((r) => r.id));

    const rows = await db
      .select({
        id: chatRoomsTable.id,
        slug: chatRoomsTable.slug,
        name: chatRoomsTable.name,
        description: chatRoomsTable.description,
        kind: chatRoomsTable.kind,
        stateId: chatRoomsTable.stateId,
        stateSlug: statesTable.slug,
        minTrustLevel: chatRoomsTable.minTrustLevel,
        isArchived: chatRoomsTable.isArchived,
        memberCount: sql<number>`(
          SELECT COUNT(DISTINCT author_id)::int FROM room_messages
          WHERE room_messages.room_id = ${chatRoomsTable.id}
        )`,
        lastMessageAt: sql<Date | null>`(
          SELECT MAX(created_at) FROM room_messages
          WHERE room_messages.room_id = ${chatRoomsTable.id}
        )`,
      })
      .from(chatRoomsTable)
      .leftJoin(statesTable, eq(statesTable.id, chatRoomsTable.stateId))
      .where(eq(chatRoomsTable.isArchived, false))
      .orderBy(asc(chatRoomsTable.name));

    const visible = rows.filter(
      (r) =>
        !excluded.has(r.id) && (user.trustLevel ?? 0) >= r.minTrustLevel,
    );
    res.json(visible);
  },
);

router.post(
  "/chat/rooms",
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = CreateChatRoomBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [created] = await db
      .insert(chatRoomsTable)
      .values({
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description,
        kind: parsed.data.kind,
        stateId: parsed.data.stateId ?? null,
        minTrustLevel: parsed.data.minTrustLevel ?? 0,
      })
      .returning();

    if (!created) {
      res.status(500).json({ error: "Could not create room" });
      return;
    }

    res.status(201).json({
      id: created.id,
      slug: created.slug,
      name: created.name,
      description: created.description,
      kind: created.kind,
      stateId: created.stateId,
      stateSlug: null,
      minTrustLevel: created.minTrustLevel,
      isArchived: created.isArchived,
      memberCount: 0,
      lastMessageAt: null,
    });
  },
);

router.get(
  "/chat/rooms/:slug/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = ListRoomMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const user = (req as AuthedRequest).user;

    const [room] = await db
      .select()
      .from(chatRoomsTable)
      .where(eq(chatRoomsTable.slug, params.data.slug));
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if ((user.trustLevel ?? 0) < room.minTrustLevel) {
      res.status(403).json({ error: "Trust level too low" });
      return;
    }

    const sinceParam = req.query.sinceId;
    const sinceId =
      typeof sinceParam === "string"
        ? Number.parseInt(sinceParam, 10)
        : undefined;

    const filters = [eq(roomMessagesTable.roomId, room.id)];
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
  "/chat/rooms/:slug/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SendRoomMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = SendRoomMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (!parsed.data.body.trim()) {
      res.status(400).json({ error: "Message cannot be empty" });
      return;
    }
    const user = (req as AuthedRequest).user;

    const [room] = await db
      .select()
      .from(chatRoomsTable)
      .where(eq(chatRoomsTable.slug, params.data.slug));
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if ((user.trustLevel ?? 0) < room.minTrustLevel) {
      res.status(403).json({ error: "Trust level too low" });
      return;
    }

    const [created] = await db
      .insert(roomMessagesTable)
      .values({
        roomId: room.id,
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

// Suppress unused warnings for imports kept for potential future filtering
void isNull;
void ne;
