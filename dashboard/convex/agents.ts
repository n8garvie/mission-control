import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all agents
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

// Get a specific agent by ID
export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get agent by session key
export const getBySession = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();
  },
});

// Update agent status
export const updateStatus = mutation({
  args: {
    agentId: v.id("agents"),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("blocked")),
    currentTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      status: args.status,
      currentTaskId: args.currentTaskId,
    });
    return args.agentId;
  },
});

// Record heartbeat
export const heartbeat = mutation({
  args: {
    sessionKey: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_session", (q) => q.eq("sessionKey", args.sessionKey))
      .first();

    if (!agent) {
      throw new Error(`Agent with session ${args.sessionKey} not found`);
    }

    await ctx.db.patch(agent._id, {
      lastHeartbeat: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "agent_heartbeat",
      agentId: agent._id,
      message: `${agent.emoji} ${agent.name} checked in`,
    });

    return agent._id;
  },
});

// Initialize agents (seed data)
export const initialize = mutation({
  args: {},
  handler: async (ctx) => {
    const agents = [
      {
        name: "Atlas",
        role: "Product Manager",
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
        level: "lead" as const,
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

    // Check if agents already exist
    const existingAgents = await ctx.db.query("agents").collect();
    if (existingAgents.length > 0) {
      return { message: "Agents already initialized" };
    }

    // Insert all agents
    for (const agent of agents) {
      await ctx.db.insert("agents", agent);
    }

    return { message: `Initialized ${agents.length} agents` };
  },
});
