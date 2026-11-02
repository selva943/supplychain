import assert from 'node:assert';
import { describe, it } from 'node:test';
import { parseLocalOperationsData } from '../src/services/localOperationsDataService';

const validDocuments = {
  'locations.json': [
    {
      id: 'facility-1',
      code: 'F1',
      name: 'Facility 1',
      type: 'branch',
      latitude: 10,
      longitude: 78,
      status: 'active',
    },
  ],
  'connections.json': [
    {
      id: 'route-1',
      sourceLocationId: 'facility-1',
      destinationLocationId: 'facility-2',
      connectionType: 'other',
      direction: 'one_way',
      status: 'active',
    },
  ],
  'shipments.json': [
    {
      shipment_id: 'shipment-1',
      shipment_reference: 'reference-1',
      tracking_number: 'tracking-1',
      shipment_type: 'direct_delivery',
      source_facility_id: 'facility-1',
      source_facility_name: 'Facility 1',
      destination_facility_id: 'facility-2',
      destination_name: 'Facility 2',
      shipment_status: 'in_transit',
      priority: 'standard',
      dispatch_datetime: '2025-01-01T08:00:00Z',
      expected_delivery_datetime: '2025-01-02T08:00:00Z',
      tracking_method: 'event_based',
      total_items: 0,
      total_quantity: 0,
      total_value_rs: 0,
      items: [],
      events: [],
    },
  ],
  'movements.json': [
    {
      movement_id: 'movement-1',
      movement_reference: 'reference-1',
      movement_type: 'inter_facility_transfer',
      source_facility_id: 'facility-1',
      destination_facility_id: 'facility-2',
      product_id: 'product-1',
      product_name: 'Product 1',
      quantity: 1,
      unit_of_measure: 'Cases',
      status: 'in_transit',
      created_at: '2025-01-01T08:00:00Z',
    },
  ],
};

describe('Local operational data import', () => {
  it('parses all required local data files', () => {
    const data = parseLocalOperationsData(validDocuments);
    assert.strictEqual(data.locations.length, 1);
    assert.strictEqual(data.connections.length, 1);
    assert.strictEqual(data.shipments.length, 1);
    assert.strictEqual(data.movements.length, 1);
  });

  it('rejects imports missing required files', () => {
    assert.throws(
      () => parseLocalOperationsData({ 'locations.json': [] }),
      /Select all four data files/
    );
  });

  it('rejects malformed records with the source file identified', () => {
    assert.throws(
      () => parseLocalOperationsData({
        ...validDocuments,
        'locations.json': [{ id: 'missing-required-fields' }],
      }),
      /locations\.json contains an invalid record/
    );
  });
});
