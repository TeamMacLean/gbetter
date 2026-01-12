/**
 * Track Types Index
 * Registers all track types with the registry
 */

import { registerTrackType } from '../trackRegistry';
import { intervalsTrackType } from './intervals';
import { geneModelTrackType } from './geneModel';
import { signalTrackType } from './signal';
import { variantsTrackType } from './variants';

// Register all track types
export function initializeTrackTypes(): void {
	registerTrackType(intervalsTrackType);
	registerTrackType(geneModelTrackType);
	registerTrackType(signalTrackType);
	registerTrackType(variantsTrackType);
}

// Re-export for direct access if needed
export {
	intervalsTrackType,
	geneModelTrackType,
	signalTrackType,
	variantsTrackType,
};
