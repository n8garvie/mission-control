"use client";

/**
 * Single source of truth for icons across Mission Control.
 *
 * Every status, stage, activity-type, nav link, and entity that used to
 * render as an emoji glyph now resolves through this registry. Changing
 * the visual treatment for a domain concept means editing one map entry,
 * not grepping for "📦" across two dozen files.
 *
 *   <Icon name="pipelineStatus.approved" size={16} aria-label="Approved" />
 *
 * Pass `aria-label` for icons that convey meaning standalone; otherwise
 * the wrapper marks them aria-hidden and assumes a sibling text label.
 */

import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Circle,
  CircleCheck,
  Code2,
  Compass,
  Eye,
  FilePlus,
  FileText,
  GitBranch,
  Hammer,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Package,
  PartyPopper,
  Pencil,
  RefreshCcw,
  Rocket,
  Search,
  Ship,
  Sparkles,
  Telescope,
  ThumbsUp,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  // Pipeline status (matches IdeaCard.pipelineStatusConfig)
  "pipelineStatus.scouted":  Telescope,
  "pipelineStatus.reviewing": Eye,
  "pipelineStatus.approved": CircleCheck,
  "pipelineStatus.rejected": XCircle,
  "pipelineStatus.archived": Archive,

  // Build stages (matches IdeaCard.buildStageConfig and home page stepper)
  "buildStage.not_started":         Circle,
  "buildStage.agents_spawning":     Rocket,
  "buildStage.agents_working":      Hammer,
  "buildStage.building_locally":    Code2,
  "buildStage.pushing_to_github":   Package,
  "buildStage.deploying_to_vercel": Ship,
  "buildStage.completed":           CheckCircle2,
  "buildStage.failed":              AlertTriangle,

  // High-level home page stepper aliases
  "stage.scouted":  Lightbulb,
  "stage.approved": CircleCheck,
  "stage.live":     Rocket,

  // Activity feed (matches ActivityFeed.activityIcons)
  "activity.idea_scouted":              Sparkles,
  "activity.idea_created":              FilePlus,
  "activity.idea_approved":             CheckCircle2,
  "activity.idea_rejected":             XCircle,
  "activity.idea_archived":             Archive,
  "activity.build_started":             Hammer,
  "activity.build_completed":           Rocket,
  "activity.build_failed":              AlertTriangle,
  "activity.build_triggered_manually": Rocket,
  "activity.comment_added":             MessageSquare,
  "activity.task_created":              FilePlus,
  "activity.task_updated":              Pencil,
  "activity.agent_heartbeat":           Activity,
  "activity.agent_status_changed":      RefreshCcw,
  "activity.status_change":             RefreshCcw,
  "activity.vote":                      ThumbsUp,
  "activity.default":                   Inbox,

  // Stat overview cards
  "stats.agents": Bot,
  "stats.tasks":  ListChecks,
  "stats.done":   CheckCircle2,
  "stats.ideas":  Lightbulb,

  // Navigation
  "nav.ideas":     Lightbulb,
  "nav.pipeline":  GitBranch,
  "nav.dashboard": LayoutDashboard,
  "nav.tasks":     ListChecks,

  // Entities + brand
  "entity.agent":    Bot,
  "entity.human":    User,
  "entity.moonshot": Rocket,
  "entity.warning":  AlertTriangle,
  "entity.search":   Search,
  "entity.celebrate": PartyPopper,
  "entity.next":     ArrowRight,
  "entity.stats":    BarChart3,
  "brand.logo":      Compass,
  "brand.refresh":   RefreshCcw,
};

export type IconName = keyof typeof REGISTRY | (string & {});

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  /**
   * If the icon conveys meaning by itself (no sibling text), pass `aria-label`.
   * Otherwise the wrapper sets aria-hidden so screen readers ignore the glyph.
   */
  "aria-label"?: string;
  /** Override the rendered SVG element with a fallback when the key is unknown. */
  fallback?: IconName;
  style?: React.CSSProperties;
}

export function Icon({
  name,
  size = 16,
  className,
  strokeWidth = 1.75,
  fallback = "activity.default",
  style,
  ...rest
}: IconProps) {
  const Resolved = REGISTRY[name] ?? REGISTRY[fallback] ?? Circle;
  const ariaLabel = rest["aria-label"];
  return (
    <Resolved
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
    />
  );
}

export function getIcon(name: IconName, fallback: IconName = "activity.default"): LucideIcon {
  return REGISTRY[name] ?? REGISTRY[fallback] ?? Circle;
}

export const iconNames = Object.keys(REGISTRY) as IconName[];
