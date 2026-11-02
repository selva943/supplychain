import type {
  SCLocation,
  SCConnection,
  FacilityType,
  ConnectionType,
  ConnectionDirection,
  FacilityStatus,
} from '../types/supplyChain';

export interface LocationImportRow {
  code?: string;
  name?: string;
  type?: string;
  latitude?: string | number;
  longitude?: string | number;
  district?: string;
  region?: string;
  cluster?: string;
  address?: string;
  parent_code?: string;
  business_unit?: string;
  status?: string;
}

export interface ConnectionImportRow {
  id?: string;
  source_code?: string;
  destination_code?: string;
  connection_type?: string;
  direction?: string;
  status?: string;
  transport_mode?: string;
  route_name?: string;
}

const VALID_FACILITY_TYPES = new Set<string>([
  'supplier',
  'factory',
  'central_warehouse',
  'regional_warehouse',
  'distribution_center',
  'branch',
  'retailer',
  'customer',
]);

/**
 * Normalizes and imports raw location records into structured SCLocation entities.
 */
export function importLocationsFromRows(
  rows: LocationImportRow[]
): { locations: SCLocation[]; errors: string[] } {
  const locations: SCLocation[] = [];
  const errors: string[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const code = (row.code || '').trim().toUpperCase();
    const name = (row.name || '').trim();

    if (!code) {
      errors.push(`Row ${rowNum}: Missing required field 'code'.`);
      return;
    }
    if (!name) {
      errors.push(`Row ${rowNum}: Missing required field 'name' for code '${code}'.`);
      return;
    }

    const rawType = (row.type || 'branch').toLowerCase().trim();
    const facilityType: FacilityType = VALID_FACILITY_TYPES.has(rawType)
      ? (rawType as FacilityType)
      : 'branch';

    const lat = typeof row.latitude === 'number' ? row.latitude : parseFloat(row.latitude || '0');
    const lon = typeof row.longitude === 'number' ? row.longitude : parseFloat(row.longitude || '0');

    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
      errors.push(`Row ${rowNum}: Invalid coordinates for '${code}': lat=${row.latitude}, lon=${row.longitude}.`);
      return;
    }

    const status: FacilityStatus = (row.status || '').toLowerCase() === 'inactive' ? 'inactive' : 'active';

    const locationId = `loc-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    locations.push({
      id: locationId,
      code,
      name,
      type: facilityType,
      latitude: lat,
      longitude: lon,
      district: row.district?.trim(),
      region: row.region?.trim(),
      cluster: row.cluster?.trim(),
      address: row.address?.trim(),
      businessUnit: row.business_unit?.trim(),
      parentLocationId: row.parent_code ? `loc-${row.parent_code.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined,
      status,
      metadata: {
        source: 'imported',
      },
    });
  });

  return { locations, errors };
}

/**
 * Normalizes and imports raw connection records, resolving endpoints against known location codes.
 */
export function importConnectionsFromRows(
  rows: ConnectionImportRow[],
  locations: SCLocation[]
): { connections: SCConnection[]; errors: string[] } {
  const connections: SCConnection[] = [];
  const errors: string[] = [];

  // Build code -> id lookup
  const codeToId = new Map<string, string>();
  for (const loc of locations) {
    codeToId.set(loc.code.toUpperCase(), loc.id);
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const srcCode = (row.source_code || '').trim().toUpperCase();
    const destCode = (row.destination_code || '').trim().toUpperCase();

    if (!srcCode || !destCode) {
      errors.push(`Row ${rowNum}: Connection must specify both 'source_code' and 'destination_code'.`);
      return;
    }

    const srcId = codeToId.get(srcCode);
    const destId = codeToId.get(destCode);

    if (!srcId) {
      errors.push(`Row ${rowNum}: Unknown source location code '${srcCode}'.`);
      return;
    }
    if (!destId) {
      errors.push(`Row ${rowNum}: Unknown destination location code '${destCode}'.`);
      return;
    }

    const direction: ConnectionDirection = (row.direction || '').toLowerCase().includes('bi')
      ? 'bidirectional'
      : 'one_way';

    const connType = (row.connection_type || 'distribution_to_branch') as ConnectionType;
    const id = row.id || `conn-${srcCode.toLowerCase()}-${destCode.toLowerCase()}-${idx + 1}`;

    connections.push({
      id,
      sourceLocationId: srcId,
      destinationLocationId: destId,
      connectionType: connType,
      direction,
      status: 'active',
      routeName: row.route_name || `${srcCode} -> ${destCode}`,
      transportMode: 'road',
    });
  });

  return { connections, errors };
}

/**
 * Generates sample CSV template content for importing locations and connections.
 */
export function generateSampleCsvTemplates(): { locationsCsv: string; connectionsCsv: string } {
  const locationsCsv = [
    'code,name,type,latitude,longitude,district,region,cluster,business_unit,parent_code,status',
  ].join('\n');

  const connectionsCsv = [
    'source_code,destination_code,connection_type,direction,status,transport_mode,route_name',
  ].join('\n');

  return { locationsCsv, connectionsCsv };
}
