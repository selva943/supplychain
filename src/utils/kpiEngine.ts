import type { Shipment } from '../types/shipment';
import type { InventoryMovement } from '../types/movement';
import type { SCLocation } from '../types/supplyChain';
import type {
  KPIDefinition,
  ExecutiveOverviewKPIs,
  TimeSeriesTrendPoint,
  MetricPeriodComparison,
  FacilityPerformance,
  DistrictPerformance,
  BottleneckItem,
  OperationalRecommendation,
  OperationalAlert,
} from '../types/analytics';

// ─────────────────────────────────────────────────────────────
// 1. CENTRAL KPI METRIC DEFINITIONS REGISTRY
// ─────────────────────────────────────────────────────────────

export const CENTRAL_KPI_REGISTRY: Record<string, KPIDefinition> = {
  on_time_delivery_rate: {
    id: 'on_time_delivery_rate',
    displayName: 'On-Time Delivery Rate (OTD)',
    businessDefinition:
      'Percentage of eligible completed deliveries that arrived on or before the expected delivery deadline.',
    formula: '(Eligible On-Time Deliveries / Eligible Delivered Shipments) * 100',
    numeratorDescription: 'Confirmed deliveries where actual delivery timestamp <= expected delivery timestamp',
    denominatorDescription: 'Confirmed deliveries with valid expected and actual delivery timestamps, excluding cancelled orders',
    requiredFields: ['actual_delivery_datetime', 'expected_delivery_datetime', 'shipment_status'],
    unit: '%',
    dateBasis: 'Actual Delivery Date',
    exclusionRules: ['Cancelled shipments', 'Missing or invalid expected/actual delivery timestamps'],
  },
  late_delivery_rate: {
    id: 'late_delivery_rate',
    displayName: 'Late Delivery Rate',
    businessDefinition:
      'Percentage of eligible completed deliveries that arrived strictly after the expected delivery deadline.',
    formula: '(Eligible Late Deliveries / Eligible Delivered Shipments) * 100',
    numeratorDescription: 'Confirmed deliveries where actual delivery timestamp > expected delivery timestamp',
    denominatorDescription: 'Identical eligible delivered shipment population as OTD',
    requiredFields: ['actual_delivery_datetime', 'expected_delivery_datetime', 'shipment_status'],
    unit: '%',
    dateBasis: 'Actual Delivery Date',
    exclusionRules: ['Undelivered overdue shipments (tracked separately)', 'Cancelled shipments'],
  },
  average_delivery_delay_hours: {
    id: 'average_delivery_delay_hours',
    displayName: 'Average Net Delivery Delay',
    businessDefinition:
      'Mean time variance between actual delivery and expected delivery across all eligible delivered shipments. Negative values denote early delivery; positive values denote lateness.',
    formula: 'Sum(Actual Delivery - Expected Delivery in hours) / Eligible Delivered Shipments',
    requiredFields: ['actual_delivery_datetime', 'expected_delivery_datetime'],
    unit: 'Hours',
    dateBasis: 'Actual Delivery Date',
    exclusionRules: ['Undelivered shipments'],
  },
  average_lateness_among_late_hours: {
    id: 'average_lateness_among_late_hours',
    displayName: 'Average Lateness (Late Deliveries Only)',
    businessDefinition:
      'Mean duration of delay specifically among shipments that failed to meet their SLA deadline, without dilution by early deliveries.',
    formula: 'Sum(Actual Delivery - Expected Delivery in hours for late shipments) / Count(Late Shipments)',
    requiredFields: ['actual_delivery_datetime', 'expected_delivery_datetime'],
    unit: 'Hours',
    dateBasis: 'Actual Delivery Date',
    exclusionRules: ['On-time deliveries', 'Early deliveries'],
  },
  overdue_shipments: {
    id: 'overdue_shipments',
    displayName: 'Overdue Shipments Requiring Action',
    businessDefinition:
      'Active shipments where the expected delivery timestamp has passed, delivery is not confirmed, and the shipment is not cancelled.',
    formula: 'Count(expected_delivery_datetime < Now AND shipment_status NOT IN ("delivered", "cancelled"))',
    requiredFields: ['expected_delivery_datetime', 'shipment_status'],
    unit: 'Orders',
    dateBasis: 'Expected Delivery Date relative to Current Time',
    exclusionRules: ['Shipments without a valid expected delivery timestamp', 'Cancelled shipments'],
  },
  movement_completion_rate: {
    id: 'movement_completion_rate',
    displayName: 'Inter-Facility Movement Completion Rate',
    businessDefinition:
      'Percentage of created inter-facility stock transfer movements that have been fully received and verified at the destination facility.',
    formula: '(Completed or Received Movements / Total Eligible Movements) * 100',
    requiredFields: ['status'],
    unit: '%',
    dateBasis: 'Movement Creation / Dispatch Date',
    exclusionRules: ['Cancelled stock transfers'],
  },
  shipment_exception_rate: {
    id: 'shipment_exception_rate',
    displayName: 'Shipment Exception Rate',
    businessDefinition:
      'Percentage of total shipments associated with at least one recorded operational exception (e.g. failed delivery attempt, cash refusal, or damaged return).',
    formula: '(Shipments With >= 1 Exception / Total Active & Delivered Shipments) * 100',
    requiredFields: ['exception'],
    unit: '%',
    dateBasis: 'Dispatch / Exception Detection Date',
    exclusionRules: [],
  },
};

