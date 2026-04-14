# GitHub Repo Sync to Wiki Inbox

## Overview
Automatically download GitHub repositories I **star from other people**, add them to the wiki inbox folder, and maintain an indexed catalog.

## Problem
- I star interesting repos on GitHub but they don't sync to my local machine
- No centralized index of starred repos in my wiki
- Manual process to clone and organize repos I want to reference later
- Lose track of why I starred something

## Solution
A background service that:
1. Monitors my GitHub account for **new starred repos from other users** (not my own)
2. Automatically clones them to a local directory
3. Adds entries to wiki inbox for indexing
4. Maintains a catalog/index of all starred repos with metadata

## Features
- [ ] GitHub API integration (polling for new stars)
- [ ] Auto-clone to `~/wiki/inbox/repos/`
- [ ] Wiki index generation (markdown table)
- [ ] Tagging system (language, topic, why starred)
- [ ] README extraction for quick reference
- [ ] Periodic sync (daily/hourly)
- [ ] **EXCLUDE my own repos** - only download others' repos I star

## Technical Approach
- GitHub Personal Access Token for API access
- Poll `https://api.github.com/users/n8garvie/starred` endpoint
- Filter out repos where `owner.login === 'n8garvie'`
- Local git operations
- Markdown index generation
- Integration with existing wiki structure

## Success Criteria
- New starred repos appear in local wiki inbox within 1 hour
- My own repos are never downloaded (only starred repos from others)
- Indexed catalog is always up-to-date
- Searchable by language, tags, description, and why I starred it
