/**
 * Phase 3: Shipment Tracking & Delivery Telemetry Data Models
 */

export type ShipmentStatus =
  | 'created'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_attempt_failed'
  | 'delayed'
  | 'on_hold'
  | 'returned'
  | 'cancelled';

export type TrackingMethod =
  | 'live_gps'
  | 'event_based'
  | 'estimated'
  | 'simulated'
  | 'unknown';

export type ShipmentType =
  | 'warehouse_to_branch'
  | 'branch_to_retailer'
  | 'hub_to_hub'
  | 'supplier_inbound'
  | 'direct_delivery';

export type ShipmentPriority = 'standard' | 'high' | 'urgent';

export interface ShipmentItem {
  sku: string;
  product_name: string;
  brand?: string;
  category?: string;
  dispatched_qty: number;
  received_qty?: number | null;
  unit_of_measure: 'Cases' | 'Pieces' | 'Pallets';
  value_rs: number;
}

export interface ShipmentEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  facility_name?: string;
  notes?: string;
}

export interface DeliveryException {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reason?: string | null;
  reason_group?: string | null;
  detected_at: string;
  suggested_action: string;
  resolution_status?: 'open' | 'investigating' | 'resolved';
}

export interface Shipment {
  shipment_id: string;
  shipment_reference: string;
  order_reference?: string;
  tracking_number: string;
  shipment_type: ShipmentType;

  // Facilities & Routing
  source_facility_id: string;
  source_facility_name: string;
  destination_facility_id: string;
  destination_name: string;
  destination_channel?: string;

  // Administrative / Hierarchy
  cluster?: string;
  business_unit?: string;

  // Logistics carrier & fleet
  carrier_id?: string;
  vehicle_id?: string;
  driver_reference?: string;

  // Operational Lifecycle
  shipment_status: ShipmentStatus;
  priority: ShipmentPriority;

  dispatch_datetime: string;
  expected_delivery_datetime: string;
  actual_delivery_datetime?: string | null;

  // Tracking telemetry
  last_known_latitude?: number;
  last_known_longitude?: number;
  last_location_timestamp?: string;
  tracking_method: TrackingMethod;

  // Payload contents
  total_items: number;
  total_quantity: number;
  total_value_rs: number;
  items: ShipmentItem[];

  // Chronological timeline
  events: ShipmentEvent[];

  // Exception details
  exception?: DeliveryException | null;
  notes?: string;
}

export interface DeliveryOverviewStats {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  awaitingDispatch: number;
  deliveryAttemptFailed: number;
  returned: number;
  exceptionsCount: number;
  eligibleDelivered: number;
  onTimeDelivered: number;
  onTimeDeliveryRatePct: number; // Formula: On-Time / EligibleDelivered * 100
  overdueCount: number;
}

export interface ShipmentFilters {
  searchQuery: string;
  status: Set<ShipmentStatus>;
  cluster: string;
  businessUnit: string;
  trackingMethod: Set<TrackingMethod>;
  onlyExceptions: boolean;
  onlyDelayedOrOverdue: boolean;
  priority?: ShipmentPriority | 'all';
}
