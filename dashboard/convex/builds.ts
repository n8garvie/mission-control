import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all builds for the pipeline
export const list = query({
  args: {},
  handler: async (ctx) => {
    const builds = await ctx.db.query("builds").order("desc").collect();
    return builds;
  },
});

// Get builds by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("building"),
      v.literal("agent_complete"),
      v.literal("github_pushed"),
      v.literal("vercel_deployed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("builds")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// Get pipeline stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allBuilds = await ctx.db.query("builds").collect();
    
    return {
      total: allBuilds.length,
      pending: allBuilds.filter(b => b.status === "pending").length,
      building: allBuilds.filter(b => b.status === "building").length,
      agentComplete: allBuilds.filter(b => b.status === "agent_complete").length,
      githubPushed: allBuilds.filter(b => b.status === "github_pushed").length,
      vercelDeployed: allBuilds.filter(b => b.status === "vercel_deployed").length,
      failed: allBuilds.filter(b => b.status === "failed").length,
    };
  },
});

// Create or update a build
export const upsert = mutation({
  args: {
    buildId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("building"),
      v.literal("agent_complete"),
      v.literal("github_pushed"),
      v.literal("vercel_deployed"),
      v.literal("failed")
    ),
    stage: v.number(),
    potential: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("moonshot"))),
    githubUrl: v.optional(v.string()),
    vercelUrl: v.optional(v.string()),
    ideaId: v.optional(v.id("ideas")),
  },
  handler: async (ctx, args) => {
    // Check if build already exists
    const existing = await ctx.db
      .query("builds")
      .withIndex("by_build_id", (q) => q.eq("buildId", args.buildId))
      .first();

    if (existing) {
      // Update existing build
      await ctx.db.patch(existing._id, {
        ...args,
        completedAt: args.status === "vercel_deployed" ? Date.now() : existing.completedAt,
      });
      return existing._id;
    } else {
      // Create new build
      return await ctx.db.insert("builds", {
        ...args,
        startedAt: Date.now(),
        agents: {
          forge: "pending",
          pixel: "pending",
          echo: "pending",
          integrator: "pending",
          lens: "pending",
        },
      });
    }
  },
});

// Update agent status
export const updateAgentStatus = mutation({
  args: {
    buildId: v.string(),
    agent: v.union(v.literal("forge"), v.literal("pixel"), v.literal("echo"), v.literal("integrator"), v.literal("lens")),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const build = await ctx.db
      .query("builds")
      .withIndex("by_build_id", (q) => q.eq("buildId", args.buildId))
      .first();

    if (!build) throw new Error("Build not found");

    const agents = { ...build.agents, [args.agent]: args.status };
    
    // Auto-update build status based on agent completion
    let buildStatus = build.status;
    if (agents.forge === "complete" && agents.pixel === "complete" && agents.echo === "complete") {
      buildStatus = "agent_complete";
    }

    await ctx.db.patch(build._id, {
      agents,
      status: buildStatus,
    });

    return build._id;
  },
});

// Delete all builds (reset)
export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const builds = await ctx.db.query("builds").collect();
    for (const build of builds) {
      await ctx.db.delete(build._id);
    }
    return { deleted: builds.length };
  },
});
