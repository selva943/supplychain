import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeExecutiveKPIs,
  computeFacilityPerformance,
  computeDistrictPerformance,
  detectBottlenecks,
  generateOperationalRecommendations,
} from '../src/utils/kpiEngine';
import {
  generateOperationalAlerts,
  transitionAlertStatus,
  filterAlerts,
} from '../src/utils/alertEngine';
import { loadTrackingData } from '../src/services/shipmentDataService';
import { loadNetworkData } from '../src/services/supplyChainDataService';
import type { Shipment } from '../src/types/shipment';
import type { SCLocation } from '../src/types/supplyChain';

describe('Phase 4: Centralized KPI Engine & Operational Analytics', () => {
  it('correctly calculates on-time, late, early, and signed average delay', () => {
    const mockShipments: Shipment[] = [
      {
        shipment_id: 'S-ONTIME-EARLY',
        shipment_reference: 'REF-01',
        tracking_number: 'TRK-01',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'store-1',
        destination_name: 'Store 1',
        shipment_status: 'delivered',
        priority: 'standard',
        dispatch_datetime: '2025-01-10T08:00:00Z',
        expected_delivery_datetime: '2025-01-10T16:00:00Z',
        actual_delivery_datetime: '2025-01-10T14:00:00Z', // 2 hours early (-2.0h)
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 10,
        total_value_rs: 5000,
        items: [],
        events: [],
      },
      {
        shipment_id: 'S-LATE',
        shipment_reference: 'REF-02',
        tracking_number: 'TRK-02',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'store-2',
        destination_name: 'Store 2',
        shipment_status: 'delivered',
        priority: 'standard',
        dispatch_datetime: '2025-01-10T08:00:00Z',
        expected_delivery_datetime: '2025-01-10T16:00:00Z',
        actual_delivery_datetime: '2025-01-10T20:00:00Z', // 4 hours late (+4.0h)
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 5,
        total_value_rs: 2500,
        items: [],
        events: [],
      },
      {
        shipment_id: 'S-CANCELLED',
        shipment_reference: 'REF-03',
        tracking_number: 'TRK-03',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'store-3',
        destination_name: 'Store 3',
        shipment_status: 'cancelled', // Must be excluded from delivery denominator
        priority: 'standard',
        dispatch_datetime: '2025-01-10T08:00:00Z',
        expected_delivery_datetime: '2025-01-10T16:00:00Z',
        actual_delivery_datetime: null,
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 5,
        total_value_rs: 1000,
        items: [],
        events: [],
      },
      {
        shipment_id: 'S-OVERDUE-UNDELIVERED',
        shipment_reference: 'REF-04',
        tracking_number: 'TRK-04',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'store-4',
        destination_name: 'Store 4',
        shipment_status: 'in_transit', // In transit but past expected
        priority: 'standard',
        dispatch_datetime: '2025-01-10T08:00:00Z',
        expected_delivery_datetime: '2025-01-12T16:00:00Z', // Expired relative to 2025-01-31
        actual_delivery_datetime: null,
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 20,
        total_value_rs: 10000,
        items: [],
        events: [],
      },
    ];

    const kpis = computeExecutiveKPIs(mockShipments, []);

    // Eligible delivered shipments: 2 (S-ONTIME-EARLY, S-LATE)
    assert.strictEqual(kpis.deliveredShipments.value, 2);
    // On-time deliveries: 1 (S-ONTIME-EARLY)
    assert.strictEqual(kpis.onTimeDeliveryRate.numerator, 1);
    assert.strictEqual(kpis.onTimeDeliveryRate.denominator, 2);
    assert.strictEqual(kpis.onTimeDeliveryRate.value, 50);

    // Late delivery rate: 1 / 2 = 50%
    assert.strictEqual(kpis.lateDeliveryRate.value, 50);

    // Average delivery delay: ( -2.0 + 4.0 ) / 2 = +1.0 hour
    assert.strictEqual(kpis.averageDeliveryDelayHours.value, 1.0);

    // Average lateness among late deliveries: +4.0 hours (early deliveries do not dilute lateness)
    assert.strictEqual(kpis.averageLatenessAmongLateHours.value, 4.0);

    // Overdue shipments count: 1 (S-OVERDUE-UNDELIVERED)
    assert.strictEqual(kpis.overdueShipments.value, 1);
  });

  it('handles zero denominators and empty datasets gracefully without NaN', () => {
    const kpis = computeExecutiveKPIs([], []);

    assert.strictEqual(kpis.totalShipments.value, 0);
    assert.strictEqual(kpis.onTimeDeliveryRate.value, 0);
    assert.strictEqual(kpis.onTimeDeliveryRate.status, 'insufficient_data');
    assert.strictEqual(kpis.averageDeliveryDelayHours.value, 0);
    assert.strictEqual(isNaN(kpis.onTimeDeliveryRate.value), false);
  });

  it('correctly calculates Movement Completion Rate from inventory movements', () => {
    const mockMovements: any[] = [
      {
        movement_id: 'MOV-1',
        movement_reference: 'STN-101',
        movement_type: 'inter_branch_transfer',
        source_facility_id: 'wh-1',
        source_facility_name: 'WH 1',
        destination_facility_id: 'branch-1',
        destination_facility_name: 'Branch 1',
        status: 'completed',
        scheduled_dispatch: '2025-01-01T00:00:00Z',
        actual_dispatch: '2025-01-01T02:00:00Z',
        actual_receipt: '2025-01-02T10:00:00Z',
        quantity: 100,
        value: 50000,
        items: [],
      },
      {
        movement_id: 'MOV-2',
        movement_reference: 'STN-102',
        movement_type: 'inter_branch_transfer',
        source_facility_id: 'wh-1',
        source_facility_name: 'WH 1',
        destination_facility_id: 'branch-2',
        destination_facility_name: 'Branch 2',
        status: 'in_transit',
        scheduled_dispatch: '2025-01-01T00:00:00Z',
        actual_dispatch: '2025-01-01T02:00:00Z',
        quantity: 50,
        value: 25000,
        items: [],
      },
    ];

    const kpis = computeExecutiveKPIs([], mockMovements);
    assert.strictEqual(kpis.totalMovements.value, 2);
    assert.strictEqual(kpis.completedMovements.value, 1);
    assert.strictEqual(kpis.movementCompletionRate.value, 50.0);
    assert.strictEqual(kpis.totalQuantityCases.value, 150);
    assert.strictEqual(kpis.totalValueRs.value, 75000);
  });
});

