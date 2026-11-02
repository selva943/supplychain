/**
 * Phase 2: Supply Chain Entity Type System
 *
 * Extends the Phase 1 map types with a richer data model for real
 * supply chain locations, connections, and network analysis.
 *
 * Phase 1 types (map.ts) are preserved unchanged.
 */

// ─────────────────────────────────────────────────────────────
// 1. FACILITY MODEL
// ─────────────────────────────────────────────────────────────

export type FacilityType =
  | 'supplier'
  | 'factory'
  | 'central_warehouse'
  | 'regional_warehouse'
  | 'distribution_center'
  | 'branch'
  | 'retailer'
  | 'customer';

export type FacilityStatus = 'active' | 'inactive';

export interface SCLocation {
  /** Stable unique identifier */
  id: string;
  /** Short code unique within facility scope */
  code: string;
  /** Human-readable display name */
  name: string;
  type: FacilityType;

  // Geography
  latitude: number;
  longitude: number;
  address?: string;
  /** Tamil Nadu district name as per GeoJSON boundary data */
  district?: string;
  /** Organisational region / business unit (NOT the same as district) */
  region?: string;
  /** Cluster grouping (e.g. "Cluster 1", "Cluster 2") */
  cluster?: string;
  pincode?: string;

  // Business attributes
  companyId?: string;
  businessUnit?: string;

  /** Parent location id — represents organisational hierarchy only, not a route */
  parentLocationId?: string;
  status: FacilityStatus;

  /**
   * Arbitrary extra metadata (ERP codes, audit scores, etc.)
   * Do not surface fabricated KPIs here.
   */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// 2. CONNECTION MODEL
// ─────────────────────────────────────────────────────────────

export type ConnectionType =
  | 'supplier_to_factory'
  | 'factory_to_warehouse'
  | 'warehouse_to_warehouse'
  | 'warehouse_to_distribution'
  | 'distribution_to_branch'
  | 'branch_to_retailer'
  | 'direct_delivery'
  | 'other';

export type ConnectionDirection = 'one_way' | 'bidirectional';
export type TransportMode = 'road' | 'rail' | 'air' | 'sea' | 'unknown';
export type ConnectionStatus = 'active' | 'inactive' | 'delayed' | 'disrupted';

export interface SCConnection {
  /** Stable unique identifier */
  id: string;
  sourceLocationId: string;
  destinationLocationId: string;
  connectionType: ConnectionType;
  direction: ConnectionDirection;
  status: ConnectionStatus;
  routeName?: string;
  transportMode?: TransportMode;
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────
// 3. IMPORT / VALIDATION
// ─────────────────────────────────────────────────────────────

export interface ImportValidationError {
  row?: number;
  field?: string;
  value?: unknown;
  message: string;
}

export interface ImportSummary {
  locationsLoaded: number;
  connectionsLoaded: number;
  locationErrors: ImportValidationError[];
  connectionErrors: ImportValidationError[];
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────
// 4. NETWORK ANALYSIS
// ─────────────────────────────────────────────────────────────

export interface FacilityConnectionCounts {
  locationId: string;
  inbound: number;
  outbound: number;
  total: number;
}

export interface NetworkStats {
  totalFacilities: number;
  facilitiesByType: Record<FacilityType, number>;
  activeFacilities: number;
  inactiveFacilities: number;
  totalConnections: number;
  activeConnections: number;
  unconnectedFacilities: number;
  crossClusterConnections: number;
  facilitiesOutsideTN: number;
  districtsWithFacilities: number;
  mostConnected: FacilityConnectionCounts[];
}

// ─────────────────────────────────────────────────────────────
// 5. FILTER STATE
// ─────────────────────────────────────────────────────────────

export interface SCNetworkFilters {
  facilityTypes: Set<FacilityType>;
  clusters: Set<string>;
  businessUnits: Set<string>;
  statuses: Set<FacilityStatus>;
  connectionTypes: Set<ConnectionType>;
  connectionStatuses: Set<ConnectionStatus>;
  showInactiveFacilities: boolean;
  showInactiveConnections: boolean;
  selectedDistrictFilter: string | null;
}

export function defaultFilters(): SCNetworkFilters {
  return {
    facilityTypes: new Set<FacilityType>([
      'supplier',
      'factory',
      'central_warehouse',
      'regional_warehouse',
      'distribution_center',
      'branch',
      'retailer',
      'customer',
    ]),
    clusters: new Set(),
    businessUnits: new Set(),
    statuses: new Set<FacilityStatus>(['active', 'inactive']),
    connectionTypes: new Set<ConnectionType>([
      'supplier_to_factory',
      'factory_to_warehouse',
      'warehouse_to_warehouse',
      'warehouse_to_distribution',
      'distribution_to_branch',
      'branch_to_retailer',
      'direct_delivery',
      'other',
    ]),
    connectionStatuses: new Set<ConnectionStatus>(['active', 'delayed', 'disrupted', 'inactive']),
    showInactiveFacilities: true,
    showInactiveConnections: false,
    selectedDistrictFilter: null,
  };
}

// ─────────────────────────────────────────────────────────────
// 6. GEOGRAPHIC VALIDATION
// ─────────────────────────────────────────────────────────────

export interface GeoValidationResult {
  valid: boolean;
  withinTamilNadu: boolean;
  district?: string;
  warnings: string[];
}
