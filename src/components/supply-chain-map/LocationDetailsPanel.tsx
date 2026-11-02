import React from 'react';
import {
  X,
  MapPin,
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  AlertCircle,
} from 'lucide-react';
import type {
  SelectedEntity,
  SupplyChainLocation,
  SupplyChainRoute,
  DistrictProperties,
} from '../../types/map';
import type {
  SCLocation,
  SCConnection,
  FacilityConnectionCounts,
} from '../../types/supplyChain';
import {
  LOCATION_TYPE_COLORS,
  ROUTE_STATUS_COLORS,
  CONNECTION_TYPE_COLORS,
  SHIPMENT_STATUS_COLORS,
} from '../../theme/colors';

type AnyLocation = SupplyChainLocation | SCLocation;
type AnyConnection = SupplyChainRoute | SCConnection;

interface LocationDetailsPanelProps {
  selectedEntity: SelectedEntity;
  locations: AnyLocation[];
  routes: AnyConnection[];
  connectionCounts?: Map<string, FacilityConnectionCounts>;
  onClearSelection: () => void;
  onSelectLocationById: (id: string) => void;
}

export const LocationDetailsPanel: React.FC<LocationDetailsPanelProps> = ({
  selectedEntity,
  locations,
  routes,
  connectionCounts,
  onClearSelection,
  onSelectLocationById,
}) => {
  // If nothing is selected, show Network Topology Overview
  if (!selectedEntity) {
    const totalFacilities = locations.length;
    const centralWarehouses = locations.filter(
      (l) => l.type === 'central_warehouse' || l.type === 'headquarters'
    ).length;
    const branches = locations.filter((l) => l.type === 'branch').length;
    const totalConnections = routes.length;
    const primaryHubs = locations.filter(
      (location) => location.type === 'central_warehouse' || location.type === 'headquarters'
    );

    return (
      <div className="h-full flex flex-col p-5 text-slate-300 overflow-y-auto font-sans">
        <div className="border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono tracking-wider uppercase mb-1">
            <Compass className="w-4 h-4" />
            <span>Phase 2 • Network Explorer</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Tamil Nadu Supply Network</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Network topology calculated from the data loaded for this browser session.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Verified Facilities</span>
            <span className="text-xl font-mono font-bold text-white">{totalFacilities}</span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              {centralWarehouses} CW Hubs • {branches} Branches
            </span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block font-medium">Logistics Links</span>
            <span className="text-xl font-mono font-bold text-sky-400">{totalConnections}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">1 Trunk • {totalConnections - 1} Corridors</span>
          </div>
        </div>

        {primaryHubs.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Primary Hub Infrastructure
            </h3>
            {primaryHubs.map((hub) => (
              <button
                type="button"
                key={hub.id}
                onClick={() => onSelectLocationById(hub.id)}
                className="w-full p-3 text-left bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                    <span className="truncate text-sm font-semibold text-white group-hover:text-sky-300">
                      {hub.code ? `[${hub.code}] ` : ''}{hub.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-sky-400 font-mono">
                    {connectionCounts?.get(hub.id)?.total ?? 0} links
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Interaction Guide */}
        <div className="mt-auto bg-slate-900/40 border border-slate-800/60 rounded-xl p-3.5 text-xs text-slate-400 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Select any <strong className="text-slate-200">facility marker</strong> or{' '}
            <strong className="text-slate-200">route arc</strong> to explore its upstream/downstream network,
            direction of flow, and parent hierarchy.
          </p>
        </div>
      </div>
    );
  }

  // If a DISTRICT is selected
  if (selectedEntity.type === 'district') {
    const district = selectedEntity.data as DistrictProperties;
    const districtFacilities = locations.filter(
      (l) => l.district?.toLowerCase().trim() === district.district.toLowerCase().trim()
    );

    const facilityTypeCounts: Record<string, number> = {};
    for (const f of districtFacilities) {
      facilityTypeCounts[f.type] = (facilityTypeCounts[f.type] || 0) + 1;
    }

    return (
      <div className="h-full flex flex-col p-5 text-slate-300 overflow-y-auto font-sans">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono tracking-wider uppercase mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>District Exploration</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{district.district}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {district.zone} Zone
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-mono">
                Group {district.opsGroup}
              </span>
            </div>
          </div>
          <button
            onClick={onClearSelection}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Clear Selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Geographic Information */}
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Geographic Attributes
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Headquarters</span>
              <span className="font-semibold text-white">{district.hq}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Surface Area</span>
              <span className="font-semibold text-white">{district.area_sqkm?.toLocaleString() || 'N/A'} km²</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 col-span-2">
              <span className="text-slate-500 block text-[11px]">Centroid</span>
              <span className="font-mono text-emerald-400">
                {district.center ? `${district.center[1].toFixed(4)}° N, ${district.center[0].toFixed(4)}° E` : 'Verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Facilities Footprint */}
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Network Footprint ({districtFacilities.length} Facilities)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Total Facilities</span>
              <span className="text-lg font-mono font-bold text-white">{districtFacilities.length}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-500 block">Branches</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {facilityTypeCounts['branch'] || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Facilities in District */}
        {districtFacilities.length > 0 ? (
          <div className="space-y-2 mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Facilities Located in {district.district}
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {districtFacilities.map((f) => {
                const scLoc = f as SCLocation;
                const typeCfg = LOCATION_TYPE_COLORS[f.type] || LOCATION_TYPE_COLORS.branch;
                return (
                  <div
                    key={f.id}
                    onClick={() => onSelectLocationById(f.id)}
                    className="p-2 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: typeCfg.color }}
                      />
                      <span className="font-semibold text-slate-200">
                        {scLoc.code ? `[${scLoc.code}] ` : ''}{f.name}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[10px] uppercase font-mono">
                      {scLoc.cluster || typeCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg text-xs text-slate-400 italic">
            No physical branch facilities registered in this district for the active network.
          </div>
        )}

        <div className="mt-auto border border-dashed border-slate-800 rounded-xl p-3 bg-slate-900/30 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-sky-400/90 font-mono text-[11px] mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Data Source Reference</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Geographic boundaries are displayed with the locally selected facility data.
          </p>
        </div>
      </div>
    );
  }

  // If a LOCATION is selected
  if (selectedEntity.type === 'location') {
    const loc = selectedEntity.data as AnyLocation;
    const scLoc = loc as SCLocation;
    const typeConfig = LOCATION_TYPE_COLORS[loc.type] || LOCATION_TYPE_COLORS.branch;

    const locId = loc.id;
    const countInfo = connectionCounts?.get(locId);

    // Connected routes
    const connectedRoutes = routes.filter((r) => {
      const srcId = (r as SCConnection).sourceLocationId || (r as SupplyChainRoute).sourceId;
      const dstId = (r as SCConnection).destinationLocationId || (r as SupplyChainRoute).destinationId;
      return srcId === locId || dstId === locId;
    });

    const parentLoc = scLoc.parentLocationId
      ? locations.find((l) => l.id === scLoc.parentLocationId)
      : null;

    const isOutsideTN = Boolean(scLoc.metadata?.outsideTN);

    return (
      <div className="h-full flex flex-col p-5 text-slate-300 overflow-y-auto font-sans">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: typeConfig.color }}
              />
              <span style={{ color: typeConfig.color }}>{typeConfig.label}</span>
              {scLoc.status === 'active' ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  Inactive
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {scLoc.code ? `[${scLoc.code}] ` : ''}{loc.name}
            </h2>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400 mt-1">
              {loc.district && <span>District: <strong className="text-slate-300">{loc.district}</strong></span>}
              {scLoc.cluster && <span>• <strong className="text-sky-300">{scLoc.cluster}</strong></span>}
              {scLoc.businessUnit && <span>• BU: <strong className="text-slate-300">{scLoc.businessUnit}</strong></span>}
            </div>
          </div>
          <button
            onClick={onClearSelection}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Clear Selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Territory / Territory Outside TN notice */}
        {isOutsideTN && (
          <div className="mb-4 bg-amber-950/40 border border-amber-500/40 rounded-lg p-2.5 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Facility operates outside the Tamil Nadu state boundary.</span>
          </div>
        )}

        {/* Parent Facility Hierarchy */}
        {parentLoc && (
          <div
            onClick={() => onSelectLocationById(parentLoc.id)}
            className="mb-4 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs cursor-pointer hover:bg-slate-800/60 transition-colors flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                Parent Hub Facility
              </span>
              <span className="text-sm font-semibold text-white hover:text-emerald-300">
                {(parentLoc as SCLocation).code ? `[${(parentLoc as SCLocation).code}] ` : ''}{parentLoc.name}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </div>
        )}

        {/* Real Network Connection Metrics */}
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Network Connectivity
          </h3>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Inbound</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {countInfo?.inbound ?? 0}
              </span>
              <span className="text-[9px] text-slate-500 block">Links In</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Outbound</span>
              <span className="text-lg font-mono font-bold text-sky-400">
                {countInfo?.outbound ?? 0}
              </span>
              <span className="text-[9px] text-slate-500 block">Links Out</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Total</span>
              <span className="text-lg font-mono font-bold text-white">
                {countInfo?.total ?? connectedRoutes.length}
              </span>
              <span className="text-[9px] text-slate-500 block">Corridors</span>
            </div>
          </div>
        </div>

        {/* Geo-Coordinates */}
        <div className="mb-5 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-500 block text-[11px]">Centroid Coordinates</span>
          <span className="font-mono text-emerald-400">
            {loc.latitude.toFixed(4)}° N, {loc.longitude.toFixed(4)}° E
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Town-level centroid geocode (Phase 2 validated)
          </span>
        </div>

        {/* Connected Logistics Corridors */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Direct Connected Facilities</span>
            <span className="font-mono text-[11px] text-slate-500">{connectedRoutes.length} active</span>
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {connectedRoutes.map((r) => {
              const srcId = (r as SCConnection).sourceLocationId || (r as SupplyChainRoute).sourceId;
              const dstId = (r as SCConnection).destinationLocationId || (r as SupplyChainRoute).destinationId;
              const isOutbound = srcId === locId;
              const otherLocId = isOutbound ? dstId : srcId;
              const otherLoc = locations.find((l) => l.id === otherLocId);
              const otherCode = (otherLoc as SCLocation)?.code;
              const isBi = (r as SCConnection).direction === 'bidirectional';

              return (
                <div
                  key={r.id}
                  onClick={() => onSelectLocationById(otherLocId)}
                  className="p-2 bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/80 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isBi ? 'bg-sky-400' : isOutbound ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-slate-300">
                      {isBi ? 'Bi-directional with' : isOutbound ? 'Outbound to' : 'Inbound from'}{' '}
                      <strong className="text-white hover:text-emerald-300">
                        {otherCode ? `[${otherCode}] ` : ''}{otherLoc?.name || otherLocId}
                      </strong>
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {isBi ? 'Trunk' : 'Feeder'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational System Integration Status */}
        <div className="mt-auto border border-dashed border-slate-800 rounded-xl p-3 bg-slate-900/30 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] mb-1">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>Local Data Status</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Inventory Feed:</span>
              <span className="text-slate-400">{routes.length} network connections</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tracking sources:</span>
              <span className="text-slate-400">Per shipment record</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Order Throughput:</span>
              <span className="text-slate-400">{locations.length} facilities loaded</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a ROUTE / CONNECTION is selected
  if (selectedEntity.type === 'route') {
    const route = selectedEntity.data as AnyConnection;
    const scConn = route as SCConnection;

    const srcId = scConn.sourceLocationId || (route as SupplyChainRoute).sourceId;
    const dstId = scConn.destinationLocationId || (route as SupplyChainRoute).destinationId;

    const sourceLoc = locations.find((l) => l.id === srcId);
    const destLoc = locations.find((l) => l.id === dstId);

    const isBidirectional = scConn.direction === 'bidirectional';
    const status = scConn.status || (route as SupplyChainRoute).status || 'active';
    const statusConfig = ROUTE_STATUS_COLORS[status] || ROUTE_STATUS_COLORS.active;
    const connType = scConn.connectionType;
    const connTypeConfig = connType && CONNECTION_TYPE_COLORS[connType]
      ? CONNECTION_TYPE_COLORS[connType]
      : { label: 'Logistics Corridor', color: '#2EE6A6' };

    return (
      <div className="h-full flex flex-col p-5 text-slate-300 overflow-y-auto font-sans">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: statusConfig.color }}
              />
              <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                {isBidirectional ? 'Bidirectional' : 'One-Way Flow'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {scConn.routeName || `${sourceLoc?.name || srcId} → ${destLoc?.name || dstId}`}
            </h2>
            <span className="text-xs text-slate-400 block mt-0.5 font-mono">
              ID: {route.id}
            </span>
          </div>
          <button
            onClick={onClearSelection}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Clear Selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nodes Connected */}
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 mb-5 space-y-3">
          <div
            onClick={() => onSelectLocationById(srcId)}
            className="cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
          >
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Origin Dispatch Node
            </span>
            <span className="text-sm font-bold text-white hover:text-emerald-400">
              {(sourceLoc as SCLocation)?.code ? `[${(sourceLoc as SCLocation).code}] ` : ''}{sourceLoc?.name || srcId}
            </span>
            <span className="text-[11px] text-slate-400 block">{sourceLoc?.district}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 px-2">
            <div className="h-px bg-slate-800 flex-1" />
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          <div
            onClick={() => onSelectLocationById(dstId)}
            className="cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
          >
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Destination Fulfillment Node
            </span>
            <span className="text-sm font-bold text-white hover:text-emerald-400">
              {(destLoc as SCLocation)?.code ? `[${(destLoc as SCLocation).code}] ` : ''}{destLoc?.name || dstId}
            </span>
            <span className="text-[11px] text-slate-400 block">{destLoc?.district}</span>
          </div>
        </div>

        {/* Corridor Details */}
        <div className="space-y-3 mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Corridor Specification
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Relationship Type</span>
              <span className="font-semibold text-white">{connTypeConfig.label}</span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Transport Mode</span>
              <span className="font-semibold text-emerald-400 uppercase font-mono">
                {scConn.transportMode || 'Road'}
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 col-span-2">
              <span className="text-slate-500 block text-[11px]">Operational Status</span>
              <span className="font-semibold text-white capitalize">{status}</span>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="mt-auto border border-dashed border-slate-800 rounded-xl p-3 bg-slate-900/30 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] mb-1">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>Transit Corridor</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            Physical road geometry schematic corridor between registered distribution nodes.
          </p>
        </div>
      </div>
    );
  }

  // If a SHIPMENT is selected
  if (selectedEntity.type === 'shipment') {
    const s = selectedEntity.data;
    const statusCfg = SHIPMENT_STATUS_COLORS[s.shipment_status] || SHIPMENT_STATUS_COLORS.in_transit;

    return (
      <div className="h-full flex flex-col p-5 text-slate-300 overflow-y-auto font-sans">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: statusCfg.color }}
              />
              <span style={{ color: statusCfg.color, fontWeight: 700 }}>
                {statusCfg.label}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                {s.priority.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{s.tracking_number}</h2>
            <span className="text-xs text-slate-400 block mt-0.5 font-mono">
              Ref: {s.shipment_reference} {s.order_reference ? `• Invoice: ${s.order_reference}` : ''}
            </span>
          </div>
          <button
            onClick={onClearSelection}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Clear Selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Origin & Destination Nodes */}
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 mb-4 space-y-3">
          <div
            onClick={() => onSelectLocationById(s.source_facility_id)}
            className="cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
          >
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Dispatch Origin Facility
            </span>
            <span className="text-sm font-bold text-white hover:text-emerald-400">
              {s.source_facility_name}
            </span>
            <span className="text-[11px] text-slate-400 block">{s.business_unit} BU • {s.cluster}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 px-2">
            <div className="h-px bg-slate-800 flex-1" />
            <ArrowRight className="w-4 h-4 text-sky-400" />
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          <div className="p-2 rounded-lg">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Delivery Destination
            </span>
            <span className="text-sm font-bold text-white">
              {s.destination_name}
            </span>
            <span className="text-[11px] text-slate-400 block">
              Channel: {s.destination_channel || 'Retail Partner'}
            </span>
          </div>
        </div>

        {/* Exception Alert Banner (if applicable) */}
        {s.exception && (
          <div className="mb-4 bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Operational Exception Detected</span>
            </div>
            <div className="text-white font-medium mb-1">{s.exception.description}</div>
            <div className="text-[11px] text-rose-200/80 mb-2">
              Reason Group: <strong>{s.exception.reason_group || s.exception.reason}</strong>
            </div>
            <div className="bg-rose-900/40 p-2 rounded border border-rose-800/50 text-[10px] text-rose-100">
              <strong>Next Action:</strong> {s.exception.suggested_action}
            </div>
          </div>
        )}

        {/* Section C: Shipment Payload Contents */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Shipment Contents</span>
            <span className="text-emerald-400 font-mono text-xs">
              ₹{s.total_value_rs.toLocaleString()}
            </span>
          </h3>
          <div className="space-y-1.5">
            {s.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-lg text-xs"
              >
                <div className="flex justify-between font-semibold text-white">
                  <span>{item.product_name}</span>
                  <span className="text-sky-300 font-mono">
                    {item.dispatched_qty} {item.unit_of_measure}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>SKU: {item.sku} • {item.brand}</span>
                  <span>Value: ₹{item.value_rs.toLocaleString()}</span>
                </div>
                {item.received_qty !== undefined && item.received_qty !== null && (
                  <div className="mt-1 pt-1 border-t border-slate-800/50 flex justify-between text-[10px]">
                    <span className="text-slate-500">Confirmed Received:</span>
                    <span className={item.received_qty < item.dispatched_qty ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                      {item.received_qty} / {item.dispatched_qty}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section B: Chronological Event Timeline */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Event History Timeline
          </h3>
          <div className="space-y-2 pl-2 border-l border-slate-800 text-xs">
            {s.events.map((evt) => (
              <div key={evt.event_id} className="relative pl-3">
                <span className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                <div className="font-semibold text-white">{evt.event_type}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {evt.timestamp.replace('T', ' ').slice(0, 19)} • {evt.facility_name}
                </div>
                {evt.notes && <div className="text-[10px] text-slate-500 mt-0.5">{evt.notes}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Section D: Tracking Metadata */}
        <div className="mt-auto border border-dashed border-slate-800 rounded-xl p-3 bg-slate-900/30 text-xs text-slate-400 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Tracking Method:</span>
            <span className="text-sky-300 font-semibold uppercase">Event-Based Tracking</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Vehicle / Fleet:</span>
            <span className="text-slate-300 font-mono">{s.vehicle_id || 'Carrier Fleet'}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Executive (DSE):</span>
            <span className="text-slate-300">{s.driver_reference || 'Assigned Logistics'}</span>
          </div>
          <div className="text-[9px] text-slate-600 mt-1 italic">
            * Data shown from the locally selected operational records.
          </div>
        </div>
      </div>
    );
  }

  // If an INVENTORY MOVEMENT is selected
  if (selectedEntity.type === 'movement') {
    const m = selectedEntity.data;

    return (
      <div className="h-full flex flex-col p-5 text-slate-300 overflow-y-auto font-sans">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span className="text-sky-400 font-bold">Inter-Facility Stock Transfer</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{m.movement_reference}</h2>
            <span className="text-xs text-slate-400 block mt-0.5 font-mono">
              ID: {m.movement_id}
            </span>
          </div>
          <button
            onClick={onClearSelection}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Clear Selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transfer Nodes */}
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 mb-4 space-y-3">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Source Warehouse
            </span>
            <span className="text-sm font-bold text-white">{m.source_facility_id}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 px-2">
            <div className="h-px bg-slate-800 flex-1" />
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <div className="h-px bg-slate-800 flex-1" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Destination Branch
            </span>
            <span className="text-sm font-bold text-white">
              {m.destination_facility_name || m.destination_facility_id}
            </span>
          </div>
        </div>

        {/* Material Details */}
        <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg text-xs space-y-2 mb-4">
          <div className="font-semibold text-white text-sm">{m.product_name}</div>
          <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
            <div>SKU: <strong className="text-slate-200">{m.product_id}</strong></div>
            <div>Brand: <strong className="text-slate-200">{m.brand}</strong></div>
            <div>Quantity: <strong className="text-emerald-400 font-mono">{m.quantity} {m.unit_of_measure}</strong></div>
            <div>Value: <strong className="text-sky-300 font-mono">₹{m.value?.toLocaleString() || 'N/A'}</strong></div>
          </div>
        </div>

        {/* Transfer Status */}
        <div className="mt-auto border border-dashed border-slate-800 rounded-xl p-3 bg-slate-900/30 text-xs text-slate-400">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-500">Transfer Status:</span>
            <span className="text-sky-400 font-semibold uppercase">{m.status}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Document Type:</span>
            <span className="text-slate-300">STN In-Transit Note</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
