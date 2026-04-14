import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all documents
export const list = query({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").order("desc").collect();

    // Enrich with author details
    const enrichedDocs = await Promise.all(
      documents.map(async (doc) => {
        const author = doc.authorId ? await ctx.db.get(doc.authorId) : null;
        const task = doc.taskId ? await ctx.db.get(doc.taskId) : null;
        return {
          ...doc,
          author,
          task,
        };
      })
    );

    return enrichedDocs;
  },
});

// List documents by task
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Enrich with author details
    const enrichedDocs = await Promise.all(
      documents.map(async (doc) => {
        const author = doc.authorId ? await ctx.db.get(doc.authorId) : null;
        return {
          ...doc,
          author,
        };
      })
    );

    return enrichedDocs;
  },
});

// List documents by project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return documents;
  },
});

// Create a document
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("brief"),
      v.literal("design"),
      v.literal("code"),
      v.literal("copy"),
      v.literal("protocol")
    ),
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
    authorId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const docId = await ctx.db.insert("documents", {
      ...args,
      version: 1,
    });

    // Log activity
    const author = args.authorId ? await ctx.db.get(args.authorId) : null;
    const authorName = author ? `${author.emoji} ${author.name}` : "Nathan";

    await ctx.db.insert("activities", {
      type: "document_created",
      agentId: args.authorId,
      taskId: args.taskId,
      projectId: args.projectId,
      message: `${authorName} created document: ${args.title}`,
    });

    return docId;
  },
});

// Get a specific document
export const get = query({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;

    const author = doc.authorId ? await ctx.db.get(doc.authorId) : null;
    const task = doc.taskId ? await ctx.db.get(doc.taskId) : null;

    return {
      ...doc,
      author,
      task,
    };
  },
});
