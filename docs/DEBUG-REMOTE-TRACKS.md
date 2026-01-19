# Debug Guide: Remote Track Loading Issue

**Status**: UNRESOLVED as of 2026-01-16
**Issue**: Panning doesn't load new data for remote tracks (BigWig/BigBed)

## Symptoms Reported
- User pans from initial view (e.g., chr17:7.6M) to distant region (e.g., chr17:180M or 250M)
- Feature counts stay static (e.g., "13 features" or "100,001 features")
- No new data renders even after stopping pan
- Tracks appear blank in new regions

## What Was Tried (Session 8)

### Fixes Implemented
1. Clear `rawFeaturesStore` when tracks removed
2. Refetch when features empty (regardless of lastViewport)
3. Use `getRawFeatures()` for `hasRemoteContent` check
4. Add `remoteRenderVersion` counter for reactivity
5. Use `untrack()` in viewport $effect to prevent infinite loop

### Test Results
- All 7 automated e2e tests PASS
- Headed browser tests PASS
- Manual browser testing by user FAILS

## Critical Gap
**Automated tests pass but manual testing fails** - this suggests:
1. Tests aren't replicating real user interaction accurately
2. There's a timing/race condition not captured by tests
3. Browser-specific behavior differs from Playwright's Chromium
4. User's browser has cached old code (needs hard refresh)

## Diagnostic Steps for Next Session

### 1. Verify User Has Latest Code
```bash
# User should:
1. Stop dev server (Ctrl+C)
2. Hard refresh browser (Cmd+Shift+R)
3. Clear localStorage: localStorage.clear()
4. Restart: npm run dev
5. Open fresh incognito window
```

### 2. Add Persistent Console Logging
Add these logs that will appear in user's browser console:

```typescript
// In remoteTracks.svelte.ts - viewportChanged()
console.log(`[viewportChanged] ${track.id}: features=${rawFeaturesStore.get(track.id)?.length || 0}, lastVP=${track.lastViewport ? `${track.lastViewport.start}-${track.lastViewport.end}` : 'null'}`);

// In remoteTracks.svelte.ts - updateForViewport() debounce callback
console.log(`[updateForViewport] DEBOUNCE FIRED - checking ${remoteTracks.length} tracks`);

// In remoteTracks.svelte.ts - fetchTrackFeatures() success
console.log(`[fetchTrackFeatures] SUCCESS ${track.id}: ${features.length} features for ${viewport.chromosome}:${fetchStart}-${fetchEnd}`);
```

### 3. Questions to Answer
1. Does the debounce timer fire after pan stops? (Look for "DEBOUNCE FIRED" log)
2. Does `viewportChanged()` return true for the new position?
3. Does the fetch start and complete successfully?
4. Are features being stored in `rawFeaturesStore`?
5. Is the render effect re-running after features update?

### 4. Potential Root Causes Not Yet Explored

#### A. Stale Closure in Debounce
The debounce captures `viewport` at call time, but by the time it fires, the viewport may have changed again. The fetch uses the OLD viewport coordinates.

```typescript
// Current code captures viewport by reference
fetchDebounceTimer = setTimeout(() => {
    // viewport here might be stale if user kept panning
    const tracksToUpdate = remoteTracks.filter(
        (t) => t.visible && viewportChanged(t, viewport)  // <-- stale viewport?
    );
}, FETCH_DEBOUNCE_MS);
```

**Fix to try**: Capture viewport value at setTimeout creation, not execution.

#### B. lastViewport Not Updated on Failure
If a fetch fails (network, CORS, etc.), `lastViewport` might not update, causing subsequent `viewportChanged()` checks to use stale data.

#### C. rawFeaturesStore vs $state Mismatch
The `features` array in `$state` and `rawFeaturesStore` could get out of sync, causing render checks to fail.

#### D. Browser-Specific BigWig/BigBed Parsing
The @gmod/bbi library might behave differently in user's browser vs Playwright's Chromium.

#### E. AbortController Race Condition
In-flight requests might be getting aborted before they complete due to rapid viewport changes.

### 5. Create a Minimal Reproduction Test

