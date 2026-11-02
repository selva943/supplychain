import type {
  Shipment,
  DeliveryOverviewStats,
  ShipmentFilters,
} from '../types/shipment';
import type {
  InventoryMovement,
  MovementSummaryStats,
} from '../types/movement';

/**
 * Computes strictly documented delivery performance and telemetry KPIs.
 * Excludes cancelled shipments from on-time delivery metrics.
 * Protects against division by zero.
 */
export function computeDeliveryOverviewStats(shipments: Shipment[]): DeliveryOverviewStats {
  let inTransit = 0;
  let delivered = 0;
  let delayed = 0;
  let awaitingDispatch = 0;
  let deliveryAttemptFailed = 0;
  let returned = 0;
  let exceptionsCount = 0;
  let eligibleDelivered = 0;
  let onTimeDelivered = 0;
  let overdueCount = 0;

  const now = Date.now();

  for (const s of shipments) {
    if (s.exception) {
      exceptionsCount += 1;
    }

    switch (s.shipment_status) {
      case 'in_transit':
      case 'out_for_delivery':
        inTransit += 1;
        break;
      case 'delivered':
        delivered += 1;
        break;
      case 'delayed':
        delayed += 1;
        break;
      case 'created':
      case 'ready_for_dispatch':
        awaitingDispatch += 1;
        break;
      case 'delivery_attempt_failed':
        deliveryAttemptFailed += 1;
        break;
      case 'returned':
        returned += 1;
        break;
      default:
        break;
    }

    // Overdue logic: Expected delivery has passed, but delivery is not confirmed and not cancelled
    if (
      s.shipment_status !== 'delivered' &&
      s.shipment_status !== 'cancelled' &&
      s.expected_delivery_datetime
    ) {
      const expTime = new Date(s.expected_delivery_datetime).getTime();
      if (!isNaN(expTime) && expTime < now && s.shipment_status !== 'ready_for_dispatch') {
        overdueCount += 1;
      }
    }

    // On-Time Delivery Rate:
    // Numerator: Eligible delivered on or before expected
    // Denominator: Eligible delivered shipments
    if (s.shipment_status === 'delivered') {
      if (s.expected_delivery_datetime && s.actual_delivery_datetime) {
        const exp = new Date(s.expected_delivery_datetime).getTime();
        const act = new Date(s.actual_delivery_datetime).getTime();
        if (!isNaN(exp) && !isNaN(act)) {
          eligibleDelivered += 1;
          if (act <= exp) {
            onTimeDelivered += 1;
          }
        }
      }
    }
  }

  const onTimeDeliveryRatePct =
    eligibleDelivered > 0
      ? Math.round((onTimeDelivered / eligibleDelivered) * 1000) / 10
      : 0;

  return {
    totalShipments: shipments.length,
    inTransit,
    delivered,
    delayed,
    awaitingDispatch,
    deliveryAttemptFailed,
    returned,
    exceptionsCount,
    eligibleDelivered,
    onTimeDelivered,
    onTimeDeliveryRatePct,
    overdueCount,
  };
}

/**
 * Computes summary KPIs for inter-facility inventory movements.
 */
export function computeMovementSummaryStats(
  movements: InventoryMovement[]
): MovementSummaryStats {
  let inTransit = 0;
  let received = 0;
  let awaitingDispatch = 0;
  let exceptions = 0;
  let cancelled = 0;
  let totalQuantityCases = 0;
  let totalValueRs = 0;

  for (const m of movements) {
    totalQuantityCases += m.quantity;
    totalValueRs += m.value || 0;

    switch (m.status) {
      case 'in_transit':
        inTransit += 1;
        break;
      case 'received':
      case 'completed':
        received += 1;
        break;
      case 'draft':
      case 'requested':
      case 'approved':
      case 'prepared':
        awaitingDispatch += 1;
        break;
      case 'exception':
        exceptions += 1;
        break;
      case 'cancelled':
        cancelled += 1;
        break;
      default:
        break;
    }
  }

  return {
    totalMovements: movements.length,
    inTransit,
    received,
    awaitingDispatch,
    exceptions,
    cancelled,
    totalQuantityCases,
    totalValueRs: Math.round(totalValueRs),
  };
}

/**
 * Multi-dimensional filter for shipment tracking list and 3D map.
 */
export function filterShipments(
  shipments: Shipment[],
  filters: ShipmentFilters
): Shipment[] {
  const query = filters.searchQuery.toLowerCase().trim();

  return shipments.filter((s) => {
    // Text search query
    if (query) {
      const matchRef = s.shipment_reference.toLowerCase().includes(query);
      const matchTrk = s.tracking_number.toLowerCase().includes(query);
      const matchDest = s.destination_name.toLowerCase().includes(query);
      const matchSrc = s.source_facility_name.toLowerCase().includes(query);
      const matchSKU = s.items.some((i) => i.product_name.toLowerCase().includes(query));
      if (!matchRef && !matchTrk && !matchDest && !matchSrc && !matchSKU) {
        return false;
      }
    }

    // Status filter
    if (filters.status.size > 0 && !filters.status.has(s.shipment_status)) {
      return false;
    }

    // Cluster filter
    if (filters.cluster !== 'ALL' && s.cluster !== filters.cluster) {
      return false;
    }

    // Business Unit filter
    if (filters.businessUnit !== 'ALL' && s.business_unit !== filters.businessUnit) {
      return false;
    }

    // Tracking Method filter
    if (filters.trackingMethod.size > 0 && !filters.trackingMethod.has(s.tracking_method)) {
      return false;
    }

    // Only exceptions
    if (filters.onlyExceptions && !s.exception) {
      return false;
    }

    // Delayed or overdue
    if (filters.onlyDelayedOrOverdue) {
      const isDelayed = s.shipment_status === 'delayed';
      const isFailed = s.shipment_status === 'delivery_attempt_failed';
      if (!isDelayed && !isFailed) return false;
    }

    // Priority
    if (filters.priority && filters.priority !== 'all' && s.priority !== filters.priority) {
      return false;
    }

    return true;
  });
}
