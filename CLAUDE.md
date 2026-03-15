# CLAUDE.md

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- Re-enter plan mode if scope expands mid-task
- Flag any irreversible operations (deletes, migrations) in the plan
- At the end of each plan, give me a list of unresolved questions to answer, if any.
EOF

## Unit Testing
- Write tests before fixing bugs (reproduce first)
- Never delete existing tests; fix or update them
- Mock external services; never hit real APIs in tests
- Each test should test one behavior, not one function
- Run the full test suite before marking a task complete

## Git / GitHub Usage
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Reference issue numbers: `fix: correct overflow (#142)`
- Body explains *why*, not *what*
- Squash WIP commits before pushing to main
- Never commit secrets, keys, or `.env` files

### Worktrees
- Use worktrees for parallel feature work: `git worktree add ../project-feat feat/name`
- Never share a worktree path between two agents simultaneously
- Remove stale worktrees with `git worktree prune` after merge
- Keep the main worktree on `main`; experiment in worktrees
- Store worktrees outside the main repo directory to avoid confusion
- Lock worktrees used by long-running agents
- Document active worktrees in a `WORKTREES.md` if > 3 are live

## Releasing

1. Update `version` in `package.json`
2. Add release notes to `CHANGELOG.md` under `## [x.y.z] - YYYY-MM-DD` (Keep a Changelog format)
3. Commit: `chore: bump version to x.y.z`
4. Tag: `git tag vx.y.z`
5. Push: `git push origin main --tags`
6. CI builds Win+Mac installers and creates GitHub Release with changelog as body
- Never push a tag without a matching CHANGELOG.md entry — the build will fail
- Version in package.json must match the tag (minus the `v` prefix)

## Subagent Usage

### Models
- Use `claude-haiku-4-5` for bulk/cheap tasks: summarization, classification, formatting
- Use `claude-sonnet-4-6` for code generation, reasoning, multi-step tasks
- Use `claude-opus-4-6` only for architect-level planning or complex synthesis

### Worktrees for Subagents
- Each subagent that writes files gets its own worktree
- Subagent worktrees are read-only to the orchestrator until merged
- Name subagent worktrees: `agent/<task-slug>`

### Pull Requests
- Subagents open draft PRs; orchestrator promotes to ready
- PR title follows the same Conventional Commits format as commits

## Response Style

### Brevity
- Answer the question first, then explain if needed
- Omit preamble: don't restate what was asked
- Use bullet points for lists > 2 items
- Prefer code over prose when demonstrating behavior
- One sentence of context is usually enough; more requires justification
- Avoid hedging phrases: "it's worth noting", "it's important to remember"
- Don't summarize what you just did at the end of a response

### Grammar & Tone
- Use active voice by default
- Prefer concrete nouns over nominalizations ("use" not "utilization")
- Spell out acronyms on first use
- Avoid passive constructions unless the subject is unknown
- Present tense for code behavior: "returns", not "will return"

# Execution Rules

## Windows Command Execution
- Execute ONE command per Bash call, never chain with &&
- After each command, verify success before continuing
- If a command fails, stop and report the error with the exit code
- Do not use && || ; to chain commands
- Do not use cd && somecommand — instead set the working directory separately

## Git Commands
- Run git commands one at a time
- Always check status after operations that modify files


