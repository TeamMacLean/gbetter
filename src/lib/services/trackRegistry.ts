/**
 * Track Type Registry
 * Central registry for all track types with their parsers and renderers
 */

import type { TrackTypeConfig } from '$lib/types/tracks';

// Registry storage - use 'any' for feature type since we need runtime polymorphism
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, TrackTypeConfig<any>>();
const extensionMap = new Map<string, string>(); // extension -> typeId

/**
 * Register a new track type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerTrackType(config: TrackTypeConfig<any>): void {
	if (registry.has(config.id)) {
		console.warn(`Track type "${config.id}" is already registered. Overwriting.`);
	}

	registry.set(config.id, config);

	// Map extensions to this type
	for (const ext of config.extensions) {
		const normalizedExt = ext.toLowerCase().replace(/^\./, '');
		extensionMap.set(normalizedExt, config.id);
	}
}

/**
 * Get a track type by ID
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTrackType(id: string): TrackTypeConfig<any> | undefined {
	return registry.get(id);
}

/**
 * Get track type by file extension
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTrackTypeByExtension(filename: string): TrackTypeConfig<any> | undefined {
	// Extract extension from filename
	const match = filename.toLowerCase().match(/\.([^.]+)$/);
	if (!match) return undefined;

	const ext = match[1];
	const typeId = extensionMap.get(ext);
	if (!typeId) return undefined;

	return registry.get(typeId);
}

/**
 * Get all registered track types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllTrackTypes(): TrackTypeConfig<any>[] {
	return Array.from(registry.values());
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
	return Array.from(extensionMap.keys());
}

/**
 * Check if a file extension is supported
 */
export function isExtensionSupported(filename: string): boolean {
	return getTrackTypeByExtension(filename) !== undefined;
}
