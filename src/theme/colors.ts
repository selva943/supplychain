import type { MapTheme } from '../types/map';

export const THEME: MapTheme = {
  background: '#07111F',
  secondaryBg: '#0B1726',
  mapSurface: '#122B35',
  mapSurfaceHover: '#1c4250',
  mapSurfaceSelected: '#184f5c',
  districtBoundary: '#2D5962',
  boundaryHighlight: '#2EE6A6',
  accentPrimary: '#2EE6A6',
  accentSecondary: '#FF9F43',
  infoBlue: '#55B8FF',
  warningAmber: '#FFB547',
  criticalRed: '#FF5D67',
};

export const LOCATION_TYPE_COLORS: Record<string, { color: string; label: string; shape: string }> = {
  // Phase 2 Enterprise Types
  central_warehouse: {
    color: '#55B8FF', // Vivid Cyan-Blue
    label: 'Central Warehouse (CW)',
    shape: 'hex',
  },
  regional_warehouse: {
    color: '#38A169', // Emerald
    label: 'Regional Warehouse (RDC)',
    shape: 'hex',
  },
  distribution_center: {
    color: '#2EE6A6', // Glowing Mint
    label: 'Distribution Centre',
    shape: 'cylinder',
  },
  branch: {
    color: '#A0E7E5', // Soft Mint
    label: 'Branch Location',
    shape: 'cylinder',
  },
  supplier: {
    color: '#FF9F43', // Warm Amber/Gold
    label: 'Supplier Facility',
    shape: 'diamond',
  },
  factory: {
    color: '#FF6B6B', // Coral Red
    label: 'Manufacturing / Factory',
    shape: 'box',
  },
  retailer: {
    color: '#D4A5FF', // Soft Lavender
    label: 'Retailer Outlet',
    shape: 'cone',
  },
  customer: {
    color: '#CBD5E0', // Light Slate
    label: 'Customer Delivery Point',
    shape: 'sphere',
  },

  // Phase 1 Legacy Types (preserved for backward compatibility)
  headquarters: {
    color: '#FF9F43',
    label: 'Corporate HQ',
    shape: 'hex',
  },
  warehouse: {
    color: '#55B8FF',
    label: 'Central Warehouse (CW)',
    shape: 'hex',
  },
};

export const ROUTE_STATUS_COLORS: Record<string, { color: string; label: string }> = {
  active: {
    color: '#2EE6A6',
    label: 'Active Network Corridor',
  },
  delayed: {
    color: '#FFB547',
    label: 'Transit Delay Alert',
  },
  disrupted: {
    color: '#FF5D67',
    label: 'Route Disrupted / Blocked',
  },
  inactive: {
    color: '#4B6275',
    label: 'Inactive / Standby',
  },
};

export const CONNECTION_TYPE_COLORS: Record<string, { color: string; label: string }> = {
  warehouse_to_warehouse: {
    color: '#55B8FF',
    label: 'Hub-to-Hub Trunk',
  },
  warehouse_to_distribution: {
    color: '#2EE6A6',
    label: 'Central to Regional',
  },
  distribution_to_branch: {
    color: '#63B3ED',
    label: 'Distribution to Branch',
  },
  supplier_to_factory: {
    color: '#FF9F43',
    label: 'Supplier Inbound',
  },
  factory_to_warehouse: {
    color: '#FF6B6B',
    label: 'Factory to Central Warehouse',
  },
  branch_to_retailer: {
    color: '#D4A5FF',
    label: 'Branch to Retail Outlet',
  },
  direct_delivery: {
    color: '#CBD5E0',
    label: 'Direct Delivery',
  },
  other: {
    color: '#81E6D9',
    label: 'General Link',
  },
};

export const SHIPMENT_STATUS_COLORS: Record<string, { color: string; label: string; badgeBg: string }> = {
  delivered: {
    color: '#2EE6A6',
    label: 'Delivered',
    badgeBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30',
  },
  in_transit: {
    color: '#55B8FF',
    label: 'In Transit',
    badgeBg: 'bg-sky-950/80 text-sky-400 border-sky-500/30',
  },
  out_for_delivery: {
    color: '#38BDF8',
    label: 'Out for Delivery',
    badgeBg: 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30',
  },
  delayed: {
    color: '#FFB547',
    label: 'Delayed',
    badgeBg: 'bg-amber-950/80 text-amber-400 border-amber-500/30',
  },
  delivery_attempt_failed: {
    color: '#FF5D67',
    label: 'Delivery Attempt Failed',
    badgeBg: 'bg-rose-950/80 text-rose-400 border-rose-500/30',
  },
  returned: {
    color: '#FF9F43',
    label: 'Returned',
    badgeBg: 'bg-orange-950/80 text-orange-400 border-orange-500/30',
  },
  ready_for_dispatch: {
    color: '#818CF8',
    label: 'Ready for Dispatch',
    badgeBg: 'bg-indigo-950/80 text-indigo-400 border-indigo-500/30',
  },
  created: {
    color: '#94A3B8',
    label: 'Created',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  on_hold: {
    color: '#C084FC',
    label: 'On Hold',
    badgeBg: 'bg-purple-950/80 text-purple-400 border-purple-500/30',
  },
  cancelled: {
    color: '#64748B',
    label: 'Cancelled',
    badgeBg: 'bg-slate-900 text-slate-500 border-slate-800',
  },
};

