import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
    status: v.union(
      v.literal("idle"),
      v.literal("working"),
      v.literal("blocked"),
      v.literal("offline")
    ),
    currentTaskId: v.optional(v.id("tasks")),
    currentIdeaId: v.optional(v.id("ideas")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      status: args.status,
      currentTaskId: args.currentTaskId,
      currentIdeaId: args.currentIdeaId,
    });
    return args.agentId;
  },
});

// Update agent spawn status for a specific idea
export const updateSpawnStatus = mutation({
  args: {
    agentId: v.id("agents"),
    ideaId: v.id("ideas"),
    status: v.union(
      v.literal("pending"),
      v.literal("spawning"),
      v.literal("spawned"),
      v.literal("working"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("manual_intervention_required")
    ),
    sessionKey: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    // Update agent status
    await ctx.db.patch(args.agentId, {
      status: args.status === "working" ? "working" : args.status === "completed" ? "idle" : agent.status,
      sessionKey: args.sessionKey || agent.sessionKey,
    });

    return args.agentId;
  },
});

// List available agents (idle or offline)
export const listAvailable = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.filter(a => a.status === "idle" || a.status === "offline");
  },
});

// Get agent workload
export const getWorkload = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    // Count active tasks assigned to this agent
    const ideas = await ctx.db.query("ideas").collect();
    const activeIdeas = ideas.filter(
      (idea: any) => 
        idea.assignedAgents?.includes(args.agentId) &&
        idea.taskStatus !== "deployed" &&
        idea.taskStatus !== "blocked"
    );

    return {
      agent,
      activeIdeas: activeIdeas.length,
      activeIdeaIds: activeIdeas.map((i: any) => i._id),
    };
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
      agentName: agent.name,
      message: `${agent.name} checked in`,
      createdAt: Date.now(),
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
        role: "Product Manager / Squad Lead",
        emoji: "🎯",
        sessionKey: "agent:pm:main",
        status: "idle" as const,
        level: "lead" as const,
        skills: ["product", "strategy", "coordination"],
        canScout: false,
        canBuild: true,
        tasksCompleted: 0,
        ideasScouted: 0,
      },
      {
        name: "Muse",
        role: "Creative Director",
        emoji: "🎨",
        sessionKey: "agent:creative:main",
        status: "idle" as const,
        level: "lead" as const,
        skills: ["creative", "vision", "brand"],
        canScout: false,
        canBuild: true,
        tasksCompleted: 0,
        ideasScouted: 0,
      },
      {
        name: "Pixel",
        role: "UI/Visual Designer",
        emoji: "✏️",
        sessionKey: "agent:designer:main",
        status: "idle" as const,
        level: "specialist" as const,
        skills: ["design", "ui", "visual"],
        canScout: false,
        canBuild: true,
        tasksCompleted: 0,
        ideasScouted: 0,
      },
      {
        name: "Scout",
        role: "User/Market Researcher",
        emoji: "🔍",
        sessionKey: "agent:researcher:main",
        status: "idle" as const,
        level: "specialist" as const,
        skills: ["research", "analysis", "trends"],
        canScout: true,
        canBuild: false,
        tasksCompleted: 0,
        ideasScouted: 0,
      },
      {
        name: "Forge",
        role: "Tech Lead / Engineer",
        emoji: "⚡",
        sessionKey: "agent:engineer:main",
        status: "idle" as const,
        level: "lead" as const,
        skills: ["engineering", "architecture", "code"],
        canScout: false,
        canBuild: true,
        tasksCompleted: 0,
        ideasScouted: 0,
      },
      {
        name: "Lens",
        role: "QA / Usability Tester",
        emoji: "🔬",
        sessionKey: "agent:qa:main",
        status: "idle" as const,
        level: "specialist" as const,
        skills: ["qa", "testing", "usability"],
        canScout: false,
        canBuild: true,
        tasksCompleted: 0,
        ideasScouted: 0,
      },
      {
        name: "Echo",
        role: "Copywriter / Content Designer",
        emoji: "✍️",
        sessionKey: "agent:copy:main",
        status: "idle" as const,
        level: "specialist" as const,
        skills: ["copy", "content", "messaging"],
        canScout: false,
        canBuild: true,
        tasksCompleted: 0,
        ideasScouted: 0,
      },
      {
        name: "Amp",
        role: "Marketer",
        emoji: "📣",
        sessionKey: "agent:marketing:main",
        status: "idle" as const,
        level: "specialist" as const,
        skills: ["marketing", "growth", "launch"],
        canScout: false,
        canBuild: true,
        tasksCompleted: 0,
        ideasScouted: 0,
      },
    ];

    // Check if agents already exist
    const existingAgents = await ctx.db.query("agents").collect();
    if (existingAgents.length > 0) {
      return { message: "Agents already initialized", count: existingAgents.length };
    }

    // Insert all agents
    const insertedIds: Id<"agents">[] = [];
    for (const agent of agents) {
      const id = await ctx.db.insert("agents", agent);
      insertedIds.push(id);
    }

    return { message: `Initialized ${agents.length} agents`, ids: insertedIds };
  },
});
