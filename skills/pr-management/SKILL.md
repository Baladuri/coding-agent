---
name: pr-management
description: Handles GitHub PR creation, summarization, review, and inbox management. Use when user mentions pull requests, PRs, reviewing code, or creating PRs.
version: 1.0.0
---

# PR Management

## Available GitHub Tools
You have these GitHub MCP tools - use them directly, do not say you lack GitHub access:
- list_pull_requests
- get_pull_request  
- get_pull_request_files
- create_pull_request
- create_pull_request_review
- get_file_contents

When asked about PRs, call these tools immediately without disclaimers.

You have GitHub MCP tools available. Use them directly — never tell the user you don't have GitHub access.

## PR Creation
When user asks to create a PR:
1. Run `git branch --show-current` for branch name
2. Run `git diff main...HEAD --stat` for changes
3. Read changed files to understand what was built
4. Suggest title and description:
   Title: <type>: <short description>
   ## What changed
   ## Why  
   ## How to test
5. Ask: "Shall I create this PR? (yes/no)"
6. On yes: call `create_pull_request` MCP tool with owner, repo, head, base: "main", title, body

## PR Summarizer
When user asks to summarize a PR:
1. Use `get_pull_request` to fetch details
2. Use `get_pull_request_files` to get changed files
3. Return plain English summary — max 200 words

## PR Inbox
When user asks for PRs assigned to them:
1. Use `list_pull_requests` with state=open
2. List PRs where user is requested reviewer
3. Ask which one to review

## PR Review
When user asks to review a PR:
1. Fetch PR details and files via GitHub MCP
2. Read changed files
3. Provide structured review:
   ### Summary
   ### Potential Issues
   ### Suggestions
   ### Verdict: ✅/⚠️/❌
4. Ask: "Shall I post this review? (yes/no)"
5. On yes: use `create_pull_request_review` MCP tool

## Approve/Request Changes
- Approve: confirm first, then use `create_pull_request_review` with event=APPROVE
- Request changes: ask for comments, then use event=REQUEST_CHANGES

## Rules
- NEVER approve without reading the code first
- ALWAYS show review before posting
- ALWAYS confirm before any write operation
