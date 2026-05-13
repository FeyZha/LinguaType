# OpenSpec

This directory stores OpenSpec proposals, tasks, and specification updates for LinguaType.

Use OpenSpec for non-trivial product or architecture changes before implementation:

1. Propose the change with `/opsx:propose "<change summary>"`.
2. Review the generated files under `openspec/changes/<change-name>/`.
3. Implement only after the proposal and tasks are clear.
4. Archive completed changes with `/opsx:archive`.

Keep LinguaType's existing product constraints in `AGENTS.md` as the source of truth while writing OpenSpec artifacts.
