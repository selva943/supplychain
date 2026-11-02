import type { InventoryMovement } from '../types/movement';
import type { Shipment } from '../types/shipment';
import type { SCConnection, SCLocation } from '../types/supplyChain';

export interface LocalOperationsData {
  locations: SCLocation[];
  connections: SCConnection[];
  shipments: Shipment[];
  movements: InventoryMovement[];
}

const REQUIRED_FILES = [
  'locations.json',
  'connections.json',
  'shipments.json',
  'movements.json',
] as const;

type DatasetFile = (typeof REQUIRED_FILES)[number];
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStrings(record: JsonRecord, fields: string[]): boolean {
  return fields.every((field) => typeof record[field] === 'string');
}

function hasNumber(record: JsonRecord, field: string): boolean {
  return typeof record[field] === 'number' && Number.isFinite(record[field]);
}

function parseRecords<T>(
  fileName: DatasetFile,
  value: unknown,
  isValidRecord: (record: JsonRecord) => boolean
): T[] {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`${fileName} must contain a JSON array of objects.`);
  }

  const invalidIndex = value.findIndex((record) => !isValidRecord(record));
  if (invalidIndex !== -1) {
    throw new Error(`${fileName} contains an invalid record at index ${invalidIndex}.`);
  }

  return value as T[];
}

export function parseLocalOperationsData(
  documents: Partial<Record<DatasetFile, unknown>>
): LocalOperationsData {
  const missingFiles = REQUIRED_FILES.filter((fileName) => !(fileName in documents));
  if (missingFiles.length > 0) {
    throw new Error(`Select all four data files. Missing: ${missingFiles.join(', ')}.`);
  }

  const locations = parseRecords<SCLocation>(
    'locations.json',
    documents['locations.json'],
    (record) =>
      hasStrings(record, ['id', 'code', 'name', 'type', 'status']) &&
      hasNumber(record, 'latitude') &&
      hasNumber(record, 'longitude')
  );
  const connections = parseRecords<SCConnection>(
    'connections.json',
    documents['connections.json'],
    (record) =>
      hasStrings(record, [
        'id',
        'sourceLocationId',
        'destinationLocationId',
        'connectionType',
        'direction',
        'status',
      ])
  );
  const shipments = parseRecords<Shipment>(
    'shipments.json',
    documents['shipments.json'],
    (record) =>
      hasStrings(record, [
        'shipment_id',
        'shipment_reference',
        'tracking_number',
        'shipment_type',
        'source_facility_id',
        'source_facility_name',
        'destination_facility_id',
        'destination_name',
        'shipment_status',
        'priority',
        'dispatch_datetime',
        'expected_delivery_datetime',
        'tracking_method',
      ]) &&
      hasNumber(record, 'total_items') &&
      hasNumber(record, 'total_quantity') &&
      hasNumber(record, 'total_value_rs') &&
      Array.isArray(record.items) &&
      Array.isArray(record.events)
  );
  const movements = parseRecords<InventoryMovement>(
    'movements.json',
    documents['movements.json'],
    (record) =>
      hasStrings(record, [
        'movement_id',
        'movement_reference',
        'movement_type',
        'source_facility_id',
        'destination_facility_id',
        'product_id',
        'product_name',
        'unit_of_measure',
        'status',
        'created_at',
      ]) && hasNumber(record, 'quantity')
  );

  return { locations, connections, shipments, movements };
}

export const LOCAL_OPERATIONS_DATA_FILES = REQUIRED_FILES;
