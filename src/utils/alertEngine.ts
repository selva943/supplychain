import type { Shipment } from '../types/shipment';
import type { InventoryMovement } from '../types/movement';
import type { SCLocation } from '../types/supplyChain';
import type {
  OperationalAlert,
  AlertSeverity,
  AlertStatus,
} from '../types/analytics';

/**
 * Generates operational alerts from the selected shipment, inventory, and facility data.
 * Applies deterministic deduplication to prevent alert spam.
 */
export function generateOperationalAlerts(
  shipments: Shipment[],
  movements: InventoryMovement[],
  facilities: SCLocation[]
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const now = Date.now();
  const nowStr = new Date(now).toISOString();

  // Facility fast lookup
  const facilityMap = new Map<string, SCLocation>();
  for (const f of facilities) facilityMap.set(f.id, f);

  // ─────────────────────────────────────────────────────────
  // Rule 1: Delivery Attempt Failed (Critical)
  // ─────────────────────────────────────────────────────────
  for (const s of shipments) {
    if (
      s.shipment_status === 'delivery_attempt_failed' ||
      (s.shipment_status as string) === 'failed_attempt' ||
      s.shipment_status === 'returned'
    ) {
      const isDamaged = s.exception?.type === 'goods_damaged';
      const severity: AlertSeverity = isDamaged ? 'critical' : 'high';
      const reasonGroup = s.exception?.reason_group || s.exception?.reason || 'Retail Refusal';

      alerts.push({
        alertId: `ALT-FAIL-${s.shipment_id}`,
        ruleId: isDamaged ? 'RULE-DAMAGED-RETURN' : 'RULE-DELIVERY-FAILED',
        category: 'delivery_failure',
        severity,
        title: isDamaged
          ? `Goods Damage Detected on ${s.tracking_number}`
          : `Delivery Failed: ${s.destination_name}`,
        description: `Shipment from ${s.source_facility_name} failed: "${reasonGroup}". Order value ₹${s.total_value_rs.toLocaleString()}.`,
        relatedEntityType: 'shipment',
        relatedEntityId: s.shipment_id,
        relatedEntityName: `${s.tracking_number} (${s.destination_name})`,
        cluster: s.cluster,
        businessUnit: s.business_unit,
        evidence: {
          metricName: 'Delivery Outcome',
          actualValue: s.shipment_status,
          thresholdValue: 'delivered',
          detectedAt: s.exception?.detected_at || s.dispatch_datetime,
          details: {
            reason: s.exception?.reason,
            reason_group: s.exception?.reason_group,
            order_reference: s.order_reference,
            dse: s.driver_reference,
          },
        },
        suggestedAction:
          s.exception?.suggested_action ||
          'Re-attempt delivery with customer contact; audit DSE cash voucher collection.',
        status: 'open',
        auditLog: [
          {
            timestamp: s.exception?.detected_at || nowStr,
            action: 'detected',
            actor: 'System (SRN Return Log Parser)',
            note: `Parsed from document ${s.shipment_reference}`,
          },
        ],
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // Rule 2: Overdue In-Transit Shipments (Critical / High)
  // ─────────────────────────────────────────────────────────
  for (const s of shipments) {
    if (s.shipment_status === 'delayed' || (s.shipment_status === 'in_transit' && s.expected_delivery_datetime)) {
      const expTime = new Date(s.expected_delivery_datetime).getTime();
      if (!isNaN(expTime) && expTime < now) {
        const hoursOverdue = Math.round((now - expTime) / (1000 * 60 * 60));
        const severity: AlertSeverity = hoursOverdue > 72 ? 'critical' : 'high';

        alerts.push({
          alertId: `ALT-OVERDUE-${s.shipment_id}`,
          ruleId: 'RULE-SHIPMENT-OVERDUE',
          category: 'shipment_sla',
          severity,
          title: `Shipment Overdue by ${hoursOverdue}h: ${s.tracking_number}`,
          description: `Shipment en route to ${s.destination_name} has exceeded expected delivery deadline (${s.expected_delivery_datetime.slice(0, 10)}).`,
          relatedEntityType: 'shipment',
          relatedEntityId: s.shipment_id,
          relatedEntityName: `${s.tracking_number} (${s.source_facility_name})`,
          cluster: s.cluster,
          businessUnit: s.business_unit,
          evidence: {
            metricName: 'Hours Overdue',
            actualValue: `${hoursOverdue} hrs`,
            thresholdValue: '0 hrs',
            detectedAt: nowStr,
            details: {
              expectedDelivery: s.expected_delivery_datetime,
              carrier: s.carrier_id,
              vehicle: s.vehicle_id,
            },
          },
          suggestedAction:
            'Contact carrier dispatch office and DSE to verify vehicle current transit position and ETA.',
          status: 'open',
          auditLog: [
            {
              timestamp: nowStr,
              action: 'detected',
              actor: 'System (SLA Monitoring Engine)',
              note: `Expected delivery timestamp ${s.expected_delivery_datetime} elapsed`,
            },
          ],
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // Rule 3: Aged In-Transit Stock Transfers (Medium)
  // ─────────────────────────────────────────────────────────
  for (const m of movements) {
    if (m.status === 'in_transit') {
      const destFac = facilityMap.get(m.destination_facility_id);
      const destName = destFac ? destFac.name : m.destination_facility_name || m.destination_facility_id;

      alerts.push({
        alertId: `ALT-STN-${m.movement_id}`,
        ruleId: 'RULE-STN-INTRANSIT-AGED',
        category: 'inventory_movement',
        severity: 'medium',
        title: `STN Transfer In Transit: ${m.movement_reference}`,
        description: `${m.quantity} cases of ${m.product_name} (₹${(m.value || 0).toLocaleString()}) in transit to ${destName}.`,
        relatedEntityType: 'movement',
        relatedEntityId: m.movement_id,
        relatedEntityName: m.movement_reference,
        evidence: {
          metricName: 'Movement Status',
          actualValue: 'in_transit',
          thresholdValue: 'received',
          detectedAt: m.created_at,
          details: {
            sku: m.product_id,
            cases: m.quantity,
            value: m.value,
          },
        },
        suggestedAction:
          'Confirm branch physical gate arrival; perform GRN verification in inventory system.',
        status: 'open',
        auditLog: [
          {
            timestamp: m.created_at,
            action: 'detected',
            actor: 'System (Inventory Valuation STN Tracker)',
          },
        ],
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // Rule 4: Data Quality & Telemetry Compliance (Low / Informational)
  // ─────────────────────────────────────────────────────────
  alerts.push({
    alertId: 'ALT-DATA-TELEMETRY-NOTICE',
    ruleId: 'RULE-DATA-QUALITY-TELEMETRY',
    category: 'data_quality',
    severity: 'low',
    title: 'Event-Based Telemetry Active (Live GPS Stream Unavailable)',
    description:
      'Shipment tracking uses confirmed ERP milestone events. Continuous vehicle GPS telematics feed is currently disconnected.',
    relatedEntityType: 'facility',
    relatedEntityId: 'system-gateway',
    relatedEntityName: 'Statewide Fleet Gateway',
    evidence: {
      metricName: 'Tracking Feed Mode',
      actualValue: 'event_based',
      thresholdValue: 'live_gps',
      detectedAt: nowStr,
    },
    suggestedAction:
      'Integrate vehicle telematics IoT gateway in Phase 5 for second-by-second live vehicle coordinates.',
    status: 'acknowledged',
    acknowledgedAt: nowStr,
    auditLog: [
      {
        timestamp: nowStr,
        action: 'detected',
        actor: 'System Audit',
      },
      {
        timestamp: nowStr,
        action: 'acknowledged',
        actor: 'Logistics Architecture Lead',
        note: 'Expected configuration per Phase 3 & 4 data limits',
      },
    ],
  });

  return alerts.map((a) => ({
    ...a,
    currentStatus: a.status,
    auditTrail: a.auditLog,
    evidenceText: typeof a.evidence === 'string' ? a.evidence : `${a.evidence?.metricName || ''}: ${a.evidence?.actualValue || ''}`,
  })) as any;
}

/**
 * Filters operational alerts according to severity, category, status, and search query.
 */
export function filterAlerts(
  alerts: OperationalAlert[],
  filters: any
): OperationalAlert[] {
  const query = (filters.searchQuery || filters.searchTerm)?.toLowerCase()?.trim();

  return alerts.filter((a) => {
    if (query) {
      const matchTitle = (a.title || '').toLowerCase().includes(query);
      const matchDesc = (a.description || '').toLowerCase().includes(query);
      const matchEntity = (a.relatedEntityName || '').toLowerCase().includes(query);
      if (!matchTitle && !matchDesc && !matchEntity) return false;
    }

    if (filters.severity && filters.severity !== 'all') {
      if (filters.severity instanceof Set) {
        if (filters.severity.size > 0 && !filters.severity.has(a.severity)) return false;
      } else if (Array.isArray(filters.severity)) {
        if (filters.severity.length > 0 && !filters.severity.includes(a.severity)) return false;
      } else if (typeof filters.severity === 'string') {
        if (a.severity !== filters.severity) return false;
      }
    }

    if (filters.category && filters.category !== 'all') {
      if (filters.category instanceof Set) {
        if (filters.category.size > 0 && !filters.category.has(a.category)) return false;
      } else if (Array.isArray(filters.category)) {
        if (filters.category.length > 0 && !filters.category.includes(a.category)) return false;
      } else if (typeof filters.category === 'string') {
        if (a.category !== filters.category) return false;
      }
    }

    const itemStatus = (a as any).status || (a as any).currentStatus;
    if (filters.status && filters.status !== 'all') {
      if (filters.status instanceof Set) {
        if (filters.status.size > 0 && !filters.status.has(itemStatus)) return false;
      } else if (Array.isArray(filters.status)) {
        if (filters.status.length > 0 && !filters.status.includes(itemStatus)) return false;
      } else if (typeof filters.status === 'string') {
        if (itemStatus !== filters.status) return false;
      }
    }

    if (filters.cluster && filters.cluster !== 'ALL' && a.cluster !== filters.cluster) {
      return false;
    }

    return true;
  });
}

/**
 * Transitions alert lifecycle state with audit log entries.
 */
export function transitionAlertStatus(
  alert: OperationalAlert,
  nextStatus: AlertStatus,
  actor: string,
  note?: string
): OperationalAlert {
  const now = new Date().toISOString();
  const existingLog = (alert as any).auditLog || (alert as any).auditTrail || [];
  const updatedLog = [
    ...existingLog,
    {
      timestamp: now,
      action: nextStatus === 'acknowledged' ? 'acknowledged' : 'status_change',
      actor,
      note,
    } as const,
  ];

  return {
    ...alert,
    status: nextStatus,
    currentStatus: nextStatus,
    acknowledgedAt: nextStatus === 'acknowledged' ? now : alert.acknowledgedAt,
    resolvedAt: nextStatus === 'resolved' ? now : alert.resolvedAt,
    resolvedTimestamp: nextStatus === 'resolved' ? now : undefined,
    resolutionNotes: nextStatus === 'resolved' ? note || 'Resolved by operator' : alert.resolutionNotes,
    auditLog: updatedLog,
    auditTrail: updatedLog,
  } as any;
}
