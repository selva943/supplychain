import { loadNetworkData } from './supplyChainDataService';
import { loadTrackingData } from './shipmentDataService';
import {
  computeExecutiveKPIs,
  computeTimeSeriesTrends,
  computePeriodComparisons,
  computeFacilityPerformance,
  computeDistrictPerformance,
  detectBottlenecks,
  generateOperationalRecommendations,
} from '../utils/kpiEngine';
import {
  generateOperationalAlerts,
  transitionAlertStatus,
  filterAlerts,
} from '../utils/alertEngine';
import type {
  ExecutiveOverviewKPIs,
  FacilityPerformance,
  DistrictPerformance,
  BottleneckItem,
  OperationalRecommendation,
  OperationalAlert,
  TimeSeriesTrendPoint,
  MetricPeriodComparison,
  AlertStatus,
} from '../types/analytics';

export interface AnalyticsSnapshot {
  kpis: ExecutiveOverviewKPIs;
  trends: TimeSeriesTrendPoint[];
  periodComparisons: MetricPeriodComparison[];
  facilityPerformance: FacilityPerformance[];
  districtPerformance: DistrictPerformance[];
  bottlenecks: BottleneckItem[];
  recommendations: OperationalRecommendation[];
  alerts: OperationalAlert[];
  dataFreshness: {
    lastRefreshedAt: string;
    sourceDataset: string;
    totalRecordsEvaluated: number;
    telemetryMode: string;
  };
}

let activeAlertsStore: OperationalAlert[] | null = null;

/**
 * Initializes or retrieves cached operational alerts.
 */
export function getActiveAlerts(forceRegenerate = false): OperationalAlert[] {
  if (activeAlertsStore && !forceRegenerate) {
    return activeAlertsStore;
  }
  const { shipments, movements } = loadTrackingData();
  const { locations } = loadNetworkData();
  activeAlertsStore = generateOperationalAlerts(shipments, movements, locations);
  return activeAlertsStore;
}

/**
 * Updates an alert's status (Acknowledge, In Progress, Resolve) with audit trail.
 */
export function updateAlertStatus(
  alertId: string,
  nextStatus: AlertStatus,
  actor: string = 'Operations Lead',
  note?: string
): OperationalAlert | null {
  const alerts = getActiveAlerts();
  const idx = alerts.findIndex((a) => a.alertId === alertId);
  if (idx === -1) return null;

  const updated = transitionAlertStatus(alerts[idx], nextStatus, actor, note);
  alerts[idx] = updated;
  return updated;
}

/**
 * Returns filtered active alerts.
 */
export function getFilteredAlerts(filters: any): OperationalAlert[] {
  const alerts = getActiveAlerts();
  return filterAlerts(alerts, filters);
}

/**
 * Computes a full executive analytics snapshot across all modules.
 */
export function getExecutiveAnalyticsSnapshot(): AnalyticsSnapshot {
  const { shipments, movements } = loadTrackingData();
  const { locations } = loadNetworkData();
  const alerts = getActiveAlerts();

  const kpis = computeExecutiveKPIs(shipments, movements, alerts, locations);
  const trends = computeTimeSeriesTrends(shipments, movements);
  const periodComparisons = computePeriodComparisons(kpis);
  const facilityPerformance = computeFacilityPerformance(locations, shipments, movements, alerts);
  const districtPerformance = computeDistrictPerformance(locations, shipments);
  const bottlenecks = detectBottlenecks(locations, shipments, movements);
  const recommendations = generateOperationalRecommendations(bottlenecks, alerts, kpis);

  return {
    kpis,
    trends,
    periodComparisons,
    facilityPerformance,
    districtPerformance,
    bottlenecks,
    recommendations,
    alerts,
    dataFreshness: {
      lastRefreshedAt: new Date().toISOString(),
      sourceDataset: 'Locally selected operational data',
      totalRecordsEvaluated: shipments.length + movements.length + locations.length,
      telemetryMode: 'Event-Based Milestone Tracking',
    },
  };
}

/**
 * Exports executive KPI summary and facility rankings to CSV.
 */
export function exportAnalyticsToCsv(snapshot?: AnalyticsSnapshot): string {
  const data = snapshot || getExecutiveAnalyticsSnapshot();
  const lines: string[] = [];

  // Header Section
  lines.push('=== TAMIL NADU SUPPLY CHAIN EXECUTIVE ANALYTICS SUMMARY ===');
  lines.push(`Report Generated: ${new Date().toISOString()}`);
  lines.push(`Source Dataset: ${data.dataFreshness.sourceDataset}`);
  lines.push(`SLA On-Time Delivery Rate: ${data.kpis.onTimeDeliveryRate.formattedValue}`);
  lines.push(`Total Shipments: ${data.kpis.totalShipments.formattedValue}`);
  lines.push(`Delivered Shipments: ${data.kpis.deliveredShipments.formattedValue}`);
  lines.push(`Delayed Shipments: ${data.kpis.delayedShipments.formattedValue}`);
  lines.push(`Overdue Shipments: ${data.kpis.overdueShipments.formattedValue}`);
  lines.push(`Open Exceptions: ${data.kpis.openExceptionsCount.formattedValue}`);
  lines.push('');

  // Facility Rankings
  lines.push('=== FACILITY PERFORMANCE RANKINGS ===');
  lines.push('Facility Code,Facility Name,Type,District,Cluster,Outbound Orders,Delivered,Delayed,Failed Attempts,On-Time Rate,Performance Score,Status');
  for (const f of data.facilityPerformance) {
    lines.push(
      [
        f.facilityCode,
        `"${f.facilityName}"`,
        f.facilityType,
        f.district || '',
        f.cluster || '',
        f.outboundShipmentCount,
        f.deliveredCount,
        f.delayedCount,
        f.failedAttemptCount,
        f.onTimeDeliveryRatePct !== null ? `${f.onTimeDeliveryRatePct}%` : 'N/A',
        f.performanceScore,
        f.statusTag,
      ].join(',')
    );
  }

  const csvContent = lines.join('\n');
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TN_Supply_Chain_Executive_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return csvContent;
}