```typescript
test('manual pan simulation', async ({ page }) => {
    // Load page
    await page.goto('/?chr=chr17&start=7661778&end=7687490');
    await page.waitForTimeout(2000); // Let initial load complete

    // Get initial state
    const initialFeatures = await page.evaluate(() => {
        // Access the store directly
        return window.__DEBUG_FEATURES__;  // Need to expose this
    });

    // Simulate SLOW manual pan (not rapid automated drag)
    for (let i = 0; i < 20; i++) {
        await page.mouse.move(400, 300);
        await page.mouse.down();
        await page.mouse.move(200, 300, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100); // Pause between drags like a human
    }

    // Wait for debounce + fetch
    await page.waitForTimeout(3000);

    // Check state changed
    const finalFeatures = await page.evaluate(() => window.__DEBUG_FEATURES__);
    expect(finalFeatures).not.toEqual(initialFeatures);
});
```

### 6. Expose Debug State to Window

Add to `remoteTracks.svelte.ts`:
```typescript
if (browser) {
    (window as any).__DEBUG_REMOTE_TRACKS__ = {
        get tracks() { return remoteTracks; },
        get rawFeatures() { return Object.fromEntries(rawFeaturesStore); },
        get renderVersion() { return remoteRenderVersion; }
    };
}
```

Then user can check in console:
```javascript
__DEBUG_REMOTE_TRACKS__.tracks
__DEBUG_REMOTE_TRACKS__.rawFeatures
```

## Lessons Learned

1. **Automated tests passing ≠ feature working** - Need to test with actual user interaction patterns
2. **Debouncing + async + reactive state = complex** - Many opportunities for stale data
3. **Should have added debug tooling earlier** - Exposed state to window for browser inspection
4. **Need reproduction steps from user** - Exact sequence of actions that fails
5. **Visual regression tests are essential** - A screenshot test comparing:
   - "Loaded state" (known-good with data visible)
   - "After pan state" (should also show data)

   Would have FAILED if panned view showed blank tracks, catching the bug immediately.

   **Strategy for next time**:
   - Data loading tests verify fetch/parse logic
   - Visual tests verify rendering logic
   - Combined: if data loads but visual is blank, we know it's a rendering issue
   - If data doesn't load but visual test expects data, we know it's a fetch issue

## Recommended Test Strategy

### Two-Layer Testing
```
Layer 1: Data Tests (unit/integration)
- Does queryBigWig() return features?
- Does rawFeaturesStore get populated?
- Does viewportChanged() return correct boolean?

Layer 2: Visual Tests (e2e/screenshot)
- Screenshot of loaded state (baseline)
- Screenshot after pan → compare to baseline
- If different when it shouldn't be → BUG

### Example Visual Test Structure
```typescript
test('panning maintains visual data display', async ({ page }) => {
    // Load and wait for data
    await page.goto('/?chr=chr17&start=7661778&end=7687490');
    await page.waitForSelector('[data-testid="track-loaded"]'); // Add this marker

    // Capture "loaded" baseline
    const loadedScreenshot = await page.screenshot();

    // Pan away
    await panCanvas(page, 500); // Helper for real mouse drag
    await page.waitForTimeout(1000);

    // Pan back to same region
    await panCanvas(page, -500);
    await page.waitForTimeout(1000);

    // Capture "after pan" state
    const afterPanScreenshot = await page.screenshot();

    // Visual comparison - should show data, not blank
    // Use pixelmatch or similar for fuzzy comparison
    expect(afterPanScreenshot).toMatchSnapshot('loaded-state.png', { threshold: 0.1 });
});
```

This approach would have caught the bug because:
- Loaded state shows features
- After pan shows blank
- Screenshot comparison FAILS
- Bug detected automatically

## Files Modified This Session
- `src/lib/stores/remoteTracks.svelte.ts` - Multiple fixes
- `src/lib/components/TrackView.svelte` - untrack() fix, getRawFeatures()
- `src/lib/stores/viewport.svelte.ts` - (debug logging removed)
- `tests/e2e/remote-track-loading.test.ts` - Created

## Next Session Priority
1. Add window debug exposure
2. Have user test with console open, report exact logs
3. Based on logs, identify which step is failing
4. Write test that actually reproduces the failure
