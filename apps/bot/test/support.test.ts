import { describe, expect, it } from "vitest";
import { ADMIN_CHAT, ADMIN_ID, createHarness } from "./harness";

describe("support", () => {
  it("answers with AI first, escalates to the admin chat, relays the admin reply back", async () => {
    const h = createHarness();
    await h.onboard(1);
    await h.onboard(ADMIN_ID);
    const user = h.userOf(1);

    await h.tap("m:sup");
    await h.message("پرداخت کردم ولی پرامپت نیامد");
    expect(h.lastText()).toContain("پاسخ هوشمند");
    expect(h.lastButtons().map((b) => b.data)).toContain("sup:h");

    h.reset();
    await h.tap("sup:h");
    const ticket = [...h.state.tickets.values()][0];
    expect(ticket?.ticket.userId).toBe(user?.id);
    expect(ticket?.ticket.status).toBe("waiting_admin");
    // AI answer kept in the ticket for context
    expect(ticket?.messages.map((m) => m.from)).toEqual(["user", "ai"]);
    const forwarded = h.calls.find((c) => c.method === "sendMessage" && c.payload.chat_id === String(ADMIN_CHAT));
    expect(String(forwarded?.payload.text)).toContain(`#T${ticket?.ticket.id}`);
    expect(JSON.stringify(forwarded?.payload.reply_markup)).toContain(`a:rp:${ticket?.ticket.id}`);
    expect(h.texts().join("\n")).toContain("برای همکاران پشتیبانی ارسال شد");

    // follow-up message goes to the same ticket
    await h.message("شماره سفارشم 123 است");
    expect(ticket?.messages.at(-1)?.text).toBe("شماره سفارشم 123 است");

    // admin replies to the forwarded message in the admin group
    h.reset();
    await h.message("سلام، بررسی شد و پرامپت به کتابخانه شما اضافه شد.", ADMIN_ID, {
      chatId: ADMIN_CHAT,
      replyTo: { text: String(forwarded?.payload.text) },
    });
    const toUser = h.calls.find((c) => c.method === "sendMessage" && c.payload.chat_id === "1");
    expect(String(toUser?.payload.text)).toContain("پاسخ پشتیبانی");
    expect(String(toUser?.payload.text)).toContain("کتابخانه شما اضافه شد");
    expect(ticket?.ticket.status).toBe("waiting_user");
    expect(ticket?.messages.at(-1)?.from).toBe("admin");

    // admin also can use /reply and /close
    await h.message(`/reply ${ticket?.ticket.id} پیام دوم`, ADMIN_ID);
    expect(ticket?.messages.at(-1)?.text).toBe("پیام دوم");
    await h.message(`/close ${ticket?.ticket.id}`, ADMIN_ID);
    expect(ticket?.ticket.status).toBe("closed");
    expect(h.calls.some((c) => c.payload.chat_id === "1" && String(c.payload.text).includes("بسته شد"))).toBe(true);
  });

  it("escalates automatically when the AI says so or is unavailable", async () => {
    const h = createHarness("telegram", { adminChat: false });
    await h.onboard(1);
    h.ai.supportResult = new Error("AI down");
    await h.tap("m:sup");
    await h.message("مشکل دارم");
    expect(h.state.tickets.size).toBe(1);
    // no admin chat configured → sent to each admin id
    expect(h.calls.some((c) => c.method === "sendMessage" && c.payload.chat_id === String(ADMIN_ID))).toBe(true);
    expect(h.texts().join("\n")).toContain("دستیار هوشمند فعلاً در دسترس نیست");
  });

  it("admin 'Reply' button flow relays the next admin message", async () => {
    const h = createHarness();
    await h.onboard(1);
    await h.onboard(ADMIN_ID);
    h.ai.supportResult = { answer: "باید بررسی شود", escalate: true };
    await h.tap("m:sup");
    await h.message("سفارشم کجاست؟");
    const ticketId = [...h.state.tickets.keys()][0] ?? "";
    await h.tap(`a:rp:${ticketId}`, ADMIN_ID);
    h.reset();
    await h.message("در حال بررسی است", ADMIN_ID);
    expect(h.calls.some((c) => c.payload.chat_id === "1" && String(c.payload.text).includes("در حال بررسی است"))).toBe(true);
    // the user can continue the conversation in that ticket from the relayed message
    await h.tap(`sup:c:${ticketId}`, 1);
    await h.message("ممنون", 1);
    expect(h.state.tickets.get(ticketId)?.messages.at(-1)?.text).toBe("ممنون");
  });
});
