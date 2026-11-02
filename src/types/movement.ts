/**
 * Phase 3: Inventory Movement Type Definitions
 * Represents stock transfers and inventory relocations between supply chain facilities.
 */

export type MovementType =
  | 'supplier_to_factory'
  | 'supplier_to_warehouse'
  | 'factory_to_warehouse'
  | 'warehouse_to_warehouse'
  | 'warehouse_to_branch'
  | 'branch_to_branch'
  | 'branch_to_customer'
  | 'customer_return'
  | 'inter_facility_transfer'
  | 'return_to_supplier';

export type MovementStatus =
  | 'draft'
  | 'requested'
  | 'approved'
  | 'prepared'
  | 'dispatched'
  | 'in_transit'
  | 'partially_received'
  | 'received'
  | 'completed'
  | 'cancelled'
  | 'exception';

export interface InventoryMovement {
  movement_id: string;
  movement_reference: string;
  movement_type: MovementType;
  source_facility_id: string;
  destination_facility_id: string;
  destination_facility_name?: string;

  product_id: string;
  product_name: string;
  brand?: string;
  category?: string;
  sku?: string;

  quantity: number;
  received_quantity?: number;
  unit_of_measure: 'Cases' | 'Pieces' | 'Pallets' | 'Kg';
  value?: number;

  status: MovementStatus;

  created_at: string;
  dispatched_at?: string;
  received_at?: string;
  expected_delivery_at?: string;

  shipment_id?: string;
  reference_document?: string;
  notes?: string;
}

export interface MovementSummaryStats {
  totalMovements: number;
  inTransit: number;
  received: number;
  awaitingDispatch: number;
  exceptions: number;
  cancelled: number;
  totalQuantityCases: number;
  totalValueRs: number;
}
