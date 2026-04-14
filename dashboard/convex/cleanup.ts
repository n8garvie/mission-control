import { internalMutation } from "./_generated/server";

export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete all activities
    const activities = await ctx.db.query("activities").collect();
    for (const a of activities) {
      await ctx.db.delete(a._id);
    }
    
    // Delete all ideas
    const ideas = await ctx.db.query("ideas").collect();
    for (const i of ideas) {
      await ctx.db.delete(i._id);
    }
    
    return `Cleared ${activities.length} activities and ${ideas.length} ideas`;
  }
});
