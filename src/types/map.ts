import type { SCLocation, SCConnection } from './supplyChain';
import type { Shipment } from './shipment';
import type { InventoryMovement } from './movement';

export type LocationType =
  | 'headquarters'
  | 'warehouse'
  | 'distribution_center'
  | 'branch'
  | 'retailer'
  | 'central_warehouse'
  | 'regional_warehouse'
  | 'supplier'
  | 'factory'
  | 'customer';

export type RouteStatus = 'active' | 'inactive' | 'delayed' | 'disrupted';

export type InteractionMode = 'pan' | 'rotate';

export interface DistrictProperties {
  district: string;
  st_code: string;
  dt_code: string;
  year?: string;
  st_nm: string;
  zone: 'Northern' | 'Western' | 'Central' | 'Southern';
  opsGroup: string;
  hq: string;
  area_sqkm: number;
  center: [number, number]; // [lon, lat]
}

export interface DistrictGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface DistrictFeature {
  type: 'Feature';
  properties: DistrictProperties;
  geometry: DistrictGeometry;
}

export interface DistrictCollection {
  type: 'FeatureCollection';
  metadata: {
    state: string;
    source: string;
    license: string;
    date: string;
    districtCount: number;
  };
  features: DistrictFeature[];
}

export interface SupplyChainLocation {
  id: string;
  name: string;
  type: LocationType;
  latitude: number;
  longitude: number;
  district?: string;
  opsGroup?: string;
  description?: string;
  code?: string;
  metrics?: {
    stockValueRs?: number;
    auditScorePct?: number;
    daysOfCover?: number;
    dailyCases?: number;
    problemStockSharePct?: number;
  };
}

export interface SupplyChainRoute {
  id: string;
  sourceId: string;
  destinationId: string;
  status: RouteStatus;
  category?: 'primary_trunk' | 'secondary_feeder' | 'retail_last_mile';
  volumeCasesPerDay?: number;
  distanceKm?: number;
  estimatedHours?: number;
}

export interface LayerVisibility {
  districtBoundaries: boolean;
  districtLabels: boolean;
  headquarters: boolean;
  warehouses: boolean;
  distributionCenters: boolean;
  branches: boolean;
  retailers: boolean;
  suppliers?: boolean;
  factories?: boolean;
  centralWarehouses?: boolean;
  regionalWarehouses?: boolean;
  customers?: boolean;
  routes: boolean;
  routeParticles: boolean;
  extruded3D: boolean;
  shipments?: boolean;
  movements?: boolean;
}

export type SelectedEntity =
  | { type: 'district'; data: DistrictProperties }
  | { type: 'location'; data: SupplyChainLocation | SCLocation }
  | { type: 'route'; data: SupplyChainRoute | SCConnection }
  | { type: 'shipment'; data: Shipment }
  | { type: 'movement'; data: InventoryMovement }
  | null;


export interface MapTheme {
  background: string;
  secondaryBg: string;
  mapSurface: string;
  mapSurfaceHover: string;
  mapSurfaceSelected: string;
  districtBoundary: string;
  boundaryHighlight: string;
  accentPrimary: string;
  accentSecondary: string;
  infoBlue: string;
  warningAmber: string;
  criticalRed: string;
}
