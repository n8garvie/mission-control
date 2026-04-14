import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all ideas
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ideas = await ctx.db.query("ideas").order("desc").collect();
    return ideas;
  },
});

// List ideas by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("building"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
    return ideas;
  },
});

// Get a specific idea
export const get = query({
  args: { id: v.id("ideas") },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.id);
    return idea;
  },
});

// Get pending ideas (for scout agent)
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();
    return ideas;
  },
});

// Get approved ideas ready for building
export const getApproved = query({
  args: {},
  handler: async (ctx) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .take(5);
    return ideas;
  },
});

// Create a new idea (used by Scout agent)
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    targetAudience: v.string(),
    mvpScope: v.string(),
    potential: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("moonshot")
    ),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    scoutAgentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const ideaId = await ctx.db.insert("ideas", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_created",
      message: `💡 New idea scouted: ${args.title}`,
    });

    return ideaId;
  },
});

// Approve an idea and prepare for building
export const approve = mutation({
  args: {
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.status !== "pending") throw new Error("Idea must be pending to approve");

    await ctx.db.patch(args.ideaId, {
      status: "approved",
      approvedAt: Date.now(),
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_approved",
      message: `✅ Idea approved for building: ${idea.title}`,
    });

    return args.ideaId;
  },
});

// Mark idea as building (overnight build started)
export const markBuilding = mutation({
  args: {
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.status !== "approved") throw new Error("Idea must be approved before building");

    await ctx.db.patch(args.ideaId, {
      status: "building",
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_building",
      message: `🔨 Build started for: ${idea.title}`,
    });

    return args.ideaId;
  },
});

// Mark idea as done (deployment complete)
export const markDone = mutation({
  args: {
    ideaId: v.id("ideas"),
    deployedUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.status !== "building") throw new Error("Idea must be building to mark done");

    await ctx.db.patch(args.ideaId, {
      status: "done",
      deployedUrl: args.deployedUrl,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_deployed",
      message: `🚀 Deployed: ${idea.title}${args.deployedUrl ? ` - ${args.deployedUrl}` : ""}`,
    });

    return args.ideaId;
  },
});

// Update idea (general updates)
export const update = mutation({
  args: {
    ideaId: v.id("ideas"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    mvpScope: v.optional(v.string()),
    potential: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("moonshot")
      )
    ),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { ideaId, ...updates } = args;
    const idea = await ctx.db.get(ideaId);
    if (!idea) throw new Error("Idea not found");

    await ctx.db.patch(ideaId, updates);

    return ideaId;
  },
});

// Delete an idea (and add to rejected list to prevent duplicates)
export const remove = mutation({
  args: {
    ideaId: v.id("ideas"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    // Save to rejected ideas list to prevent future duplicates
    await ctx.db.insert("rejectedIdeas", {
      title: idea.title,
      description: idea.description,
      rejectedAt: Date.now(),
      reason: args.reason,
    });

    await ctx.db.delete(args.ideaId);

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_deleted",
      message: `🗑️ Idea removed: ${idea.title}`,
    });

    return args.ideaId;
  },
});

// Check if an idea title was previously rejected
export const isRejected = query({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const rejected = await ctx.db
      .query("rejectedIdeas")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .first();
    return rejected !== null;
  },
});

// List all rejected ideas (for Scout to check against)
export const listRejected = query({
  args: {},
  handler: async (ctx) => {
    const rejected = await ctx.db
      .query("rejectedIdeas")
      .order("desc")
      .collect();
    return rejected;
  },
});

// Get ideas stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allIdeas = await ctx.db.query("ideas").collect();
    
    return {
      total: allIdeas.length,
      pending: allIdeas.filter(i => i.status === "pending").length,
      approved: allIdeas.filter(i => i.status === "approved").length,
      building: allIdeas.filter(i => i.status === "building").length,
      done: allIdeas.filter(i => i.status === "done").length,
    };
  },
});

// Reset building idea back to approved (for stuck builds)
export const resetToApproved = mutation({
  args: {
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    await ctx.db.patch(args.ideaId, {
      status: "approved",
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_reset",
      message: `↩️ Reset to approved: ${idea.title}`,
    });

    return args.ideaId;
  },
});
