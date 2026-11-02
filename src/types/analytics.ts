/**
 * Phase 4: Supply Chain KPIs, Alerts & Performance Analytics Type System
 *
 * Implements a centralized, audit-compliant schema for enterprise metrics,
 * alert lifecycles, bottleneck intelligence, and executive reporting.
 */

import type { FacilityType } from './supplyChain';

// ─────────────────────────────────────────────────────────────
// 1. KPI DEFINITIONS & METADATA
// ─────────────────────────────────────────────────────────────

export interface KPIDefinition {
  id: string;
  displayName: string;
  businessDefinition: string;
  formula: string;
  numeratorDescription?: string;
  denominatorDescription?: string;
  requiredFields: string[];
  unit: string;
  dateBasis: string;
  exclusionRules: string[];
}

export interface CalculatedKPIValue {
  kpiId: string;
  value: number;
  formattedValue: string;
  numerator?: number;
  denominator?: number;
  status: 'valid' | 'zero' | 'insufficient_data' | 'stale';
  calculationTimestamp: string;
  note?: string;
}

// ─────────────────────────────────────────────────────────────
// 2. EXECUTIVE OVERVIEW METRICS
// ─────────────────────────────────────────────────────────────

export interface ExecutiveOverviewKPIs {
  // A. Shipment Overview
  totalShipments: CalculatedKPIValue;
  dispatchedShipments: CalculatedKPIValue;
  inTransitShipments: CalculatedKPIValue;
  deliveredShipments: CalculatedKPIValue;
  delayedShipments: CalculatedKPIValue;
  overdueShipments: CalculatedKPIValue;
  cancelledShipments: CalculatedKPIValue;

  // B. Delivery Performance
  onTimeDeliveryRate: CalculatedKPIValue;
  lateDeliveryRate: CalculatedKPIValue;
  averageDeliveryDelayHours: CalculatedKPIValue;
  averageLatenessAmongLateHours: CalculatedKPIValue;
  deliveryAttemptFailedRate: CalculatedKPIValue;
  shipmentExceptionRate: CalculatedKPIValue;

  // C. Inventory Movement
  totalMovements: CalculatedKPIValue;
  inTransitMovements: CalculatedKPIValue;
  completedMovements: CalculatedKPIValue;
  movementCompletionRate: CalculatedKPIValue;
  totalQuantityCases: CalculatedKPIValue;
  totalValueRs: CalculatedKPIValue;

  // D. Operational Risk & Quality
  criticalAlertsCount: CalculatedKPIValue;
  highAlertsCount: CalculatedKPIValue;
  openExceptionsCount: CalculatedKPIValue;
  affectedFacilitiesCount: CalculatedKPIValue;
}

// ─────────────────────────────────────────────────────────────
// 3. TRENDS & PERIOD COMPARISONS
// ─────────────────────────────────────────────────────────────

export interface TimeSeriesTrendPoint {
  date: string; // YYYY-MM-DD
  dispatched: number;
  delivered: number;
  onTime: number;
  delayed: number;
  failedOrReturned: number;
  movementsCount: number;
}

export interface MetricPeriodComparison {
  metricId: string;
  metricName: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentageChange: number | null; // null if previous was 0
  direction: 'up' | 'down' | 'flat';
  assessment: 'favourable' | 'unfavourable' | 'neutral';
  explanation: string;
}

// ─────────────────────────────────────────────────────────────
// 4. FACILITY & DISTRICT PERFORMANCE
// ─────────────────────────────────────────────────────────────

export interface FacilityPerformance {
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  facilityType: FacilityType;
  district?: string;
  cluster?: string;
  businessUnit?: string;

  // Shipment activity
  outboundShipmentCount: number;
  deliveredCount: number;
  delayedCount: number;
  failedAttemptCount: number;
  overdueCount: number;

  // Performance rates
  onTimeDeliveryRatePct: number | null;
  exceptionRatePct: number;

  // Inventory movements
  inboundMovementsCount: number;
  inboundCases: number;

  // Risk profile
  openAlertsCount: number;
  criticalAlertsCount: number;
  performanceScore: number; // 0 - 100
  statusTag: 'optimal' | 'attention_needed' | 'high_risk';
}

export interface DistrictPerformance {
  districtName: string;
  facilityCount: number;
  totalShipments: number;
  deliveredCount: number;
  delayedCount: number;
  failedAttemptCount: number;
  onTimeRatePct: number | null;
  exceptionCount: number;
  topConcern?: string;
}

// ─────────────────────────────────────────────────────────────
// 5. BOTTLENECK DETECTION
// ─────────────────────────────────────────────────────────────

export interface BottleneckItem {
  id: string;
  entityType: 'facility' | 'route' | 'cluster';
  entityId: string;
  entityName: string;
  issueType:
    | 'chronic_delivery_failures'
    | 'stalled_intransit_stock'
    | 'high_delay_frequency'
    | 'repeated_cash_collection_refusal';
  severity: 'high' | 'critical';
  metricObserved: string;
  baselineComparison: string;
  supportingEvidenceCount: number;
  supportingRecordsCount?: number;
  supportingRecords: string[]; // Shipment IDs or Movement IDs
  evidence?: string;
  suggestedAction: string;
  detectedAt: string;
}

// ─────────────────────────────────────────────────────────────
// 6. OPERATIONAL ALERT ENGINE
// ─────────────────────────────────────────────────────────────

export type AlertCategory =
  | 'shipment_sla'
  | 'delivery_failure'
  | 'inventory_movement'
  | 'facility_risk'
  | 'data_quality';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AlertStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved';

export interface AlertAuditEntry {
  timestamp: string;
  action: 'detected' | 'acknowledged' | 'status_change' | 'assigned' | 'resolved';
  actor: string;
  note?: string;
  notes?: string;
}

export interface OperationalAlert {
  alertId: string;
  ruleId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;

  // Related Entity
  relatedEntityType: 'shipment' | 'movement' | 'facility' | 'connection';
  relatedEntityId: string;
  relatedEntityName: string;
  cluster?: string;
  businessUnit?: string;

  // Evidence & Telemetry
  evidence: {
    metricName: string;
    actualValue: string | number;
    thresholdValue: string | number;
    detectedAt: string;
    details?: Record<string, unknown>;
  };

  // Operational Response
  suggestedAction: string;
  status: AlertStatus;
  currentStatus?: AlertStatus;
  assignedTo?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolvedTimestamp?: string;
  resolutionNotes?: string;

  auditLog: AlertAuditEntry[];
  auditTrail?: AlertAuditEntry[];
}

export interface AlertFilterOptions {
  severity?: Set<AlertSeverity>;
  category?: Set<AlertCategory>;
  status?: Set<AlertStatus>;
  cluster?: string;
  searchQuery?: string;
}

// ─────────────────────────────────────────────────────────────
// 7. OPERATIONAL RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────

export interface OperationalRecommendation {
  id: string;
  title: string;
  category: 'delivery_efficiency' | 'inventory_flow' | 'carrier_compliance' | 'data_hygiene';
  priority: 'urgent' | 'medium' | 'routine';
  observedCondition: string;
  recommendedAction: string;
  affectedEntities: string[];
  potentialImpact: string;
  ruleTriggered?: string;
  concreteAction?: string;
}
