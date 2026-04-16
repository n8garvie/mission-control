import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get current dashboard stats
export const get = query({
  args: {},
  handler: async (ctx) => {
    const stats = await ctx.db.query("dashboardStats").first();
    
    if (!stats) {
      // Return default stats if none exist
      return {
        activeAgents: 2,
        openTasks: 5,
        completedThisWeek: 0,
        pendingIdeas: 11,
        totalBuilds: 0,
        sparklines: {
          activeAgents: [0, 0, 1, 1, 2, 2, 3, 2],
          openTasks: [5, 6, 7, 8, 8, 9, 10, 5],
          completedThisWeek: [0, 0, 0, 1, 1, 2, 2, 0],
          pendingIdeas: [2, 3, 4, 5, 6, 8, 10, 11],
        },
        lastUpdated: Date.now(),
      };
    }
    
    return stats;
  },
});

// Update dashboard stats (called by sync script)
export const update = mutation({
  args: {
    activeAgents: v.number(),
    openTasks: v.number(),
    completedThisWeek: v.number(),
    pendingIdeas: v.number(),
    totalBuilds: v.number(),
    sparklines: v.object({
      activeAgents: v.array(v.number()),
      openTasks: v.array(v.number()),
      completedThisWeek: v.array(v.number()),
      pendingIdeas: v.array(v.number()),
    }),
    lastUpdated: v.optional(v.number()),
    runningBuilds: v.optional(v.number()),
    pipeline: v.optional(v.object({
      buildsStarted: v.number(),
      buildsWithCode: v.number(),
      buildsCommitted: v.number(),
      buildsDeployed: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("dashboardStats").first();
    
    const data = {
      activeAgents: args.activeAgents,
      openTasks: args.openTasks,
      completedThisWeek: args.completedThisWeek,
      pendingIdeas: args.pendingIdeas,
      totalBuilds: args.totalBuilds,
      sparklines: args.sparklines,
      runningBuilds: args.runningBuilds ?? 0,
      pipeline: args.pipeline ?? {
        buildsStarted: args.totalBuilds,
        buildsWithCode: 0,
        buildsCommitted: 0,
        buildsDeployed: 0,
      },
      lastUpdated: args.lastUpdated ?? Date.now(),
    };
    
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("dashboardStats", data);
    }
  },
});
