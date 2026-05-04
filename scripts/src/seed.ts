import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  db,
  usersTable,
  statesTable,
  categoriesTable,
  invitesTable,
  locationsTable,
  threadsTable,
  postsTable,
  chatRoomsTable,
  announcementsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("Seeding HiddenFreeways...");

  // Admin
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe!2026";
  const [existingAdmin] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, adminUsername));

  let adminId: number;
  if (existingAdmin) {
    adminId = existingAdmin.id;
    console.log(`Admin "${adminUsername}" already exists (id=${adminId}).`);
  } else {
    const hash = await bcrypt.hash(adminPassword, 10);
    const [admin] = await db
      .insert(usersTable)
      .values({
        username: adminUsername,
        passwordHash: hash,
        role: "admin",
      })
      .returning();
    if (!admin) throw new Error("Could not create admin");
    adminId = admin.id;
    console.log(`Created admin "${adminUsername}" (id=${adminId}).`);
    console.log(`  Username: ${adminUsername}`);
    console.log(`  Password: ${adminPassword}`);
  }

  // Midwest states
  const midwest = [
    { slug: "illinois", name: "Illinois", abbreviation: "IL", centerLat: 40.0, centerLng: -89.0, zoom: 7 },
    { slug: "indiana", name: "Indiana", abbreviation: "IN", centerLat: 39.9, centerLng: -86.3, zoom: 7 },
    { slug: "iowa", name: "Iowa", abbreviation: "IA", centerLat: 41.9, centerLng: -93.5, zoom: 7 },
    { slug: "kansas", name: "Kansas", abbreviation: "KS", centerLat: 38.5, centerLng: -98.4, zoom: 7 },
    { slug: "michigan", name: "Michigan", abbreviation: "MI", centerLat: 44.3, centerLng: -85.6, zoom: 6 },
    { slug: "minnesota", name: "Minnesota", abbreviation: "MN", centerLat: 46.3, centerLng: -94.3, zoom: 6 },
    { slug: "missouri", name: "Missouri", abbreviation: "MO", centerLat: 38.5, centerLng: -92.5, zoom: 7 },
    { slug: "nebraska", name: "Nebraska", abbreviation: "NE", centerLat: 41.5, centerLng: -99.8, zoom: 7 },
    { slug: "north-dakota", name: "North Dakota", abbreviation: "ND", centerLat: 47.5, centerLng: -100.5, zoom: 7 },
    { slug: "ohio", name: "Ohio", abbreviation: "OH", centerLat: 40.4, centerLng: -82.7, zoom: 7 },
    { slug: "south-dakota", name: "South Dakota", abbreviation: "SD", centerLat: 44.4, centerLng: -100.2, zoom: 7 },
    { slug: "wisconsin", name: "Wisconsin", abbreviation: "WI", centerLat: 44.5, centerLng: -89.5, zoom: 7 },
  ];

  for (const s of midwest) {
    const [existing] = await db
      .select()
      .from(statesTable)
      .where(eq(statesTable.slug, s.slug));
    if (!existing) {
      await db.insert(statesTable).values(s);
      console.log(`  + state: ${s.name}`);
    }
  }

  // Categories
  const categories = [
    {
      slug: "general",
      name: "General Discussion",
      description: "Open conversation, introductions, and meta about the community.",
      icon: "message-square",
      sortOrder: 10,
    },
    {
      slug: "trip-reports",
      name: "Trip Reports",
      description: "Recap your latest expedition. Photos, notes, and stories from the field.",
      icon: "compass",
      sortOrder: 20,
    },
    {
      slug: "scouting",
      name: "Scouting & Tips",
      description: "Help identifying, locating, and accessing places.",
      icon: "binoculars",
      sortOrder: 30,
    },
    {
      slug: "history",
      name: "History & Research",
      description: "Background, archival material, and the story behind the structure.",
      icon: "scroll-text",
      sortOrder: 40,
    },
    {
      slug: "gear",
      name: "Gear & Tech",
      description: "Cameras, lights, climbing, comms, mapping software.",
      icon: "package",
      sortOrder: 50,
    },
    {
      slug: "safety",
      name: "Safety & Legal",
      description: "Risk, gear, and the legal landscape of urban exploration.",
      icon: "shield-alert",
      sortOrder: 60,
    },
  ];

  for (const c of categories) {
    const [existing] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, c.slug));
    if (!existing) {
      await db.insert(categoriesTable).values(c);
      console.log(`  + category: ${c.name}`);
    }
  }

  // Sample invite
  const [existingInviteCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(invitesTable);
  if (!existingInviteCount || existingInviteCount.c === 0) {
    const code = randomBytes(8).toString("hex");
    await db.insert(invitesTable).values({
      code,
      note: "Founder invite — share with first crew",
      createdById: adminId,
    });
    console.log(`  + sample invite code: ${code}`);
  }

  // Sample location + thread (only if no locations exist yet)
  const [locCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(locationsTable);
  if (!locCount || locCount.c === 0) {
    const [illinois] = await db
      .select()
      .from(statesTable)
      .where(eq(statesTable.slug, "illinois"));
    const [generalCat] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, "trip-reports"));

    if (illinois && generalCat) {
      const [loc] = await db
        .insert(locationsTable)
        .values({
          stateId: illinois.id,
          name: "Damen Silos",
          description:
            "Concrete grain elevators on the south branch of the Chicago River. Heavily watched, recently sold for redevelopment. Approach is sketchy and access is shifting weekly.",
          city: "Chicago",
          latitude: 41.8458,
          longitude: -87.6648,
          status: "watched",
          risk: "high",
          createdById: adminId,
        })
        .returning();

      if (loc) {
        const [thread] = await db
          .insert(threadsTable)
          .values({
            title: "Welcome to HiddenFreeways",
            body:
              "This is a private channel for explorers documenting the places most people drive past without seeing.\n\nGround rules:\n- Don't burn locations.\n- Trade real intel, not hype.\n- Take only photos. Leave only footprints.\n\nPost trip reports, scouting, and history. Pin threads to specific locations to keep intel where it belongs.",
            categoryId: generalCat.id,
            authorId: adminId,
            isPinned: true,
          })
          .returning();
        if (thread) {
          await db.insert(postsTable).values({
            threadId: thread.id,
            authorId: adminId,
            body: "If you see this, you're in. Welcome.",
          });
          await db
            .update(threadsTable)
            .set({
              replyCount: 1,
              lastActivityAt: new Date(),
            })
            .where(eq(threadsTable.id, thread.id));
        }
        console.log(`  + sample location + welcome thread`);
      }
    }
  }

  // Default chat rooms
  const rooms = [
    {
      slug: "lobby",
      name: "Lobby",
      description: "General chatter for everyone in the freeway.",
      kind: "public",
      minTrustLevel: 0,
    },
    {
      slug: "field-talk",
      name: "Field Talk",
      description: "Live conditions, gear questions, last-minute pings.",
      kind: "public",
      minTrustLevel: 0,
    },
    {
      slug: "trusted-only",
      name: "Trusted Only",
      description: "For users with proven trust level. Real intel only.",
      kind: "trusted",
      minTrustLevel: 2,
    },
  ];
  for (const r of rooms) {
    const [existing] = await db
      .select()
      .from(chatRoomsTable)
      .where(eq(chatRoomsTable.slug, r.slug));
    if (!existing) {
      await db.insert(chatRoomsTable).values(r);
      console.log(`  + chat room: ${r.name}`);
    }
  }

  // Sample announcement
  const [annCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(announcementsTable);
  if (!annCount || annCount.c === 0) {
    await db.insert(announcementsTable).values({
      title: "Welcome to HiddenFreeways",
      body: "Invite-only. Be careful what you post — every location you burn stays burnt.",
      kind: "info",
      priority: 10,
      createdById: adminId,
    });
    console.log("  + sample announcement");
  }

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
