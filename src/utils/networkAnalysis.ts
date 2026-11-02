import type {
  SCLocation,
  SCConnection,
  FacilityType,
  FacilityConnectionCounts,
  NetworkStats,
  SCNetworkFilters,
} from '../types/supplyChain';

/**
 * Calculates inbound, outbound, and total connection counts per location.
 */
export function computeConnectionCounts(
  locations: SCLocation[],
  connections: SCConnection[]
): Map<string, FacilityConnectionCounts> {
  const map = new Map<string, FacilityConnectionCounts>();

  // Initialize for all locations
  for (const loc of locations) {
    map.set(loc.id, {
      locationId: loc.id,
      inbound: 0,
      outbound: 0,
      total: 0,
    });
  }

  // Count active or existing connections
  for (const conn of connections) {
    const src = map.get(conn.sourceLocationId);
    const dest = map.get(conn.destinationLocationId);

    if (src) {
      src.outbound += 1;
      src.total += 1;
      if (conn.direction === 'bidirectional') {
        src.inbound += 1;
      }
    }

    if (dest) {
      dest.inbound += 1;
      dest.total += 1;
      if (conn.direction === 'bidirectional') {
        dest.outbound += 1;
      }
    }
  }

  return map;
}

/**
 * Computes network statistics from the currently selected locations and connections.
 * Strictly uses loaded data; never fabricates operational metrics.
 */
export function computeNetworkStats(
  locations: SCLocation[],
  connections: SCConnection[]
): NetworkStats {
  const facilitiesByType: Record<FacilityType, number> = {
    supplier: 0,
    factory: 0,
    central_warehouse: 0,
    regional_warehouse: 0,
    distribution_center: 0,
    branch: 0,
    retailer: 0,
    customer: 0,
  };

  let activeFacilities = 0;
  let inactiveFacilities = 0;
  let facilitiesOutsideTN = 0;
  const districts = new Set<string>();

  const locationMap = new Map<string, SCLocation>();

  for (const loc of locations) {
    locationMap.set(loc.id, loc);
    facilitiesByType[loc.type] = (facilitiesByType[loc.type] || 0) + 1;

    if (loc.status === 'active') {
      activeFacilities += 1;
    } else {
      inactiveFacilities += 1;
    }

    if (loc.metadata?.outsideTN) {
      facilitiesOutsideTN += 1;
    }

    if (loc.district && loc.district.trim() !== '') {
      districts.add(loc.district.trim().toLowerCase());
    }
  }

  const connectionCounts = computeConnectionCounts(locations, connections);

  let unconnectedFacilities = 0;
  for (const count of connectionCounts.values()) {
    if (count.total === 0) {
      unconnectedFacilities += 1;
    }
  }

  let activeConnections = 0;
  let crossClusterConnections = 0;

  for (const conn of connections) {
    if (conn.status === 'active') {
      activeConnections += 1;
    }

    const src = locationMap.get(conn.sourceLocationId);
    const dest = locationMap.get(conn.destinationLocationId);
    if (src && dest && src.cluster && dest.cluster && src.cluster !== dest.cluster) {
      crossClusterConnections += 1;
    }
  }

  // Sort most connected facilities
  const mostConnected = Array.from(connectionCounts.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    totalFacilities: locations.length,
    facilitiesByType,
    activeFacilities,
    inactiveFacilities,
    totalConnections: connections.length,
    activeConnections,
    unconnectedFacilities,
    crossClusterConnections,
    facilitiesOutsideTN,
    districtsWithFacilities: districts.size,
    mostConnected,
  };
}

/**
 * Returns a set of directly connected facility IDs and connection IDs for a selected location.
 */
export function getConnectedEntities(
  selectedLocationId: string | null,
  connections: SCConnection[]
): {
  connectedLocationIds: Set<string>;
  connectedConnectionIds: Set<string>;
  inboundLocationIds: Set<string>;
  outboundLocationIds: Set<string>;
} {
  const connectedLocationIds = new Set<string>();
  const connectedConnectionIds = new Set<string>();
  const inboundLocationIds = new Set<string>();
  const outboundLocationIds = new Set<string>();

  if (!selectedLocationId) {
    return {
      connectedLocationIds,
      connectedConnectionIds,
      inboundLocationIds,
      outboundLocationIds,
    };
  }

  connectedLocationIds.add(selectedLocationId);

  for (const conn of connections) {
    const isSrc = conn.sourceLocationId === selectedLocationId;
    const isDest = conn.destinationLocationId === selectedLocationId;

    if (isSrc || isDest) {
      connectedConnectionIds.add(conn.id);

      if (isSrc) {
        connectedLocationIds.add(conn.destinationLocationId);
        outboundLocationIds.add(conn.destinationLocationId);
        if (conn.direction === 'bidirectional') {
          inboundLocationIds.add(conn.destinationLocationId);
        }
      }

      if (isDest) {
        connectedLocationIds.add(conn.sourceLocationId);
        inboundLocationIds.add(conn.sourceLocationId);
        if (conn.direction === 'bidirectional') {
          outboundLocationIds.add(conn.sourceLocationId);
        }
      }
    }
  }

  return {
    connectedLocationIds,
    connectedConnectionIds,
    inboundLocationIds,
    outboundLocationIds,
  };
}

/**
 * Filters locations based on active filter criteria.
 */
export function filterLocations(
  locations: SCLocation[],
  filters: SCNetworkFilters
): SCLocation[] {
  return locations.filter(loc => {
    // Facility Type filter
    if (filters.facilityTypes.size > 0 && !filters.facilityTypes.has(loc.type)) {
      return false;
    }

    // Status filter
    if (loc.status === 'inactive' && !filters.showInactiveFacilities) {
      return false;
    }
    if (filters.statuses.size > 0 && !filters.statuses.has(loc.status)) {
      return false;
    }

    // Cluster filter
    if (filters.clusters.size > 0 && (!loc.cluster || !filters.clusters.has(loc.cluster))) {
      return false;
    }

    // Business Unit filter
    if (filters.businessUnits.size > 0 && (!loc.businessUnit || !filters.businessUnits.has(loc.businessUnit))) {
      return false;
    }

    // District filter
    if (filters.selectedDistrictFilter) {
      const targetDist = filters.selectedDistrictFilter.toLowerCase().trim();
      const locDist = (loc.district || '').toLowerCase().trim();
      if (locDist !== targetDist) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filters connections:
 * - Must link two locations that are currently visible
 * - Must pass connectionType and connectionStatus filters
 */
export function filterConnections(
  connections: SCConnection[],
  visibleLocationIds: Set<string>,
  filters: SCNetworkFilters
): SCConnection[] {
  return connections.filter(conn => {
    // Both endpoints must be visible in the current view
    if (!visibleLocationIds.has(conn.sourceLocationId) || !visibleLocationIds.has(conn.destinationLocationId)) {
      return false;
    }

    // Status filter
    if (conn.status === 'inactive' && !filters.showInactiveConnections) {
      return false;
    }
    if (filters.connectionStatuses.size > 0 && !filters.connectionStatuses.has(conn.status)) {
      return false;
    }

    // Connection Type filter
    if (filters.connectionTypes.size > 0 && !filters.connectionTypes.has(conn.connectionType)) {
      return false;
    }

    return true;
  });
}
