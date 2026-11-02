import { validateAllNetworkData } from '../utils/connectionValidation';
import { computeNetworkStats } from '../utils/networkAnalysis';
import type {
  SCLocation,
  SCConnection,
  ImportSummary,
  NetworkStats,
} from '../types/supplyChain';

export interface LoadedNetworkDataset {
  locations: SCLocation[];
  connections: SCConnection[];
  summary: ImportSummary;
  stats: NetworkStats;
  locationMap: Map<string, SCLocation>;
  connectionMap: Map<string, SCConnection>;
}

let cachedDataset: LoadedNetworkDataset | null = null;

/**
 * Returns the active supply chain network, empty until local data is selected.
 * Validates integrity (missing endpoints, duplicates, geometry) and computes baseline statistics.
 */
export function loadNetworkData(forceReload = false): LoadedNetworkDataset {
  if (cachedDataset && !forceReload) {
    return cachedDataset;
  }

  const locations: SCLocation[] = [];
  const connections: SCConnection[] = [];

  // Perform integrity validation
  const summary = validateAllNetworkData(locations, connections);

  // Compute baseline network stats
  const stats = computeNetworkStats(locations, connections);

  // Index maps for O(1) lookups
  const locationMap = new Map<string, SCLocation>();
  for (const loc of locations) {
    locationMap.set(loc.id, loc);
  }

  const connectionMap = new Map<string, SCConnection>();
  for (const conn of connections) {
    connectionMap.set(conn.id, conn);
  }

  cachedDataset = {
    locations,
    connections,
    summary,
    stats,
    locationMap,
    connectionMap,
  };

  return cachedDataset;
}

/**
 * Overrides or updates the active dataset dynamically (e.g. from an imported CSV/Excel).
 */
export function setLoadedNetworkData(
  locations: SCLocation[],
  connections: SCConnection[]
): LoadedNetworkDataset {
  const summary = validateAllNetworkData(locations, connections);
  const stats = computeNetworkStats(locations, connections);

  const locationMap = new Map<string, SCLocation>();
  for (const loc of locations) {
    locationMap.set(loc.id, loc);
  }

  const connectionMap = new Map<string, SCConnection>();
  for (const conn of connections) {
    connectionMap.set(conn.id, conn);
  }

  cachedDataset = {
    locations,
    connections,
    summary,
    stats,
    locationMap,
    connectionMap,
  };

  return cachedDataset;
}
