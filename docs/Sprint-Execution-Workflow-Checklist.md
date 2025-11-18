# Sprint Execution Workflow Checklist
## Phase 1d Development Cycle

---

## Pre-Sprint Setup (Before Creating New Chat)

### Preparation
- [ ] Review completed Phase 1d High-Level Specification
- [ ] Identify which sprint (1d.1 through 1d.7) you're executing
- [ ] Ensure main branch is up-to-date: `git pull origin main`
- [ ] Verify local environment healthy (no uncommitted changes)

---

## Sprint Kickoff (New Chat with Claude Code)

### 1. Extract Sprint Definition
- [ ] Copy Sprint definition from Phase 1d Specification (Section 10.1)
- [ ] Include full sprint scope, deliverables, and success criteria
- [ ] Include relevant sections from spec (e.g., for 1d.1 include Section 6.1; for 1d.3 include Section 5)

### 2. Create Detailed Instructions for Claude Code
- [ ] Specify: "Create feature branch: `feature/1d-{sprint-number}`"
- [ ] Provide sprint objectives clearly
- [ ] List all deliverables expected
- [ ] Include success criteria from spec
- [ ] Reference relevant database schema sections
- [ ] Note any dependencies on previous sprints
- [ ] Specify file locations and naming conventions
- [ ] Include: "Push to feature branch when complete"

### 3. Ask Claude Code to Begin Development
- [ ] Submit sprint definition + instructions
- [ ] Request initial architecture/design before coding
- [ ] Allow Claude Code to ask clarifying questions
- [ ] Approve design approach before implementation

### 4. Monitor Claude Code Execution
- [ ] Review initial design/architecture proposal
- [ ] Approve or request modifications
- [ ] Provide feedback on implementation as needed
- [ ] Ensure sprint stays within defined scope
- [ ] Document any scope changes or additions

### 5. Obtain Feature Branch
- [ ] When Claude Code indicates completion
- [ ] Confirm all deliverables claimed complete
- [ ] Get feature branch name and commit hash
- [ ] Close chat with Claude Code

---

## Local Development Phase (On Your Machine)

### 6. Fetch Feature Branch
- [ ] Open PowerShell in project directory
- [ ] Run: `git fetch origin`
- [ ] Run: `git branch -a` (verify feature branch exists)
- [ ] Run: `git checkout feature/1d-{sprint-number}`
- [ ] Verify you're on correct branch: `git status`

### 7. Install Dependencies
- [ ] Run: `npm install` (if dependencies changed)
- [ ] Verify no errors in installation output
- [ ] Check: `npm list` (verify key packages installed)

### 8. Review Code Implementation
- [ ] Open feature branch code in VS Code/Cursor
- [ ] Read through implementation to understand changes
- [ ] Check file structure matches deliverables list
- [ ] Verify naming conventions followed
- [ ] Look for obvious issues before testing

### 9. Database Setup (if applicable to sprint)
- [ ] If sprint includes database changes:
  - [ ] Review SQL migration files created
  - [ ] Connect to Supabase (development instance)
  - [ ] Run migrations: `npm run db:migrate`
  - [ ] Verify table creation: check Supabase dashboard
  - [ ] Verify RLS policies applied correctly
  - [ ] Test multi-tenancy isolation with test data

### 10. Local Build Test
- [ ] Run: `npm run build`
- [ ] Verify build completes without errors
- [ ] Check for warnings or deprecations
- [ ] Fix any build issues immediately

---

## Testing Phase (Using Cursor)

### 11. Run Automated Tests
- [ ] Run: `npm test` (if test suite exists)
- [ ] Review test results
- [ ] If failures: document which tests fail and why
- [ ] Run only new tests if full suite slow: `npm test -- --testPathPattern=1d`

### 12. Manual Testing with Cursor
- [ ] Start dev server: `npm run dev`
- [ ] Open application: `http://localhost:3000`
- [ ] Use Cursor inline editing for quick fixes
- [ ] For each sprint deliverable:
  - [ ] Test happy path (normal flow)
  - [ ] Test error cases (invalid input, timeouts)
  - [ ] Test multi-tenancy (app_code isolation if applicable)
  - [ ] Test data persistence (if database changes)
  - [ ] Test UI responsiveness (if UI changes)

