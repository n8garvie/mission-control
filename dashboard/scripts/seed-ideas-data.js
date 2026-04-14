const ideas = [
  {
    title: "Watch Collection Portfolio",
    description: "Track watch collection value, market trends, and investment performance. Includes automated price tracking from Chrono24.",
    targetAudience: "Watch collectors",
    mvpScope: "Single-page app with manual entry, price history chart, CSV export",
    potential: "high",
    source: "r/watches",
    tags: ["watches", "finance", "portfolio"]
  },
  {
    title: "Espresso Shot Logger",
    description: "Dial-in tracker for espresso enthusiasts. Log grind settings, yield ratios, taste notes, and bean info.",
    targetAudience: "Home baristas",
    mvpScope: "Mobile-first PWA with form entry, history view, simple stats",
    potential: "medium",
    source: "r/espresso",
    tags: ["coffee", "tracking", "mobile"]
  },
  {
    title: "Porsche Spec Comparator",
    description: "Compare 997.2 specs, options, and pricing. Decode VINs and estimate values.",
    targetAudience: "Porsche enthusiasts",
    mvpScope: "Search interface, spec tables, VIN decoder",
    potential: "medium",
    source: "r/Porsche",
    tags: ["automotive", "reference", "data"]
  },
  {
    title: "Side Project Launch Kit",
    description: "Pre-built components and templates for launching side projects fast. Landing pages, waitlists, auth.",
    targetAudience: "Indie hackers",
    mvpScope: "Component library with 5 templates, Vercel deploy button",
    potential: "high",
    source: "r/SideProject",
    tags: ["saas", "templates", "launch"]
  },
  {
    title: "Baby Sleep Tracker",
    description: "Minimal data-first sleep tracking for new parents. No cutesy UI, just charts and insights.",
    targetAudience: "New parents",
    mvpScope: "Simple form entry, daily/weekly charts, export to CSV",
    potential: "medium",
    source: "family",
    tags: ["baby", "tracking", "data"]
  },
  {
    title: "API Dependency Monitor",
    description: "Monitor third-party API health and get alerts when services go down or change.",
    targetAudience: "Developers",
    mvpScope: "Dashboard with status checks, email alerts, uptime history",
    potential: "high",
    source: "r/webdev",
    tags: ["devops", "monitoring", "api"]
  },
  {
    title: "DevRel Analytics Dashboard",
    description: "Track developer community metrics across GitHub, Discord, Twitter in one place.",
    targetAudience: "Developer advocates",
    mvpScope: "GitHub integration, basic charts, weekly reports",
    potential: "medium",
    source: "Product Hunt",
    tags: ["analytics", "github", "community"]
  }
];

console.log(JSON.stringify(ideas, null, 2));
