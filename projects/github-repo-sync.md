# GitHub Repo Sync to Wiki Inbox

## Overview
Automatically download GitHub repositories I star or create, add them to the wiki inbox folder, and maintain an indexed catalog.

## Problem
- I create repos on GitHub but they don't automatically sync to my local machine
- No centralized index of all my repos in my wiki
- Manual process to clone and organize new repos

## Solution
A background service that:
1. Monitors my GitHub account for new repos (created or starred)
2. Automatically clones them to a local directory
3. Adds entries to wiki inbox for indexing
4. Maintains a catalog/index of all repos with metadata

## Features
- [ ] GitHub API integration (webhook or polling)
- [ ] Auto-clone to `~/wiki/inbox/repos/`
- [ ] Wiki index generation (markdown table)
- [ ] Tagging system (language, type, status)
- [ ] README extraction for quick reference
- [ ] Periodic sync (daily/hourly)
- [ ] Configurable filters (only my repos, include stars, etc.)

## Technical Approach
- GitHub Personal Access Token for API access
- GitHub Webhooks or scheduled polling
- Local git operations
- Markdown index generation
- Integration with existing wiki structure

## Success Criteria
- New GitHub repos appear in local wiki inbox within 1 hour
- Indexed catalog is always up-to-date
- Searchable by language, tags, description