### 13. Test Scenarios Based on Sprint
**If Sprint 1d.1 (Database):**
- [ ] Tables created correctly
- [ ] Columns match specification
- [ ] Data types correct
- [ ] Indexes created
- [ ] RLS policies enforce isolation
- [ ] Audit logging captures events

**If Sprint 1d.2 (Registry & Dashboard):**
- [ ] Registry CRUD endpoints work (create, read, update, delete)
- [ ] Role-function mapping stored correctly
- [ ] Dashboard generates correctly from role
- [ ] Widget loading by ui_widget_id works
- [ ] Responsive design tested on mobile/desktop

**If Sprint 1d.3 (Workflow Engine):**
- [ ] Workflow instance creation succeeds
- [ ] current_node_id transitions correctly
- [ ] Task nodes create work tokens
- [ ] Registry lookup returns correct function
- [ ] Transition conditions evaluate correctly
- [ ] Context data flows through transitions

**If Sprint 1d.4 (Human Tasks):**
- [ ] UI Task Handler loads pending tasks
- [ ] Widget renders with correct input_schema
- [ ] Form validation works
- [ ] Form submission accepted
- [ ] Output validated against output_schema
- [ ] Task marked COMPLETED in database

**If Sprint 1d.5 (Service Tasks):**
- [ ] Work token created for service task
- [ ] Worker queue receives job
- [ ] Mock service called with correct input
- [ ] Response validated against output_schema
- [ ] Task marked COMPLETED
- [ ] Workflow resumes

**If Sprint 1d.6 (Monitoring):**
- [ ] Active instances dashboard loads
- [ ] Instance details view shows state and context
- [ ] Audit history explorer queries correctly
- [ ] Bottleneck analysis calculates times
- [ ] Cycle time reporting available

**If Sprint 1d.7 (Domain Workflows):**
- [ ] Domain workflow definitions load correctly
- [ ] Workflows execute through all nodes
- [ ] Registry entries populated for domain
- [ ] Multi-domain isolation maintained

### 14. Document Issues Found
- [ ] Create list of issues/bugs discovered
- [ ] Note severity (critical, major, minor, enhancement)
- [ ] Prioritize: fix critical/major before merging
- [ ] Minor issues can be tracked for later sprint

---

## Bug Fixing Phase (Using Cursor)

### 15. Fix Critical Issues
- [ ] For each critical bug:
  - [ ] Open file in Cursor
  - [ ] Use Cursor inline editing to fix
  - [ ] Test fix locally
  - [ ] Verify related tests pass
  - [ ] Commit fix: `git add . && git commit -m "Fix: [description]"`

### 16. Fix Major Issues
- [ ] Repeat critical process for major bugs
- [ ] Ensure fixes don't introduce new issues
- [ ] Commit fixes incrementally

### 17. Address Minor Issues / Enhancements
- [ ] Document minor issues for future sprints
- [ ] For quick enhancements:
  - [ ] Implement in Cursor
  - [ ] Test locally
  - [ ] Commit if it improves sprint deliverables
  - [ ] Defer if outside sprint scope

### 18. Final Local Verification
- [ ] Run full test suite: `npm test`
- [ ] Rebuild: `npm run build`
- [ ] Restart dev server and spot-check key features
- [ ] Verify no console errors in browser

---

## Git Integration Phase

### 19. Prepare for Main Branch Integration
- [ ] Ensure feature branch is clean and tested
- [ ] Check git status: `git status` (should show clean)
- [ ] View recent commits: `git log --oneline -10`
- [ ] Verify all fixes committed