describe('Phase 4: Operational Alert Engine Rules & Lifecycle', () => {
  const mockLocations: SCLocation[] = [
    {
      id: 'branch-test',
      name: 'Test Branch',
      type: 'branch',
      district: 'Test District',
      coordinates: [78.1198, 9.9252],
      cluster: 'Cluster 2',
      businessUnit: 'FMCG',
    },
  ];

  it('generates alerts for delivery failure and overdue shipments with deterministic IDs', () => {
    const mockShipments: Shipment[] = [
      {
        shipment_id: 'SHP-FAIL-01',
        shipment_reference: 'SRN-FAIL-01',
        tracking_number: 'TRK-FAIL-01',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'store-1',
        destination_name: 'Test Store',
        shipment_status: 'delivery_attempt_failed',
        priority: 'high',
        dispatch_datetime: '2025-01-20T08:00:00Z',
        expected_delivery_datetime: '2025-01-20T17:00:00Z',
        actual_delivery_datetime: null,
        delivery_exception_reason: 'Cash collection unavailable',
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 10,
        total_value_rs: 5000,
        items: [],
        events: [],
      },
    ];

    const alerts1 = generateOperationalAlerts(mockShipments, [], mockLocations);
    const failAlert1 = alerts1.find((a) => a.ruleId === 'RULE-DELIVERY-FAILED');
    assert.ok(failAlert1);
    assert.strictEqual(failAlert1.severity, 'high');
    assert.strictEqual(failAlert1.alertId, 'ALT-FAIL-SHP-FAIL-01');

    // Test deduplication: Generating alerts again produces identical alert IDs
    const alerts2 = generateOperationalAlerts(mockShipments, [], mockLocations);
    const failAlert2 = alerts2.find((a) => a.ruleId === 'RULE-DELIVERY-FAILED');
    assert.ok(failAlert2);
    assert.strictEqual(failAlert2.alertId, failAlert1.alertId);
  });

  it('correctly transitions alert lifecycle state and updates audit trail', () => {
    const mockShipments: Shipment[] = [
      {
        shipment_id: 'SHP-OVERDUE-01',
        shipment_reference: 'SRN-OD-01',
        tracking_number: 'TRK-OD-01',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'store-1',
        destination_name: 'Store 1',
        shipment_status: 'delayed',
        priority: 'critical',
        dispatch_datetime: '2025-01-01T08:00:00Z',
        expected_delivery_datetime: '2025-01-02T16:00:00Z', // Long overdue relative to 31-Oct
        actual_delivery_datetime: null,
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 10,
        total_value_rs: 5000,
        items: [],
        events: [],
      },
    ];

    const alerts = generateOperationalAlerts(mockShipments, [], mockLocations);
    const overdueAlert = alerts.find((a) => a.ruleId === 'RULE-SHIPMENT-OVERDUE')!;
    assert.ok(overdueAlert);
    assert.strictEqual(overdueAlert.status, 'open');

    // 1. Transition to acknowledged
    const ackAlert = transitionAlertStatus(
      overdueAlert,
      'acknowledged',
      'Ops Dispatcher',
      'Contacted carrier driver'
    );
    assert.strictEqual(ackAlert.status, 'acknowledged');
    assert.strictEqual(ackAlert.auditLog.length, 2);

    // 2. Transition to in_progress
    const progAlert = transitionAlertStatus(
      ackAlert,
      'in_progress',
      'Logistics Supervisor',
      'Escalated to hub manager'
    );
    assert.strictEqual(progAlert.status, 'in_progress');

    // 3. Transition to resolved
    const resAlert = transitionAlertStatus(
      progAlert,
      'resolved',
      'Logistics Supervisor',
      'Package verified delivered with physical POD'
    );
    assert.strictEqual(resAlert.status, 'resolved');
    assert.ok(resAlert.resolvedAt);
    assert.strictEqual(resAlert.resolutionNotes, 'Package verified delivered with physical POD');
  });

  it('filters alerts accurately by severity, category, and status', () => {
    const mockAlerts: any[] = [
      {
        alertId: 'ALT-1',
        ruleId: 'RULE-1',
        category: 'shipment_sla',
        severity: 'critical',
        title: 'Critical Shipment Alert',
        description: 'Overdue by 72 hours',
        evidence: { metricName: 'Delay', actualValue: '72h', thresholdValue: '0h', detectedAt: '2025-01-25' },
        relatedEntityType: 'shipment',
        relatedEntityId: 'S1',
        relatedEntityName: 'Shipment 1',
        status: 'open',
        suggestedAction: 'Contact driver',
        auditLog: [],
      },
      {
        alertId: 'ALT-2',
        ruleId: 'RULE-2',
        category: 'facility_risk',
        severity: 'medium',
        title: 'Facility Alert',
        description: 'Capacity approaching limit',
        evidence: { metricName: 'Capacity', actualValue: '95%', thresholdValue: '90%', detectedAt: '2025-01-25' },
        relatedEntityType: 'facility',
        relatedEntityId: 'F1',
        relatedEntityName: 'Facility 1',
        status: 'resolved',
        suggestedAction: 'Reroute incoming',
        auditLog: [],
      },
    ];

    const criticalOnly = filterAlerts(mockAlerts, { severity: 'critical' });
    assert.strictEqual(criticalOnly.length, 1);
    assert.strictEqual(criticalOnly[0].alertId, 'ALT-1');

    const openOnly = filterAlerts(mockAlerts, { status: 'open' });
    assert.strictEqual(openOnly.length, 1);
    assert.strictEqual(openOnly[0].alertId, 'ALT-1');

    const facilityOnly = filterAlerts(mockAlerts, { category: 'facility_risk' });
    assert.strictEqual(facilityOnly.length, 1);
    assert.strictEqual(facilityOnly[0].alertId, 'ALT-2');
  });
});

describe('Phase 4: Network Bottleneck Intelligence & Production Data Validation', () => {
  it('does not report operational analytics before local data is selected', () => {
    const { shipments, movements } = loadTrackingData();
    const { locations } = loadNetworkData();
    const alerts = generateOperationalAlerts(shipments, movements, locations);

    const kpis = computeExecutiveKPIs(shipments, movements, alerts, locations);
    assert.strictEqual(kpis.totalShipments.value, 0);
    assert.strictEqual(kpis.onTimeDeliveryRate.value, 0);
    assert.strictEqual(kpis.dispatchedShipments.value, 0);

    const facilityPerf = computeFacilityPerformance(locations, shipments, movements);
    const districtPerf = computeDistrictPerformance(locations, shipments);
    const bottlenecks = detectBottlenecks(locations, shipments, movements);
    const recommendations = generateOperationalRecommendations(bottlenecks, alerts, kpis);
    assert.deepStrictEqual(facilityPerf, []);
    assert.deepStrictEqual(districtPerf, []);
    assert.deepStrictEqual(bottlenecks, []);
    assert.ok(Array.isArray(recommendations));
  });
});