// ─────────────────────────────────────────────────────────────
// 2. CENTRAL KPI CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────

export function computeExecutiveKPIs(
  shipments: Shipment[] = [],
  movements: InventoryMovement[] = [],
  alerts: OperationalAlert[] = [],
  _facilities: SCLocation[] = []
): ExecutiveOverviewKPIs {
  const timestamp = new Date().toISOString();

  let dispatchedCount = 0;
  let inTransitCount = 0;
  let deliveredCount = 0;
  let delayedCount = 0;
  let overdueCount = 0;
  let cancelledCount = 0;
  let failedAttemptCount = 0;
  let exceptionCount = 0;

  let eligibleDelivered = 0;
  let onTimeDelivered = 0;
  let lateDelivered = 0;
  let totalNetDelayHours = 0;
  let totalLateOnlyDelayHours = 0;

  for (const s of shipments) {
    if (s.exception) {
      exceptionCount += 1;
    }

    if (s.shipment_status === 'cancelled') {
      cancelledCount += 1;
      continue;
    }

    dispatchedCount += 1;

    if (s.shipment_status === 'in_transit' || s.shipment_status === 'out_for_delivery') {
      inTransitCount += 1;
    } else if (s.shipment_status === 'delivered') {
      deliveredCount += 1;
    } else if (s.shipment_status === 'delayed') {
      delayedCount += 1;
    } else if (s.shipment_status === 'delivery_attempt_failed' || s.shipment_status === 'returned') {
      failedAttemptCount += 1;
    }

    // Overdue Check
    if (s.shipment_status !== 'delivered' && s.expected_delivery_datetime) {
      const exp = new Date(s.expected_delivery_datetime).getTime();
      if (!isNaN(exp) && exp < Date.now() && s.shipment_status !== 'ready_for_dispatch') {
        overdueCount += 1;
      }
    }

    // SLA Timing calculations for delivered orders
    if (s.shipment_status === 'delivered') {
      if (s.expected_delivery_datetime && s.actual_delivery_datetime) {
        const exp = new Date(s.expected_delivery_datetime).getTime();
        const act = new Date(s.actual_delivery_datetime).getTime();
        if (!isNaN(exp) && !isNaN(act)) {
          eligibleDelivered += 1;
          const diffHours = (act - exp) / (1000 * 60 * 60);
          totalNetDelayHours += diffHours;

          if (act <= exp) {
            onTimeDelivered += 1;
          } else {
            lateDelivered += 1;
            totalLateOnlyDelayHours += diffHours;
          }
        }
      }
    }
  }

  // Inventory movements aggregations
  let movementInTransit = 0;
  let movementCompleted = 0;
  let totalCases = 0;
  let totalValueRs = 0;

  for (const m of movements) {
    totalCases += m.quantity;
    totalValueRs += m.value || 0;
    if (m.status === 'in_transit') movementInTransit += 1;
    if (m.status === 'received' || m.status === 'completed') movementCompleted += 1;
  }

  // Alert counts
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const criticalAlerts = safeAlerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length;
  const highAlerts = safeAlerts.filter((a) => a.severity === 'high' && a.status !== 'resolved').length;

  // Affected facilities with exceptions or alerts
  const affectedFacilityIds = new Set<string>();
  for (const a of safeAlerts) {
    if (a.status !== 'resolved' && a.relatedEntityId) {
      affectedFacilityIds.add(a.relatedEntityId);
    }
  }

  // Formatted Rates
  const otdPct = eligibleDelivered > 0 ? (onTimeDelivered / eligibleDelivered) * 100 : 0;
  const latePct = eligibleDelivered > 0 ? (lateDelivered / eligibleDelivered) * 100 : 0;
  const avgDelay = eligibleDelivered > 0 ? totalNetDelayHours / eligibleDelivered : 0;
  const avgLateOnly = lateDelivered > 0 ? totalLateOnlyDelayHours / lateDelivered : 0;
  const failedAttemptRate = shipments.length > 0 ? (failedAttemptCount / shipments.length) * 100 : 0;
  const exceptionRate = shipments.length > 0 ? (exceptionCount / shipments.length) * 100 : 0;
  const movementCompRate = movements.length > 0 ? (movementCompleted / movements.length) * 100 : 0;

  return {
    totalShipments: {
      kpiId: 'total_shipments',
      value: shipments.length,
      formattedValue: shipments.length.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    dispatchedShipments: {
      kpiId: 'dispatched_shipments',
      value: dispatchedCount,
      formattedValue: dispatchedCount.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    inTransitShipments: {
      kpiId: 'in_transit_shipments',
      value: inTransitCount,
      formattedValue: inTransitCount.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    deliveredShipments: {
      kpiId: 'delivered_shipments',
      value: deliveredCount,
      formattedValue: deliveredCount.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    delayedShipments: {
      kpiId: 'delayed_shipments',
      value: delayedCount,
      formattedValue: delayedCount.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    overdueShipments: {
      kpiId: 'overdue_shipments',
      value: overdueCount,
      formattedValue: overdueCount.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    cancelledShipments: {
      kpiId: 'cancelled_shipments',
      value: cancelledCount,
      formattedValue: cancelledCount.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    onTimeDeliveryRate: {
      kpiId: 'on_time_delivery_rate',
      value: Math.round(otdPct * 10) / 10,
      formattedValue: `${(Math.round(otdPct * 10) / 10).toFixed(1)}%`,
      numerator: onTimeDelivered,
      denominator: eligibleDelivered,
      status: eligibleDelivered > 0 ? 'valid' : 'insufficient_data',
      calculationTimestamp: timestamp,
      note: `${onTimeDelivered} on-time of ${eligibleDelivered} eligible deliveries`,
    },
    lateDeliveryRate: {
      kpiId: 'late_delivery_rate',
      value: Math.round(latePct * 10) / 10,
      formattedValue: `${(Math.round(latePct * 10) / 10).toFixed(1)}%`,
      numerator: lateDelivered,
      denominator: eligibleDelivered,
      status: eligibleDelivered > 0 ? 'valid' : 'insufficient_data',
      calculationTimestamp: timestamp,
    },
    averageDeliveryDelayHours: {
      kpiId: 'average_delivery_delay_hours',
      value: Math.round(avgDelay * 10) / 10,
      formattedValue: `${avgDelay > 0 ? '+' : ''}${(Math.round(avgDelay * 10) / 10).toFixed(1)} hrs`,
      status: eligibleDelivered > 0 ? 'valid' : 'insufficient_data',
      calculationTimestamp: timestamp,
    },
    averageLatenessAmongLateHours: {
      kpiId: 'average_lateness_among_late_hours',
      value: Math.round(avgLateOnly * 10) / 10,
      formattedValue: `${(Math.round(avgLateOnly * 10) / 10).toFixed(1)} hrs`,
      numerator: Math.round(totalLateOnlyDelayHours),
      denominator: lateDelivered,
      status: lateDelivered > 0 ? 'valid' : 'zero',
      calculationTimestamp: timestamp,
    },
    deliveryAttemptFailedRate: {
      kpiId: 'delivery_attempt_failed_rate',
      value: Math.round(failedAttemptRate * 10) / 10,
      formattedValue: `${(Math.round(failedAttemptRate * 10) / 10).toFixed(1)}%`,
      numerator: failedAttemptCount,
      denominator: shipments.length,
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    shipmentExceptionRate: {
      kpiId: 'shipment_exception_rate',
      value: Math.round(exceptionRate * 10) / 10,
      formattedValue: `${(Math.round(exceptionRate * 10) / 10).toFixed(1)}%`,
      numerator: exceptionCount,
      denominator: shipments.length,
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    totalMovements: {
      kpiId: 'total_movements',
      value: movements.length,
      formattedValue: movements.length.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    inTransitMovements: {
      kpiId: 'in_transit_movements',
      value: movementInTransit,
      formattedValue: movementInTransit.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    completedMovements: {
      kpiId: 'completed_movements',
      value: movementCompleted,
      formattedValue: movementCompleted.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    movementCompletionRate: {
      kpiId: 'movement_completion_rate',
      value: Math.round(movementCompRate * 10) / 10,
      formattedValue: `${(Math.round(movementCompRate * 10) / 10).toFixed(1)}%`,
      numerator: movementCompleted,
      denominator: movements.length,
      status: movements.length > 0 ? 'valid' : 'insufficient_data',
      calculationTimestamp: timestamp,
    },
    totalQuantityCases: {
      kpiId: 'total_quantity_cases',
      value: totalCases,
      formattedValue: `${totalCases.toLocaleString()} cs`,
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    totalValueRs: {
      kpiId: 'total_value_rs',
      value: Math.round(totalValueRs),
      formattedValue: `₹${(Math.round(totalValueRs) / 100000).toFixed(1)}L`,
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    criticalAlertsCount: {
      kpiId: 'critical_alerts',
      value: criticalAlerts,
      formattedValue: criticalAlerts.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    highAlertsCount: {
      kpiId: 'high_alerts',
      value: highAlerts,
      formattedValue: highAlerts.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    openExceptionsCount: {
      kpiId: 'open_exceptions',
      value: exceptionCount,
      formattedValue: exceptionCount.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
    affectedFacilitiesCount: {
      kpiId: 'affected_facilities',
      value: affectedFacilityIds.size,
      formattedValue: affectedFacilityIds.size.toString(),
      status: 'valid',
      calculationTimestamp: timestamp,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 3. TIME-SERIES DAILY AGGREGATOR
// ─────────────────────────────────────────────────────────────

export function computeTimeSeriesTrends(
  shipments: Shipment[],
  movements: InventoryMovement[]
): TimeSeriesTrendPoint[] {
  const dateMap = new Map<string, TimeSeriesTrendPoint>();

  for (const s of shipments) {
    const dDate = s.dispatch_datetime.slice(0, 10);
    if (!dDate) continue;
    const entry = dateMap.get(dDate) || {
      date: dDate,
      dispatched: 0,
      delivered: 0,
      onTime: 0,
      delayed: 0,
      failedOrReturned: 0,
      movementsCount: 0,
    };
    entry.dispatched += 1;
    if (s.shipment_status === 'delivered') {
      entry.delivered += 1;
      if (s.expected_delivery_datetime && s.actual_delivery_datetime) {
        if (new Date(s.actual_delivery_datetime) <= new Date(s.expected_delivery_datetime)) {
          entry.onTime += 1;
        } else {
          entry.delayed += 1;
        }
      }
    } else if (s.shipment_status === 'delayed') {
      entry.delayed += 1;
    } else if (s.shipment_status === 'delivery_attempt_failed' || s.shipment_status === 'returned') {
      entry.failedOrReturned += 1;
    }
    dateMap.set(dDate, entry);
  }

  for (const m of movements) {
    const mDate = m.created_at.slice(0, 10);
    if (!mDate) continue;
    const entry = dateMap.get(mDate) || {
      date: mDate,
      dispatched: 0,
      delivered: 0,
      onTime: 0,
      delayed: 0,
      failedOrReturned: 0,
      movementsCount: 0,
    };
    entry.movementsCount += 1;
    dateMap.set(mDate, entry);
  }

  // Filter to active days with recorded activity or reasonable window
  return Array.from(dateMap.values()).filter(
    (p) => p.dispatched > 0 || p.delivered > 0 || p.movementsCount > 0
  );
}

// ─────────────────────────────────────────────────────────────
// 4. PERIOD-OVER-PERIOD COMPARISON
// ─────────────────────────────────────────────────────────────

export function computePeriodComparisons(
  currentKPIs: ExecutiveOverviewKPIs,
  previousShipmentsCount: number = 0,
  previousOTDPct: number = 0,
  previousOverdueCount: number = 0,
  previousExceptionsCount: number = 0
): MetricPeriodComparison[] {
  const comparisons: MetricPeriodComparison[] = [];

  // 1. Shipment Fulfillment Volume
  const curShipments = currentKPIs.totalShipments.value;
  const shipDiff = curShipments - previousShipmentsCount;
  const shipPct = previousShipmentsCount > 0 ? (shipDiff / previousShipmentsCount) * 100 : null;
  comparisons.push({
    metricId: 'total_shipments',
    metricName: 'Dispatched Shipment Volume',
    currentValue: curShipments,
    previousValue: previousShipmentsCount,
    absoluteChange: shipDiff,
    percentageChange: shipPct ? Math.round(shipPct * 10) / 10 : null,
    direction: shipDiff > 0 ? 'up' : shipDiff < 0 ? 'down' : 'flat',
    assessment: shipDiff >= 0 ? 'favourable' : 'unfavourable',
    explanation:
      shipDiff >= 0
        ? 'Outbound dispatch volume increased compared with the configured baseline.'
        : 'Outbound dispatch volume decreased compared with the configured baseline.',
  });

  // 2. On-Time Delivery Rate
  const curOTD = currentKPIs.onTimeDeliveryRate.value;
  const otdDiff = Math.round((curOTD - previousOTDPct) * 10) / 10;
  comparisons.push({
    metricId: 'on_time_delivery_rate',
    metricName: 'On-Time Delivery Rate (SLA)',
    currentValue: curOTD,
    previousValue: previousOTDPct,
    absoluteChange: otdDiff,
    percentageChange: otdDiff,
    direction: otdDiff > 0 ? 'up' : otdDiff < 0 ? 'down' : 'flat',
    assessment: otdDiff >= 0 ? 'favourable' : 'unfavourable',
    explanation:
      otdDiff >= 0
        ? `SLA adherence improved by ${otdDiff}% compared with the configured baseline.`
        : `SLA adherence dropped by ${Math.abs(otdDiff)}% compared with the configured baseline.`,
  });

  // 3. Overdue Undelivered Orders
  const curOverdue = currentKPIs.overdueShipments.value;
  const overdueDiff = curOverdue - previousOverdueCount;
  comparisons.push({
    metricId: 'overdue_shipments',
    metricName: 'Overdue Shipments',
    currentValue: curOverdue,
    previousValue: previousOverdueCount,
    absoluteChange: overdueDiff,
    percentageChange: previousOverdueCount > 0 ? Math.round((overdueDiff / previousOverdueCount) * 100) : null,
    direction: overdueDiff > 0 ? 'up' : overdueDiff < 0 ? 'down' : 'flat',
    assessment: overdueDiff <= 0 ? 'favourable' : 'unfavourable',
    explanation:
      overdueDiff <= 0
        ? `Overdue orders decreased by ${Math.abs(overdueDiff)}, reflecting faster transit clearance.`
        : `Active backlog increased by ${overdueDiff} shipments requiring driver re-dispatch.`,
  });

  // 4. Return Exceptions
  const curExceptions = currentKPIs.openExceptionsCount.value;
  const excDiff = curExceptions - previousExceptionsCount;
  comparisons.push({
    metricId: 'delivery_exceptions',
    metricName: 'Delivery Return Exceptions',
    currentValue: curExceptions,
    previousValue: previousExceptionsCount,
    absoluteChange: excDiff,
    percentageChange: previousExceptionsCount > 0 ? Math.round((excDiff / previousExceptionsCount) * 100) : null,
    direction: excDiff > 0 ? 'up' : excDiff < 0 ? 'down' : 'flat',
    assessment: excDiff <= 0 ? 'favourable' : 'unfavourable',
    explanation:
      excDiff <= 0
        ? 'Delivery exceptions decreased compared with the configured baseline.'
        : `Delivery exceptions increased by ${excDiff} compared with the configured baseline.`,
  });

  return comparisons;
}

// ─────────────────────────────────────────────────────────────
// 5. FACILITY PERFORMANCE ANALYTICS
// ─────────────────────────────────────────────────────────────

export function computeFacilityPerformance(
  facilities: SCLocation[],
  shipments: Shipment[] = [],
  movements: InventoryMovement[] = [],
  alerts: OperationalAlert[] = []
): FacilityPerformance[] {
  const facilityMap = new Map<string, FacilityPerformance>();

  for (const f of facilities) {
    facilityMap.set(f.id, {
      facilityId: f.id,
      facilityCode: f.code,
      facilityName: f.name,
      facilityType: f.type,
      district: f.district,
      cluster: f.cluster,
      businessUnit: f.businessUnit,
      outboundShipmentCount: 0,
      deliveredCount: 0,
      delayedCount: 0,
      failedAttemptCount: 0,
      overdueCount: 0,
      onTimeDeliveryRatePct: null,
      exceptionRatePct: 0,
      inboundMovementsCount: 0,
      inboundCases: 0,
      openAlertsCount: 0,
      criticalAlertsCount: 0,
      performanceScore: 90,
      statusTag: 'optimal',
    });
  }

  // Aggregate shipments
  for (const s of shipments) {
    const fPerf = facilityMap.get(s.source_facility_id);
    if (fPerf) {
      fPerf.outboundShipmentCount += 1;
      if (s.shipment_status === 'delivered') fPerf.deliveredCount += 1;
      if (s.shipment_status === 'delayed') fPerf.delayedCount += 1;
      if (s.shipment_status === 'delivery_attempt_failed' || s.shipment_status === 'returned') {
        fPerf.failedAttemptCount += 1;
      }
      if (s.shipment_status !== 'delivered' && s.expected_delivery_datetime) {
        if (new Date(s.expected_delivery_datetime).getTime() < Date.now()) {
          fPerf.overdueCount += 1;
        }
      }
    }
  }

  // Aggregate movements
  for (const m of movements) {
    const destPerf = facilityMap.get(m.destination_facility_id);
    if (destPerf) {
      destPerf.inboundMovementsCount += 1;
      destPerf.inboundCases += m.quantity;
    }
  }

  // Aggregate alerts
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  for (const a of safeAlerts) {
    if (a.status !== 'resolved' && a.relatedEntityId) {
      const fPerf = facilityMap.get(a.relatedEntityId);
      if (fPerf) {
        fPerf.openAlertsCount += 1;
        if (a.severity === 'critical') fPerf.criticalAlertsCount += 1;
      }
    }
  }

  // Calculate scores and status tags
  const results: FacilityPerformance[] = [];
  for (const fPerf of facilityMap.values()) {
    if (fPerf.outboundShipmentCount > 0) {
      const eligible = fPerf.deliveredCount;
      const onTime = eligible - fPerf.delayedCount;
      fPerf.onTimeDeliveryRatePct = eligible > 0 ? Math.max(0, Math.round((onTime / eligible) * 100)) : null;
      fPerf.exceptionRatePct = Math.round((fPerf.failedAttemptCount / fPerf.outboundShipmentCount) * 100);

      // Score formula: 100 base - (failed * 10) - (overdue * 8) - (criticalAlerts * 15)
      const penalty = fPerf.failedAttemptCount * 12 + fPerf.overdueCount * 8 + fPerf.criticalAlertsCount * 15;
      fPerf.performanceScore = Math.max(25, 100 - penalty);

      if (fPerf.performanceScore < 60 || fPerf.criticalAlertsCount > 0) {
        fPerf.statusTag = 'high_risk';
      } else if (fPerf.performanceScore < 80 || fPerf.failedAttemptCount > 0) {
        fPerf.statusTag = 'attention_needed';
      } else {
        fPerf.statusTag = 'optimal';
      }
    } else {
      // Hub or intermediate node with movements
      fPerf.performanceScore = 95;
      fPerf.statusTag = 'optimal';
    }
    results.push(fPerf);
  }

  return results.sort((a, b) => b.outboundShipmentCount - a.outboundShipmentCount);
}

// ─────────────────────────────────────────────────────────────
// 6. DISTRICT-LEVEL AGGREGATIONS
// ─────────────────────────────────────────────────────────────

export function computeDistrictPerformance(
  facilities: SCLocation[],
  shipments: Shipment[]
): DistrictPerformance[] {
  const districtMap = new Map<string, DistrictPerformance>();

  for (const f of facilities) {
    if (!f.district) continue;
    const dist = f.district.trim();
    if (!districtMap.has(dist)) {
      districtMap.set(dist, {
        districtName: dist,
        facilityCount: 0,
        totalShipments: 0,
        deliveredCount: 0,
        delayedCount: 0,
        failedAttemptCount: 0,
        onTimeRatePct: null,
        exceptionCount: 0,
      });
    }
    districtMap.get(dist)!.facilityCount += 1;
  }

  // Facility district lookup
  const facilityDistrict = new Map<string, string>();
  for (const f of facilities) {
    if (f.district) facilityDistrict.set(f.id, f.district.trim());
  }

  for (const s of shipments) {
    const dist = facilityDistrict.get(s.source_facility_id);
    if (dist && districtMap.has(dist)) {
      const dEntry = districtMap.get(dist)!;
      dEntry.totalShipments += 1;
      if (s.shipment_status === 'delivered') dEntry.deliveredCount += 1;
      if (s.shipment_status === 'delayed') dEntry.delayedCount += 1;
      if (s.shipment_status === 'delivery_attempt_failed' || s.shipment_status === 'returned') {
        dEntry.failedAttemptCount += 1;
      }
      if (s.exception) dEntry.exceptionCount += 1;
    }
  }

  const results: DistrictPerformance[] = [];
  for (const d of districtMap.values()) {
    if (d.deliveredCount > 0) {
      const onTime = d.deliveredCount - d.delayedCount;
      d.onTimeRatePct = Math.max(0, Math.round((onTime / d.deliveredCount) * 100));
    }
    if (d.failedAttemptCount > 2) {
      d.topConcern = 'Retail cash collection refusal';
    } else if (d.delayedCount > 1) {
      d.topConcern = 'Corridor transit delays';
    }
    results.push(d);
  }

  return results.sort((a, b) => b.totalShipments - a.totalShipments);
}

// ─────────────────────────────────────────────────────────────
// 7. BOTTLENECK DETECTION ENGINE
// ─────────────────────────────────────────────────────────────

export function detectBottlenecks(
  facilities: SCLocation[],
  shipments: Shipment[],
  movements: InventoryMovement[]
): BottleneckItem[] {
  const bottlenecks: BottleneckItem[] = [];
  const facilityLookup = new Map<string, SCLocation>();
  for (const f of facilities) facilityLookup.set(f.id, f);

  // Rule 1: Facilities with multiple failed deliveries due to retail refusal
  const failuresByFacility = new Map<string, Shipment[]>();
  for (const s of shipments) {
    if (s.shipment_status === 'delivery_attempt_failed' || s.shipment_status === 'returned') {
      const arr = failuresByFacility.get(s.source_facility_id) || [];
      arr.push(s);
      failuresByFacility.set(s.source_facility_id, arr);
    }
  }

  for (const [facId, recs] of failuresByFacility.entries()) {
    if (recs.length >= 2) {
      const fac = facilityLookup.get(facId);
      const facName = fac ? fac.name : facId;
      bottlenecks.push({
        id: `BTN-FAIL-${facId}`,
        entityType: 'facility',
        entityId: facId,
        entityName: facName,
        issueType: 'chronic_delivery_failures',
        severity: recs.length >= 4 ? 'critical' : 'high',
        metricObserved: `${recs.length} delivery returns recorded`,
        baselineComparison: 'Network median is 0-1 returns per branch',
        supportingEvidenceCount: recs.length,
        supportingRecords: recs.map((r) => r.tracking_number),
        suggestedAction:
          'Audit delivery executive beat route; review customer credit policies and cash terms.',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // Rule 2: In-Transit Stock Accumulation (STN Movements en route)
  const movementsByDest = new Map<string, InventoryMovement[]>();
  for (const m of movements) {
    if (m.status === 'in_transit') {
      const arr = movementsByDest.get(m.destination_facility_id) || [];
      arr.push(m);
      movementsByDest.set(m.destination_facility_id, arr);
    }
  }

  for (const [destId, recs] of movementsByDest.entries()) {
    if (recs.length >= 3) {
      const fac = facilityLookup.get(destId);
      const facName = fac ? fac.name : destId;
      const totalCases = recs.reduce((sum, r) => sum + r.quantity, 0);
      bottlenecks.push({
        id: `BTN-STN-${destId}`,
        entityType: 'facility',
        entityId: destId,
        entityName: facName,
        issueType: 'stalled_intransit_stock',
        severity: 'high',
        metricObserved: `${recs.length} active STN shipments (${totalCases} cases) awaiting receipt`,
        baselineComparison: 'Standard receipt window is < 48 hours from dispatch',
        supportingEvidenceCount: recs.length,
        supportingRecords: recs.map((r) => r.movement_reference),
        suggestedAction:
          'Confirm branch warehouse physical gate-in; initiate GRN confirmation in inventory system.',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return bottlenecks;
}

// ─────────────────────────────────────────────────────────────
// 8. RULE-BASED OPERATIONAL RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────

export function generateOperationalRecommendations(
  _bottlenecks: BottleneckItem[],
  alerts: OperationalAlert[],
  kpis: ExecutiveOverviewKPIs
): OperationalRecommendation[] {
  const recommendations: OperationalRecommendation[] = [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  // Recommendation 1: Return/Refusal exception root cause
  const cashRefusalCount = safeAlerts.filter((alert) => {
    const details = (
      alert?.evidence as { details?: { reason_group?: string } } | undefined
    )?.details;
    return details?.reason_group?.toLowerCase().includes('cash') && alert.status !== 'resolved';
  }).length;

  if (cashRefusalCount > 0) {
    const action = 'Equip DSEs with UPI QR collection; mandate customer SMS order confirmation before dispatch.';
    recommendations.push({
      id: 'REC-001',
      title: 'Enforce Pre-Dispatch Cash-Collection Verification',
      category: 'delivery_efficiency',
      priority: 'urgent',
      observedCondition: `${cashRefusalCount} open delivery alerts indicate cash-collection refusals.`,
      recommendedAction: action,
      ruleTriggered: 'RULE-DELIVERY-FAILED',
      concreteAction: action,
      affectedEntities: [],
      potentialImpact: 'May reduce avoidable delivery failures; validate impact against local operational data.',
    });
  }

  // Recommendation 2: STN In-Transit Receipt Reconciliation
  if (kpis && kpis.inTransitMovements && kpis.inTransitMovements.value > 10) {
    const action = 'Review in-transit transfer records and reconcile dispatch and receipt events at affected facilities.';
    recommendations.push({
      id: 'REC-002',
      title: 'Reconcile Aged STN Transfers Awaiting GRN Gate-In',
      category: 'inventory_flow',
      priority: 'urgent',
      observedCondition: `${kpis.inTransitMovements.value} inter-facility transfers (${kpis.totalQuantityCases.formattedValue}) remain in transit.`,
      recommendedAction: action,
      ruleTriggered: 'RULE-STN-INTRANSIT-AGED',
      concreteAction: action,
      affectedEntities: [],
      potentialImpact: 'Improves visibility of pipeline inventory and unresolved receipt events.',
    });
  }

  // Recommendation 3: On-Time SLA Maintenance
  if (kpis && kpis.onTimeDeliveryRate && kpis.onTimeDeliveryRate.value < 95) {
    const action = 'Review dispatch schedules and route-level transit times using the selected operational dataset.';
    recommendations.push({
      id: 'REC-003',
      title: 'Address Secondary Feeder Corridor Transit Delays',
      category: 'carrier_compliance',
      priority: 'medium',
      observedCondition: `On-time delivery rate is currently ${kpis.onTimeDeliveryRate.formattedValue} (target is >= 95.0%).`,
      recommendedAction: action,
      ruleTriggered: 'RULE-SHIPMENT-OVERDUE',
      concreteAction: action,
      affectedEntities: [],
      potentialImpact: 'Supports targeted investigation of delivery delays using local route data.',
    });
  }

  return recommendations;
}
