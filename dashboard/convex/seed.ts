import { mutation } from "./_generated/server";

export default mutation(async ({ db }) => {
  const agents = [
    {
      name: "Atlas",
      role: "Product Manager / Squad Lead",
      emoji: "🎯",
      sessionKey: "agent:pm:main",
      status: "idle" as const,
      level: "lead" as const,
    },
    {
      name: "Muse",
      role: "Creative Director",
      emoji: "🎨",
      sessionKey: "agent:creative:main",
      status: "idle" as const,
      level: "specialist" as const,
    },
    {
      name: "Pixel",
      role: "UI/Visual Designer",
      emoji: "✏️",
      sessionKey: "agent:designer:main",
      status: "idle" as const,
      level: "specialist" as const,
    },
    {
      name: "Scout",
      role: "User/Market Researcher",
      emoji: "🔍",
      sessionKey: "agent:researcher:main",
      status: "idle" as const,
      level: "specialist" as const,
    },
    {
      name: "Forge",
      role: "Tech Lead / Engineer",
      emoji: "⚡",
      sessionKey: "agent:engineer:main",
      status: "idle" as const,
      level: "lead" as const,
    },
    {
      name: "Lens",
      role: "QA / Usability Tester",
      emoji: "🔬",
      sessionKey: "agent:qa:main",
      status: "idle" as const,
      level: "specialist" as const,
    },
    {
      name: "Echo",
      role: "Copywriter / Content Designer",
      emoji: "✍️",
      sessionKey: "agent:copy:main",
      status: "idle" as const,
      level: "specialist" as const,
    },
    {
      name: "Amp",
      role: "Marketer",
      emoji: "📣",
      sessionKey: "agent:marketing:main",
      status: "idle" as const,
      level: "specialist" as const,
    },
  ];

  for (const agent of agents) {
    await db.insert("agents", agent);
  }

  return { message: "Agents seeded successfully", count: agents.length };
});
