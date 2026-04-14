import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all subscriptions
export const list = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").order("desc").collect();
    
    // Fetch usage windows for each subscription
    const subsWithWindows = await Promise.all(
      subscriptions.map(async (sub) => {
        const windows = await ctx.db
          .query("usageWindows")
          .withIndex("by_subscription", (q) => q.eq("subscriptionId", sub._id))
          .collect();
        
        return {
          ...sub,
          id: sub._id,
          usageWindows: windows.map(w => ({
            ...w,
            id: w._id,
            resetAt: new Date(w.resetAt),
          })),
        };
      })
    );
    
    return subsWithWindows;
  },
});

// Get a single subscription
export const get = query({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.id);
    if (!sub) return null;
    
    const windows = await ctx.db
      .query("usageWindows")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.id))
      .collect();
    
    return {
      ...sub,
      id: sub._id,
      usageWindows: windows.map(w => ({
        ...w,
        id: w._id,
        resetAt: new Date(w.resetAt),
      })),
    };
  },
});

// Create a new subscription
export const create = mutation({
  args: {
    name: v.string(),
    provider: v.string(),
    cost: v.number(),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    usage: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    renewalDate: v.string(),
    category: v.string(),
    iconName: v.string(),
    description: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const subscriptionId = await ctx.db.insert("subscriptions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    
    return subscriptionId;
  },
});

// Update a subscription
export const update = mutation({
  args: {
    id: v.id("subscriptions"),
    name: v.optional(v.string()),
    provider: v.optional(v.string()),
    cost: v.optional(v.number()),
    billingCycle: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
    usage: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    renewalDate: v.optional(v.string()),
    category: v.optional(v.string()),
    iconName: v.optional(v.string()),
    description: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Delete a subscription
export const remove = mutation({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    // Delete associated usage windows first
    const windows = await ctx.db
      .query("usageWindows")
      .withIndex("by_subscription", (q) => q.eq("subscriptionId", args.id))
      .collect();
    
    for (const window of windows) {
      await ctx.db.delete(window._id);
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Add a usage window to a subscription
export const addUsageWindow = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    name: v.string(),
    durationMs: v.number(),
    used: v.number(),
    limit: v.number(),
    unit: v.string(),
    resetAt: v.number(),
  },
  handler: async (ctx, args) => {
    const windowId = await ctx.db.insert("usageWindows", {
      ...args,
      createdAt: Date.now(),
    });
    
    return windowId;
  },
});

// Get stats for dashboard
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();
    
    const totalMonthly = subscriptions
      .filter((s) => s.billingCycle === "monthly")
      .reduce((sum, s) => sum + s.cost, 0);
    
    const totalYearly = subscriptions
      .filter((s) => s.billingCycle === "yearly")
      .reduce((sum, s) => sum + s.cost, 0);
    
    const totalMonthlyCost = totalMonthly + totalYearly / 12;
    
    // Count upcoming renewals (next 14 days)
    const today = new Date();
    const upcomingRenewals = subscriptions.filter((s) => {
      const renewal = new Date(s.renewalDate);
      const diffDays = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 14 && diffDays >= 0;
    }).length;
    
    // Count low usage
    const lowUsage = subscriptions.filter((s) => s.usage === "low").length;
    
    return {
      totalSubscriptions: subscriptions.length,
      totalMonthlyCost,
      totalYearlyCost: totalMonthlyCost * 12,
      upcomingRenewals,
      lowUsage,
    };
  },
});

// Clear all subscriptions
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const subscriptions = await ctx.db.query("subscriptions").collect();
    
    for (const sub of subscriptions) {
      // Delete associated usage windows
      const windows = await ctx.db
        .query("usageWindows")
        .withIndex("by_subscription", (q) => q.eq("subscriptionId", sub._id))
        .collect();
      
      for (const window of windows) {
        await ctx.db.delete(window._id);
      }
      
      await ctx.db.delete(sub._id);
    }
    
    return { message: "Cleared all subscriptions", count: subscriptions.length };
  },
});