### 20. Create Pull Request
- [ ] Push feature branch (if not already pushed): `git push origin feature/1d-{sprint-number}`
- [ ] Go to GitHub repository
- [ ] Create Pull Request from feature branch → main
- [ ] Title: "Sprint 1d.{number}: [Sprint Name]"
- [ ] Description: List deliverables, note any issues fixed, reference spec
- [ ] Add labels if available (sprint, phase-1d, tested)

### 21. Code Review (Self-Review)
- [ ] Review PR diff on GitHub
- [ ] Check: All sprint deliverables present
- [ ] Check: No accidental changes outside sprint scope
- [ ] Check: Commits have clear messages
- [ ] Check: No merge conflicts with main
- [ ] Request review from team if applicable

### 22. Merge to Main
- [ ] Approve PR (or wait for review)
- [ ] Click "Merge pull request" on GitHub
- [ ] Select "Squash and merge" (keeps history clean) or "Create a merge commit"
- [ ] Delete feature branch after merge
- [ ] Verify merge successful

### 23. Update Local Main Branch
- [ ] Switch to main: `git checkout main`
- [ ] Pull latest: `git pull origin main`
- [ ] Verify feature branch changes in main: `git log --oneline -5`

---

## Post-Sprint Wrap-Up

### 24. Document Sprint Completion
- [ ] List all deliverables completed
- [ ] Note any issues found and fixed
- [ ] Document any scope changes
- [ ] Capture lessons learned

### 25. Plan Next Sprint
- [ ] Review Phase 1d spec for next sprint (1d.{n+1})
- [ ] Note any dependencies from current sprint
- [ ] Identify potential blockers or risks
- [ ] Prepare sprint definition for next chat

### 26. Prepare for Next Chat
- [ ] Ensure main branch clean and up-to-date
- [ ] Verify local environment working
- [ ] Have Phase 1d spec ready
- [ ] Have sprint 1d.{n+1} definition ready
- [ ] Create new chat for next sprint

---

## Troubleshooting Reference

### Branch Issues
- **Branch doesn't exist:** Verify feature branch name correct, try `git fetch origin` again
- **Can't switch branches:** Commit or stash changes: `git stash`
- **Merge conflicts:** Use Cursor's merge conflict resolver, or use VS Code built-in merge editor

### Build Issues
- **npm install fails:** Delete node_modules and package-lock.json, try again
- **Build errors:** Check Node version: `node --version`, should be 18+
- **TypeScript errors:** Run `npm run type-check` for detailed errors

### Database Issues
- **Migration fails:** Check Supabase connection, verify SQL syntax, check for existing tables
- **RLS policy error:** Verify app_code parameter passed to queries, check policy logic
- **Data isolation fails:** Review RLS policies, verify app_code in test data

### Testing Issues
- **Tests fail:** Run `npm test -- --verbose` for details
- **Test timeout:** Increase timeout in test configuration, check for hanging promises
- **Mock data missing:** Verify test database has required seed data

### Git Issues
- **Uncommitted changes blocking checkout:** `git stash` to save changes, switch branch, `git stash pop` to restore
- **Push rejected:** Pull first: `git pull origin feature/branch`, resolve conflicts, try push again
- **Merge conflicts:** Use Cursor's merge resolution, manually edit files, commit resolution

---

## Quick Command Reference

```bash
# Branch operations
git fetch origin
git branch -a
git checkout feature/1d-{sprint}
git status
git log --oneline -5

# Development
npm install
npm run dev
npm run build
npm test

# Database
npm run db:migrate
npm run db:seed

# Git commits
git add .
git commit -m "message"
git push origin feature/1d-{sprint}

# Cleanup
git stash
git reset --hard HEAD
```

---

## Checklist Summary

**Pre-Sprint:** 2 items  
**Sprint Kickoff:** 5 items  
**Local Development:** 4 items  
**Testing:** 7 items  
**Bug Fixing:** 4 items  
**Git Integration:** 5 items  
**Post-Sprint:** 3 items  

**Total:** 30 checkpoints per sprint cycle

---

**Document Status:** Sprint Execution Workflow Guide  
**Version:** 1.0  
**Applies To:** All Phase 1d Sprints (1d.1 through 1d.7)
