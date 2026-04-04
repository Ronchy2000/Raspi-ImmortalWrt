# Documentation Naming and Ordering Guide

This page is not a user tutorial.

Its purpose is to help maintainers:

- keep document naming consistent
- control homepage document order
- avoid pushing beginners into advanced or risky docs too early

If you maintain this repository, read this before adding or renaming docs.

## Core rules

### 1. Catalog order follows the learning path, not alphabetical order

Inside the same category, documents should follow:

**beginner first -> daily usage -> maintenance/troubleshooting -> advanced options -> legacy references**

This rule is more important than filename sorting.

### 2. Titles must make the purpose obvious

Avoid vague titles.

Prefer title patterns such as:

- `Primer`
- `Quick Start`
- `Deployment Guide`
- `Restore Guide`
- `Advanced`
- `Legacy Reference`
- `Troubleshooting`

Avoid:

- two docs with nearly identical titles
- titles that do not tell whether the doc is beginner-safe
- old and new workflows with names that look the same

### 3. High-risk docs must be labeled explicitly

Examples:

- `(Advanced)`
- `(Legacy Reference)`
- `(High Risk)`

Readers should understand the level from the catalog before opening the page.

### 4. One topic should have one primary tutorial

For the same operational topic, define one clear primary document that owns the full procedure.

Other documents should only provide:

- scope guidance
- risk notes
- brief context
- links back to the primary tutorial

Do not duplicate the same step-by-step workflow across multiple documents.

For example:

- the storage guide can own system identification, route selection, and the main workflow
- the `extroot` document should only cover the advanced `squashfs + overlay` path
- the maintenance document should keep daily checks and links, not a second full expansion tutorial

## Current recommended order

For maintenance-related docs on the homepage, the current order should be:

1. `docs/OpenWrt_Backup_Resotre.md`
2. `docs/System_Maintenance.md`
3. `docs/Storage_Expansion_Guide.md`
4. `docs/ExtendOverlaySize.md`
5. `docs/OpenWrt_AutoBackup.md`

Reasoning:

- give readers restore and maintenance basics first
- then explain storage expansion concepts
- then show extroot as the advanced option
- keep legacy auto-backup reference later

## Files that must be updated when adding a new visible doc

If you add a user-facing document that should appear on the homepage, also check:

1. `README.md`
2. `README_EN.md`
3. `frontend/lib/docs.ts`
4. the corresponding changelog files under `changelogs/`

If the new doc belongs to a learning sequence, confirm that its homepage order is still correct.
If it overlaps with an existing topic, also decide which document is the primary one before adding more procedural content.

## Frontend ordering mechanism

Homepage ordering is intentionally curated.

Update this table when ordering matters:

- `DOC_CATALOG_ORDER` in `frontend/lib/docs.ts`

If you only add the Markdown file but do not update the order table, the document may appear in the wrong place.

## Naming examples

Good titles:

- `ImmortalWrt Storage Expansion and Partitioning Primer`
- `ImmortalWrt Overlay and Extroot Expansion (Advanced)`
- `ImmortalWrt GitHub Auto Backup (Legacy Reference)`

Bad titles:

- `Smart Backup`
- `Expansion Guide`
- `System Notes`

because they are too broad and make the differences unclear.

## One-line principle

The goal of document ordering in this repository is not visual neatness.

It is:

**help beginners read in the right order and avoid unnecessary mistakes.**
