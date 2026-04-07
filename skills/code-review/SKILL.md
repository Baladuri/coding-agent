---
name: code-review
description: Reviews code for quality, bugs, security issues, and improvements. Use when user asks to review code, check for bugs, or analyze code quality.
version: 1.0.0
---

# Code Review

When reviewing code:

## What to Check
- Bugs and edge cases
- Missing error handling
- Security vulnerabilities (injection, auth, exposed secrets)
- Performance issues
- Missing tests
- Code clarity and naming

## Review Format
### Summary
<2-3 sentences on what the code does>

### Issues Found
<bullet points — severity: critical/major/minor>

### Suggestions
<actionable improvements>

### Verdict
✅ Looks good | ⚠️ Minor issues | ❌ Needs changes

## Rules
- Be specific — reference exact lines or functions
- Be constructive — suggest fixes not just problems
- Prioritize security and correctness over style
