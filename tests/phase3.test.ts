import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeDeliveryOverviewStats,
  computeMovementSummaryStats,
  filterShipments,
} from '../src/utils/deliveryAnalysis';
import { loadTrackingData } from '../src/services/shipmentDataService';
import { loadNetworkData } from '../src/services/supplyChainDataService';
import type { Shipment, ShipmentFilters } from '../src/types/shipment';
import type { InventoryMovement } from '../src/types/movement';

describe('Phase 3 Delivery Analysis & KPI Formulae', () => {
  it('correctly calculates On-Time Delivery Rate excluding cancelled orders', () => {
    const mockShipments: Shipment[] = [
      {
        shipment_id: 'S1',
        shipment_reference: 'REF1',
        tracking_number: 'TRK1',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'cust-1',
        destination_name: 'Store A',
        shipment_status: 'delivered',
        priority: 'standard',
        dispatch_datetime: '2025-01-01T08:00:00Z',
        expected_delivery_datetime: '2025-01-01T17:00:00Z',
        actual_delivery_datetime: '2025-01-01T15:30:00Z', // ON-TIME (Early)
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 10,
        total_value_rs: 1000,
        items: [],
        events: [],
      },
      {
        shipment_id: 'S2',
        shipment_reference: 'REF2',
        tracking_number: 'TRK2',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'cust-2',
        destination_name: 'Store B',
        shipment_status: 'delivered',
        priority: 'standard',
        dispatch_datetime: '2025-01-01T08:00:00Z',
        expected_delivery_datetime: '2025-01-01T17:00:00Z',
        actual_delivery_datetime: '2025-01-02T10:00:00Z', // LATE
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 5,
        total_value_rs: 500,
        items: [],
        events: [],
      },
      {
        shipment_id: 'S3',
        shipment_reference: 'REF3',
        tracking_number: 'TRK3',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'cust-3',
        destination_name: 'Store C',
        shipment_status: 'cancelled', // CANCELLED (Must be excluded from denominator)
        priority: 'standard',
        dispatch_datetime: '2025-01-01T08:00:00Z',
        expected_delivery_datetime: '2025-01-01T17:00:00Z',
        actual_delivery_datetime: null,
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 2,
        total_value_rs: 200,
        items: [],
        events: [],
      },
    ];

    const stats = computeDeliveryOverviewStats(mockShipments);
    assert.strictEqual(stats.totalShipments, 3);
    assert.strictEqual(stats.delivered, 2);
    assert.strictEqual(stats.eligibleDelivered, 2);
    assert.strictEqual(stats.onTimeDelivered, 1);
    // Formula: 1 / 2 * 100 = 50.0%
    assert.strictEqual(stats.onTimeDeliveryRatePct, 50.0);
  });

  it('protects against division by zero on empty dataset', () => {
    const stats = computeDeliveryOverviewStats([]);
    assert.strictEqual(stats.totalShipments, 0);
    assert.strictEqual(stats.eligibleDelivered, 0);
    assert.strictEqual(stats.onTimeDeliveryRatePct, 0);
  });

  it('correctly calculates overdue shipments when expected ETA has passed without delivery', () => {
    const mockShipments: Shipment[] = [
      {
        shipment_id: 'S_OVERDUE',
        shipment_reference: 'REF_O',
        tracking_number: 'TRK_O',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-test',
        source_facility_name: 'Test Branch',
        destination_facility_id: 'cust-1',
        destination_name: 'Store A',
        shipment_status: 'in_transit',
        priority: 'standard',
        dispatch_datetime: '2025-01-15T08:00:00Z',
        expected_delivery_datetime: '2025-01-16T17:00:00Z', // In the past relative to Oct 31 snapshot
        actual_delivery_datetime: null,
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 10,
        total_value_rs: 1000,
        items: [],
        events: [],
      },
    ];

    const stats = computeDeliveryOverviewStats(mockShipments);
    assert.strictEqual(stats.overdueCount, 1);
  });

  it('accurately aggregates inventory movement statistics', () => {
    const mockMovements: InventoryMovement[] = [
      {
        movement_id: 'M1',
        movement_reference: 'STN-1',
        movement_type: 'warehouse_to_branch',
        source_facility_id: 'warehouse-test-1',
        destination_facility_id: 'branch-test-2',
        product_id: 'P1',
        product_name: 'Product A',
        quantity: 50,
        unit_of_measure: 'Cases',
        value: 25000,
        status: 'in_transit',
        created_at: '2025-01-25T10:00:00Z',
      },
      {
        movement_id: 'M2',
        movement_reference: 'STN-2',
        movement_type: 'warehouse_to_branch',
        source_facility_id: 'warehouse-test-2',
        destination_facility_id: 'branch-test-3',
        product_id: 'P2',
        product_name: 'Product B',
        quantity: 30,
        unit_of_measure: 'Cases',
        value: 15000,
        status: 'received',
        created_at: '2025-01-24T10:00:00Z',
      },
    ];

    const stats = computeMovementSummaryStats(mockMovements);
    assert.strictEqual(stats.totalMovements, 2);
    assert.strictEqual(stats.inTransit, 1);
    assert.strictEqual(stats.received, 1);
    assert.strictEqual(stats.totalQuantityCases, 80);
    assert.strictEqual(stats.totalValueRs, 40000);
  });

  it('filters shipments by search query, status, and cluster', () => {
    const shipments: Shipment[] = [
      {
        shipment_id: 'LOCAL-1',
        shipment_reference: 'REF-1',
        tracking_number: 'TRK-1',
        shipment_type: 'branch_to_retailer',
        source_facility_id: 'branch-1',
        source_facility_name: 'Branch 1',
        destination_facility_id: 'store-1',
        destination_name: 'Store 1',
        cluster: 'Network A',
        shipment_status: 'delivered',
        priority: 'standard',
        dispatch_datetime: '2025-01-01T08:00:00Z',
        expected_delivery_datetime: '2025-01-01T17:00:00Z',
        tracking_method: 'event_based',
        total_items: 1,
        total_quantity: 10,
        total_value_rs: 1000,
        items: [],
        events: [],
      },
    ];

    const defaultFilters: ShipmentFilters = {
      searchQuery: '',
      status: new Set(['delivered']),
      cluster: 'ALL',
      businessUnit: 'ALL',
      trackingMethod: new Set(),
      onlyExceptions: false,
      onlyDelayedOrOverdue: false,
    };

    const deliveredShipments = filterShipments(shipments, defaultFilters);
    for (const s of deliveredShipments) {
      assert.strictEqual(s.shipment_status, 'delivered');
    }

    // Filter by cluster
    const cluster1Filters: ShipmentFilters = {
      ...defaultFilters,
      status: new Set(),
      cluster: 'Network A',
    };
    const cluster1Shipments = filterShipments(shipments, cluster1Filters);
    for (const s of cluster1Shipments) {
      assert.strictEqual(s.cluster, 'Network A');
    }
  });

  it('starts without bundled operational shipment or facility records', () => {
    const { shipments } = loadTrackingData();
    const { locations } = loadNetworkData();
    assert.deepStrictEqual(shipments, []);
    assert.deepStrictEqual(locations, []);
  });
});
