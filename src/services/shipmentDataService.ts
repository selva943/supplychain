import {
  computeDeliveryOverviewStats,
  computeMovementSummaryStats,
} from '../utils/deliveryAnalysis';
import type {
  Shipment,
  DeliveryOverviewStats,
} from '../types/shipment';
import type {
  InventoryMovement,
  MovementSummaryStats,
} from '../types/movement';

export interface LoadedTrackingDataset {
  shipments: Shipment[];
  movements: InventoryMovement[];
  deliveryStats: DeliveryOverviewStats;
  movementStats: MovementSummaryStats;
  shipmentMap: Map<string, Shipment>;
  movementMap: Map<string, InventoryMovement>;
}

let cachedDataset: LoadedTrackingDataset | null = null;

/**
 * Returns the active shipment and inventory movement data, empty until local
 * data is selected. Computes KPIs and builds lookup index maps.
 */
export function loadTrackingData(forceReload = false): LoadedTrackingDataset {
  if (cachedDataset && !forceReload) {
    return cachedDataset;
  }

  const shipments: Shipment[] = [];
  const movements: InventoryMovement[] = [];

  return setLoadedTrackingData(shipments, movements);
}

export function setLoadedTrackingData(
  shipments: Shipment[],
  movements: InventoryMovement[]
): LoadedTrackingDataset {
  const deliveryStats = computeDeliveryOverviewStats(shipments);
  const movementStats = computeMovementSummaryStats(movements);

  const shipmentMap = new Map<string, Shipment>();
  for (const s of shipments) {
    shipmentMap.set(s.shipment_id, s);
  }

  const movementMap = new Map<string, InventoryMovement>();
  for (const m of movements) {
    movementMap.set(m.movement_id, m);
  }

  cachedDataset = {
    shipments: [...shipments],
    movements: [...movements],
    deliveryStats,
    movementStats,
    shipmentMap,
    movementMap,
  };

  return cachedDataset;
}

/**
 * Retrieves all shipments originating from or destined to a specific facility.
 */
export function getShipmentsForFacility(facilityId: string): Shipment[] {
  const { shipments } = loadTrackingData();
  return shipments.filter(
    (s) => s.source_facility_id === facilityId || s.destination_facility_id === facilityId
  );
}

/**
 * Retrieves all inventory movements connected to a specific facility.
 */
export function getMovementsForFacility(facilityId: string): InventoryMovement[] {
  const { movements } = loadTrackingData();
  return movements.filter(
    (m) => m.source_facility_id === facilityId || m.destination_facility_id === facilityId
  );
}
