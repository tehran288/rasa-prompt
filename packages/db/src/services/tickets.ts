import { DomainError, type Ticket, type TicketMessage, type TicketService } from "@rasa/shared";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import type { Db } from "../db";
import { ticketMessages, tickets } from "../schema";
import { isUuid } from "../util";

type TicketRow = typeof tickets.$inferSelect;
type MessageRow = typeof ticketMessages.$inferSelect;

const toTicket = (r: TicketRow): Ticket => ({
  id: r.id,
  userId: r.userId,
  status: r.status,
  subject: r.subject,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});
const toMessage = (r: MessageRow): TicketMessage => ({
  id: r.id,
  ticketId: r.ticketId,
  from: r.from,
  text: r.text,
  createdAt: r.createdAt,
});

export function createTicketService(db: Db): TicketService {
  return {
    async open(userId, subject, firstMessage) {
      return db.transaction(async (tx) => {
        const [t] = await tx
          .insert(tickets)
          .values({ userId, subject: subject.slice(0, 200), status: "open" })
          .returning();
        if (!t) throw new Error("ticket insert failed");
        await tx
          .insert(ticketMessages)
          .values({ ticketId: t.id, from: "user", text: firstMessage });
        return toTicket(t);
      });
    },

    async addMessage(ticketId, from, text) {
      if (!isUuid(ticketId)) throw new DomainError("not_found", "ticket");
      return db.transaction(async (tx) => {
        const [t] = await tx.select().from(tickets).where(eq(tickets.id, ticketId)).for("update");
        if (!t) throw new DomainError("not_found", "ticket");
        const [m] = await tx.insert(ticketMessages).values({ ticketId, from, text }).returning();
        // user wrote → admin's turn (re-opens closed tickets); admin wrote → user's turn.
        const status =
          from === "user" ? "waiting_admin" : from === "admin" ? "waiting_user" : t.status;
        await tx
          .update(tickets)
          .set({ status, updatedAt: new Date() })
          .where(eq(tickets.id, ticketId));
        return toMessage(m as MessageRow);
      });
    },

    async setStatus(ticketId, status) {
      if (!isUuid(ticketId)) throw new DomainError("not_found", "ticket");
      await db
        .update(tickets)
        .set({ status, updatedAt: new Date() })
        .where(eq(tickets.id, ticketId));
    },

    async get(ticketId) {
      if (!isUuid(ticketId)) return null;
      const [t] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
      if (!t) return null;
      const msgs = await db
        .select()
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticketId))
        .orderBy(asc(ticketMessages.createdAt), asc(ticketMessages.id));
      return { ticket: toTicket(t), messages: msgs.map(toMessage) };
    },

    async activeForUser(userId) {
      const [t] = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.userId, userId), ne(tickets.status, "closed")))
        .orderBy(desc(tickets.updatedAt))
        .limit(1);
      return t ? toTicket(t) : null;
    },

    async listOpen(limit) {
      const rows = await db
        .select()
        .from(tickets)
        .where(ne(tickets.status, "closed"))
        .orderBy(asc(tickets.updatedAt))
        .limit(Math.max(1, limit));
      return rows.map(toTicket);
    },
  };
}
