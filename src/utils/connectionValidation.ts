import type {
  SCLocation,
  SCConnection,
  ImportValidationError,
  ImportSummary,
} from '../types/supplyChain';

/**
 * Validates a single connection against the available set of locations.
 */
export function validateSCConnection(
  conn: SCConnection,
  locationMap: Map<string, SCLocation>
): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  if (!conn.id || conn.id.trim() === '') {
    errors.push({ field: 'id', value: conn.id, message: 'Connection ID is required.' });
  }

  if (!conn.sourceLocationId) {
    errors.push({ field: 'sourceLocationId', value: conn.sourceLocationId, message: 'Source location ID is missing.' });
  } else if (!locationMap.has(conn.sourceLocationId)) {
    errors.push({
      field: 'sourceLocationId',
      value: conn.sourceLocationId,
      message: `Source facility '${conn.sourceLocationId}' not found in registered locations.`,
    });
  }

  if (!conn.destinationLocationId) {
    errors.push({ field: 'destinationLocationId', value: conn.destinationLocationId, message: 'Destination location ID is missing.' });
  } else if (!locationMap.has(conn.destinationLocationId)) {
    errors.push({
      field: 'destinationLocationId',
      value: conn.destinationLocationId,
      message: `Destination facility '${conn.destinationLocationId}' not found in registered locations.`,
    });
  }

  if (conn.sourceLocationId && conn.destinationLocationId && conn.sourceLocationId === conn.destinationLocationId) {
    errors.push({
      field: 'self_connection',
      value: conn.sourceLocationId,
      message: `Self-connection detected: source and destination cannot be identical facility '${conn.sourceLocationId}'.`,
    });
  }

  if (!conn.connectionType) {
    errors.push({ field: 'connectionType', value: conn.connectionType, message: 'Connection type is missing.' });
  }

  return errors;
}

/**
 * Validates full network dataset (both locations and connections).
 * Identifies duplicate IDs, broken endpoints, and compiles an ImportSummary.
 */
export function validateAllNetworkData(
  locations: SCLocation[],
  connections: SCConnection[]
): ImportSummary {
  const locationErrors: ImportValidationError[] = [];
  const connectionErrors: ImportValidationError[] = [];
  const warnings: string[] = [];

  const locationMap = new Map<string, SCLocation>();
  const locationCodes = new Set<string>();

  // Check locations
  locations.forEach((loc, idx) => {
    if (locationMap.has(loc.id)) {
      locationErrors.push({
        row: idx + 1,
        field: 'id',
        value: loc.id,
        message: `Duplicate location ID: '${loc.id}'`,
      });
    } else {
      locationMap.set(loc.id, loc);
    }

    if (locationCodes.has(loc.code)) {
      warnings.push(`Duplicate facility code '${loc.code}' detected at row ${idx + 1} (${loc.name}).`);
    } else {
      locationCodes.add(loc.code);
    }
  });

  // Check connections
  const seenPairKeys = new Set<string>();

  connections.forEach((conn, idx) => {
    const errs = validateSCConnection(conn, locationMap);
    errs.forEach(e => connectionErrors.push({ ...e, row: idx + 1 }));

    // Check duplicate edge pairs
    const pairKey = `${conn.sourceLocationId}-->${conn.destinationLocationId}`;
    if (seenPairKeys.has(pairKey)) {
      warnings.push(`Duplicate route connection '${pairKey}' defined in connection #${conn.id}.`);
    } else {
      seenPairKeys.add(pairKey);
    }
  });

  return {
    locationsLoaded: locations.length,
    connectionsLoaded: connections.length,
    locationErrors,
    connectionErrors,
    warnings,
  };
}
