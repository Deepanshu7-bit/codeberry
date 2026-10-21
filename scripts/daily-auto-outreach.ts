import { PrismaClient } from "@prisma/client";
import readline from "readline";

const prisma = new PrismaClient();

function prompt(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 CodeBerry Daily 30–40 Outreach Dispatcher`);
  console.log(`Zero Cost • Ban-Proof WhatsApp & Lead Outreach`);
  console.log(`======================================================\n`);

  const leads = await prisma.lead.findMany({
    where: {
      status: { in: ["OUTREACH_READY", "DISCOVERED", "QUALIFIED"] },
      whatsappPhone: { not: null },
    },
    include: {
      pitches: true,
      audit: true,
    },
    take: 40,
    orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
  });

  if (leads.length === 0) {
    console.log(`No pending outreach leads found in your database.`);
    console.log(`💡 Run 'npm run harvest-30' first to automatically fetch 30-40 fresh businesses!\n`);
    return;
  }

  console.log(`Found ${leads.length} leads ready for today's outreach sprint.\n`);
  const langChoice = await prompt(`Choose message language: (1) Hinglish (Recommended), (2) English [Default: 1]: `);
  const useHinglish = langChoice.trim() !== "2";

  console.log(`\nStarting outreach queue in ${useHinglish ? "🇮🇳 Hinglish" : "🇬🇧 English"} mode...\n`);

  let dispatched = 0;

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const pitch = lead.pitches[0];
    if (!pitch || !lead.whatsappPhone) continue;

    const message =
      useHinglish && pitch.openingMessageHinglish
        ? pitch.openingMessageHinglish
        : pitch.openingMessage;

    const waUrl = `https://wa.me/${lead.whatsappPhone}?text=${encodeURIComponent(message)}`;

    console.log(`------------------------------------------------------`);
    console.log(`[${i + 1}/${leads.length}] ${lead.name} (${lead.category}) - ${lead.city}`);
    console.log(`📞 WhatsApp: +${lead.whatsappPhone}`);
    if (pitch.demoUrl) console.log(`🔗 Work Demo: ${pitch.demoUrl}`);
    console.log(`\n💬 Personalized Message:`);
    console.log(message);
    console.log(`\n👉 WhatsApp 1-Click Link:`);
    console.log(waUrl);

    const action = await prompt(`\nAction: [ENTER] to Open & Mark Sent, [s] to Skip, [q] to Quit: `);

    if (action.toLowerCase() === "q") {
      console.log(`\nSprint paused by user. Processed ${dispatched} leads.`);
      break;
    }

    if (action.toLowerCase() === "s") {
      console.log(`Skipped ${lead.name}.\n`);
      continue;
    }

    // Try opening URL in default browser (macOS / Linux / Windows)
    try {
      const openCmd =
        process.platform === "darwin"
          ? `open "${waUrl}"`
          : process.platform === "win32"
          ? `start "" "${waUrl}"`
          : `xdg-open "${waUrl}"`;

      const { exec } = await import("child_process");
      exec(openCmd);
    } catch {
      // Ignore if terminal doesn't support exec
    }

    // Update status in DB
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "CONTACTED" },
    });

    await prisma.pitchDraft.update({
      where: { id: pitch.id },
      data: {
        status: "OPENED_IN_WHATSAPP",
        dispatchedAt: new Date(),
      },
    });

    await prisma.interaction.create({
      data: {
        leadId: lead.id,
        type: "WHATSAPP_OPENED",
        content: `Founder opened personalized ${useHinglish ? "Hinglish" : "English"} pitch in WhatsApp Web.`,
      },
    });

    dispatched++;
    console.log(`✅ Marked ${lead.name} as CONTACTED.\n`);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 Daily Outreach Session Finished!`);
  console.log(`- Messages Dispatched: ${dispatched}`);
  console.log(`- Remaining in Queue: ${leads.length - dispatched}`);
  console.log(`======================================================\n`);
}

main()
  .catch((e) => {
    console.error("Error in outreach dispatcher:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
