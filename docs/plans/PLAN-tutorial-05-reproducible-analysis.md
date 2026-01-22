# Plan: Update Tutorial 05 - Reproducible Analysis

**Target file**: `docs/tutorials/05-reproducible-analysis.md`
**Style guide**: `docs/TUTORIAL-STYLE-GUIDE.md`

## Current Issues

1. **Missing standard header** - Needs audience, time, prerequisites, last updated
2. **No mention of theme/settings persistence** - These also persist
3. **GQL Console shortcuts may be outdated** - Verify Cmd+` works
4. **URL example domain is placeholder** - Should use real URL
5. **Missing "Try It Yourself" with real workflow**

## Required Changes

### 1. Add Standard Header

```markdown
# Tutorial 5: Reproducible Analysis

> **Audience**: Power users who need to save, share, and reproduce their work
> **Time**: 25-35 minutes
> **Prerequisites**: Comfortable with GQL queries ([Tutorial 3](03-advanced-queries.md))
> **Last updated**: Session 23 (2026-01-22)

## What You'll Learn
- Understanding URL state persistence
- Sharing views with collaborators
- Using the GQL Console for scientific workflows
- Saving and organizing queries
- Creating reproducible analysis scripts
- Best practices for publication-ready work
```

### 2. Update URL Example

Change placeholder URL:

```markdown
### What's in the URL

```
https://teammaclean.github.io/gbetter/?chr=chr17&start=7668421&end=7687490
```

This encodes:
- Current chromosome (`chr=chr17`)
- Start position (`start=7668421`)
- End position (`end=7687490`)
```

### 3. Add Settings Persistence Section

Add after URL State section:

```markdown
## Step 1.5: Settings Persistence

GBetter also persists your display preferences.

### What's saved automatically

- **Theme** (Light/Dark/High-Contrast)
- **Color palette** (Set2/Dark2/Paired)
- **Gene model style**

### Where it's stored

Settings are saved in your browser's localStorage:
- Persists across sessions
- Specific to this browser
- Not shared via URL (yet)

### For collaboration

When sharing analysis with colleagues, note your settings:

```markdown
## Display Settings
- Theme: Light
- Palette: Set2
- Assembly: GRCh38
```

This ensures they see the same visualization style.
```

### 4. Update GQL Console Section

Verify keyboard shortcut and update:

```markdown
### Opening the console

- Click the **GQL Console** button in the header
- Or press `Cmd+\`` (backtick) on Mac / `Ctrl+\`` on Windows/Linux
- The keyboard shortcut is shown on the button

### Console features

The GQL Console provides:

| Feature | Description |
|---------|-------------|
| **Natural Language input** | Type questions in plain English (requires AI) |
| **GQL input** | View/edit the query before running |
| **Results panel** | Clickable list with navigation |
| **History tab** | All queries from this session |
| **Saved tab** | Your saved query collection |
| **Expand button** | Larger workspace for complex queries |
```

### 5. Add "Try It Yourself" Section

```markdown
## Try It Yourself

Create a reproducible analysis workflow:

### 1. Set up your session

1. Open GBetter: https://teammaclean.github.io/gbetter/
2. Set theme to **Light** (Settings > Display) for publication-ready screenshots
3. Select assembly **GRCh38**

### 2. Navigate and explore

```
# Go to TP53
navigate chr17:7668421-7687490

# Zoom to see gene structure
zoom in
zoom in

# Filter to exons
filter type=exon
```

### 3. Capture your state

1. Copy the URL from your browser - it now contains your exact position
2. Write down the GQL commands you used
3. Note your display settings

### 4. Test reproducibility

1. Open a new browser tab
2. Paste the URL
3. Verify you're at the same position
4. Re-run your GQL commands
5. Confirm you see the same view

### 5. Document for sharing

Create a simple script file `tp53-analysis.gql`:

```
# TP53 Analysis
# Author: [Your name]
# Date: [Today's date]
# Assembly: GRCh38
# Theme: Light, Set2 palette

# Navigate to TP53
navigate chr17:7668421-7687490

# Focus on coding regions
filter type=exon

# Zoom for detail
zoom in
zoom in

# Highlight region of interest
highlight chr17:7674000-7676000
```

Share this file with your URL for full reproducibility.
```

### 6. Update Documentation Best Practices

Add theme/settings to the checklist:

```markdown
## Complete Reproducibility Checklist

For fully reproducible analysis:

- [ ] **Assembly**: Document which genome assembly (e.g., GRCh38)
- [ ] **Display settings**: Note theme and palette used
- [ ] **Data files**: Share or document sources of all loaded files
- [ ] **GQL script**: Save all commands used in order
- [ ] **URL state**: Capture key viewport positions
- [ ] **Results**: Export or screenshot query results
- [ ] **Documentation**: Write README explaining the workflow
```

## Verification

After editing:
- [ ] Header follows style guide format
- [ ] URL example uses real GBetter URL
- [ ] Settings persistence documented
- [ ] GQL Console shortcuts verified
- [ ] "Try It Yourself" is a complete workflow
- [ ] Reproducibility checklist is comprehensive

## GitHub Markdown Enhancements

Add these alerts throughout the tutorial:

### Tips
```markdown
> [!TIP]
> Save GQL commands, not natural language - GQL is guaranteed to reproduce the same result.
```

```markdown
> [!TIP]
> Use version control (git) for your `.gql` script files.
```

### Important
```markdown
> [!IMPORTANT]
> URL state captures viewport only, not loaded tracks. Share data files separately.
```

```markdown
> [!IMPORTANT]
> Display settings (theme, palette) are stored in browser localStorage, not in URLs.
```

### Notes
```markdown
> [!NOTE]
> Settings persist across sessions in the same browser but don't sync across devices.
```

### Collapsible Checklist
Put the full reproducibility checklist in a visible but organized way:

```markdown
<details>
<summary>Full Reproducibility Checklist</summary>

- [ ] **Assembly**: Document which genome assembly
- [ ] **Display settings**: Note theme and palette
- [ ] **Data files**: Share or document all sources
- [ ] **GQL script**: Save all commands in order
- [ ] **URL state**: Capture key viewport positions
- [ ] **Results**: Export or screenshot query results
- [ ] **Documentation**: Write README explaining workflow

</details>
```
