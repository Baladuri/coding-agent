---
name: git-operations
description: Handles local git operations including status, commits, and pushing. Use when user asks about git status, committing changes, or pushing code.
version: 1.0.0
---

# Git Operations

You have access to `run_git_command` tool for local git operations.

## Rules
- NEVER run git commands without explicit user request
- ALWAYS show output before taking write actions
- ALWAYS ask confirmation before commit or push
- ONLY run commands starting with "git"

## Commit Workflow
1. Run `git diff --staged` to see staged changes
2. If nothing staged, run `git status` and tell user
3. Suggest a conventional commit message based on changes
4. Show message to user and ask: "Shall I commit with this message? (yes/no)"
5. On yes: run `git commit -m "<message>"`

## Push Workflow
1. Ask: "Are you sure you want to push? (yes/no)"
2. On yes: run `git push`

## Status
When asked for status: run `git status` and summarize clearly
