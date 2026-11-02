import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  DistrictCollection,
  LayerVisibility,
} from '../../types/map';
import type {
  SCLocation,
  SCConnection,
} from '../../types/supplyChain';
import type { Shipment, ShipmentStatus } from '../../types/shipment';
import { loadNetworkData } from '../../services/supplyChainDataService';
import { loadTrackingData, setLoadedTrackingData } from '../../services/shipmentDataService';
import { setLoadedNetworkData } from '../../services/supplyChainDataService';
import { parseLocalOperationsData, LOCAL_OPERATIONS_DATA_FILES } from '../../services/localOperationsDataService';
import {
  computeConnectionCounts,
  getConnectedEntities,
} from '../../utils/networkAnalysis';
import { MapScene } from './MapScene';
import { useMapSelection } from '../../hooks/useMapSelection';

const INITIAL_LAYER_VISIBILITY: LayerVisibility = {
  districtBoundaries: true,
  districtLabels: false,
  headquarters: true,
  warehouses: true,
  centralWarehouses: true,
  regionalWarehouses: true,
  distributionCenters: true,
  branches: true,
  retailers: true,
  suppliers: true,
  factories: true,
  customers: true,
  routes: true,
  routeParticles: true,
  extruded3D: true,
  shipments: true,
  movements: true,
};

export const SupplyChainMap: React.FC = () => {
  const [networkDataset, setNetworkDataset] = useState(() => loadNetworkData());
  const allLocations: SCLocation[] = networkDataset.locations;
  const allConnections: SCConnection[] = networkDataset.connections;

  const [trackingDataset, setTrackingDataset] = useState(() => loadTrackingData());
  const allShipments: Shipment[] = trackingDataset.shipments;
  const deliveryStats = trackingDataset.deliveryStats;
  const localDataInputRef = useRef<HTMLInputElement>(null);
  const [isImportingLocalData, setIsImportingLocalData] = useState(false);
  const [hasLoadedLocalData, setHasLoadedLocalData] = useState(false);
  const [localDataError, setLocalDataError] = useState<string | null>(null);
  const [referenceNow, setReferenceNow] = useState(() => Date.now());

  const handleLocalDataSelection = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setIsImportingLocalData(true);
    setLocalDataError(null);
    try {
      const documents: Record<string, unknown> = {};
      await Promise.all(files.map(async (file) => {
        if (!(LOCAL_OPERATIONS_DATA_FILES as readonly string[]).includes(file.name)) {
          return;
        }
        documents[file.name] = JSON.parse(await file.text());
      }));

      const data = parseLocalOperationsData(documents);
      setNetworkDataset(setLoadedNetworkData(data.locations, data.connections));
      setTrackingDataset(setLoadedTrackingData(data.shipments, data.movements));
      setReferenceNow(Date.now());
      setHasLoadedLocalData(true);
    } catch (error) {
      setLocalDataError(
        error instanceof Error ? error.message : 'Unable to load the selected local data files.'
      );
    } finally {
      setIsImportingLocalData(false);
    }
  }, []);

  // Geographic boundary state
  const [districtData, setDistrictData] = useState<DistrictCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Layer Visibility
  const [layers] = useState<LayerVisibility>(INITIAL_LAYER_VISIBILITY);

  // Filters: Cluster, Business Unit
  const [selectedCluster] = useState<string>('ALL');
  const [selectedBusinessUnit] = useState<string>('ALL');
  const [shipmentStatusFilter] = useState<ShipmentStatus | 'all' | 'exceptions' | 'overdue'>('all');

  // Camera reset trigger
  const [resetViewCounter] = useState(0);

  // Manual D-Pad Pan & Zoom actions
  const [panAction, setPanAction] = useState<{ dx: number; dz: number; trigger: number }>({
    dx: 0,
    dz: 0,
    trigger: 0,
  });
  const [zoomAction, setZoomAction] = useState<{ factor: number; trigger: number }>({
    factor: 1,
    trigger: 0,
  });

  const handlePanDirection = useCallback((dx: number, dz: number) => {
    setPanAction((prev) => ({ dx, dz, trigger: prev.trigger + 1 }));
  }, []);

  const handleZoom = useCallback((factor: number) => {
    setZoomAction((prev) => ({ factor, trigger: prev.trigger + 1 }));
  }, []);

  // Keyboard navigation listener (Arrow keys / WASD to pan, +/- to zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handlePanDirection(0, -2.5);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handlePanDirection(0, 2.5);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handlePanDirection(-2.5, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handlePanDirection(2.5, 0);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoom(0.8);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoom(1.25);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePanDirection, handleZoom]);

  // Selection & Hover State
  const {
    selectedEntity,
    hoveredEntity,
    selectDistrict,
    selectLocation,
    selectRoute,
    clearSelection,
    setHovered,
  } = useMapSelection();

  useEffect(() => {
    clearSelection();
  }, [networkDataset, trackingDataset, clearSelection]);

  // Load GeoJSON boundary data
  useEffect(() => {
    let isMounted = true;
    const fetchGeoJSON = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch('/data/tamil-nadu/districts.geojson');
        if (!response.ok) {
          throw new Error(
            `Failed to load Tamil Nadu district boundaries (HTTP ${response.status})`
          );
        }
        const data: DistrictCollection = await response.json();
        if (!data.features || data.features.length === 0) {
          throw new Error('GeoJSON file loaded but contains 0 district features.');
        }
        if (isMounted) {
          setDistrictData(data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setLoadError(err.message || 'Error initializing geographic data');
          setIsLoading(false);
        }
      }
    };

    fetchGeoJSON();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute live connection counts for each facility
  const connectionCounts = useMemo(() => {
    return computeConnectionCounts(allLocations, allConnections);
  }, [allLocations, allConnections]);

  const selectedBranchLocation = useMemo(() => {
    if (selectedEntity?.type !== 'location') return null;
    return selectedEntity.data.type === 'branch' ? selectedEntity.data : null;
  }, [selectedEntity]);

  const sourceWarehouseForSelectedBranch = useMemo(() => {
    if (!selectedBranchLocation) return null;
    const branch = selectedBranchLocation as SCLocation;
    return (
      allLocations.find((loc) => loc.id === branch.parentLocationId) ||
      allLocations.find((loc) => loc.id !== branch.id && loc.type === 'central_warehouse' && loc.businessUnit === branch.businessUnit)
    );
  }, [selectedBranchLocation, allLocations]);

  // Filter locations by Cluster and Business Unit, but isolate a selected branch to its source warehouse + route only
  const filteredLocations = useMemo(() => {
    if (selectedBranchLocation && sourceWarehouseForSelectedBranch) {
      const focusIds = new Set<string>([
        selectedBranchLocation.id,
        sourceWarehouseForSelectedBranch.id,
      ]);
      return allLocations.filter((loc) => focusIds.has(loc.id));
    }

    return allLocations.filter((loc) => {
      if (loc.type === 'central_warehouse') return true;
      if (selectedCluster !== 'ALL' && loc.cluster !== selectedCluster) {
        return false;
      }
      if (selectedBusinessUnit !== 'ALL' && loc.businessUnit !== selectedBusinessUnit) {
        return false;
      }
      return true;
    });
  }, [allLocations, selectedBranchLocation, sourceWarehouseForSelectedBranch, selectedCluster, selectedBusinessUnit]);

  // Filter routes: endpoints must be among visible locations
  const visibleLocationIdSet = useMemo(() => {
    return new Set(filteredLocations.map((l) => l.id));
  }, [filteredLocations]);

  const filteredConnections = useMemo(() => {
    if (selectedBranchLocation && sourceWarehouseForSelectedBranch) {
      return allConnections.filter((conn) => {
        const sourceId = conn.sourceLocationId;
        const destinationId = conn.destinationLocationId;
        return (
          (sourceId === sourceWarehouseForSelectedBranch.id && destinationId === selectedBranchLocation.id) ||
          (destinationId === sourceWarehouseForSelectedBranch.id && sourceId === selectedBranchLocation.id)
        );
      });
    }

    return allConnections.filter((conn) => {
      return (
        visibleLocationIdSet.has(conn.sourceLocationId) &&
        visibleLocationIdSet.has(conn.destinationLocationId)
      );
    });
  }, [allConnections, selectedBranchLocation, sourceWarehouseForSelectedBranch, visibleLocationIdSet]);

  // Filter shipments based on cluster and status filter
  const filteredShipments = useMemo(() => {
    let result = allShipments;
    if (selectedCluster !== 'ALL') {
      result = result.filter((s) => s.cluster === selectedCluster);
    }
    if (selectedBusinessUnit !== 'ALL') {
      result = result.filter((s) => s.business_unit === selectedBusinessUnit);
    }
    if (shipmentStatusFilter !== 'all') {
      if (shipmentStatusFilter === 'exceptions') {
        result = result.filter((s) => s.exception !== null && s.exception !== undefined);
      } else if (shipmentStatusFilter === 'overdue') {
        const now = referenceNow;
        result = result.filter((s) => {
          if (s.shipment_status === 'delivered' || s.shipment_status === 'cancelled') return false;
          const exp = new Date(s.expected_delivery_datetime).getTime();
          return !isNaN(exp) && exp < now;
        });
      } else {
        result = result.filter((s) => s.shipment_status === shipmentStatusFilter);
      }
    }
    return result;
  }, [allShipments, selectedCluster, selectedBusinessUnit, shipmentStatusFilter, referenceNow]);

  const mapFocusDistrict = selectedEntity?.type === 'district'
    ? selectedEntity.data.district
    : selectedBranchLocation?.district || 'Tamil Nadu';
  const districtFacilities = useMemo(() => {
    if (mapFocusDistrict === 'Tamil Nadu') return allLocations;
    return allLocations.filter(
      (location) => location.district?.toLowerCase() === mapFocusDistrict.toLowerCase()
    );
  }, [allLocations, mapFocusDistrict]);
  const districtFacilityIds = useMemo(
    () => new Set(districtFacilities.map((location) => location.id)),
    [districtFacilities]
  );
  const districtIncomingShipments = useMemo(
    () => allShipments.filter((shipment) => districtFacilityIds.has(shipment.destination_facility_id)),
    [allShipments, districtFacilityIds]
  );
  const districtOutgoingShipments = useMemo(
    () => allShipments.filter((shipment) => districtFacilityIds.has(shipment.source_facility_id)),
    [allShipments, districtFacilityIds]
  );
  const districtOpenShipments = districtIncomingShipments.filter(
    (shipment) => shipment.shipment_status !== 'delivered' && shipment.shipment_status !== 'cancelled'
  );

  // Highlight connected entities when a location is selected
  const selectedLocationId =
    selectedEntity?.type === 'location' ? selectedEntity.data.id : null;

  const { connectedLocationIds, connectedConnectionIds } = useMemo(() => {
    return getConnectedEntities(selectedLocationId, allConnections);
  }, [selectedLocationId, allConnections]);

  const headerStats = [
    { label: 'Facilities', value: String(filteredLocations.length), icon: '🏭', tone: 'cyan' },
    { label: 'Active Routes', value: String(filteredConnections.length), icon: '🛣️', tone: 'blue' },
    { label: 'Transactions', value: String(filteredShipments.length), icon: '📦', tone: 'violet' },
    { label: 'In Transit', value: String(deliveryStats.inTransit), icon: '🚚', tone: 'amber' },
    { label: 'Delivered', value: String(deliveryStats.delivered), icon: '✅', tone: 'green' },
    { label: 'Exceptions', value: String(deliveryStats.deliveryAttemptFailed), icon: '⚠️', tone: 'red' },
  ];

  const focusCards = [
    {
      number: '1',
      title: 'District Focus',
      subtitle: 'Select a district to zoom in and see only its facilities and transactions.',
      bullets: [
        'Auto zoom to district',
        'Highlight district boundary',
        'Hide unrelated routes',
        'Surface district logistics activity',
      ],
    },
    {
      number: '2',
      title: 'Branch Focus',
      subtitle: 'Select a branch to inspect connected facilities, routes and real movement activity.',
      bullets: [
        'Zoom to branch',
        'Show connected facilities',
        'Highlight relevant routes',
        'Hide unrelated network clutter',
      ],
    },
    {
      number: '3',
      title: 'Route Focus',
      subtitle: 'Select a route for end-to-end shipment flow, route stats and live movement visibility.',
      bullets: [
        'Auto frame selected route',
        'Highlight origin and destination',
        'Show transactions on route',
        'Display movement and delay status',
      ],
    },
  ];

  type PanelKey =
    | 'stats'
    | 'focusCards'
    | 'districtSummary'
    | 'transactions'
    | 'interactionFlow'
    | 'mapLegend'
    | 'keyFeatures'
    | 'selection';

  const [collapsedPanels, setCollapsedPanels] = useState<Record<PanelKey, boolean>>({
    stats: false,
    focusCards: false,
    districtSummary: false,
    transactions: false,
    interactionFlow: false,
    mapLegend: false,
    keyFeatures: false,
    selection: false,
  });

  const togglePanel = useCallback((key: PanelKey) => {
    setCollapsedPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="w-full h-screen bg-[#07111F] text-slate-100 flex flex-col font-sans overflow-hidden select-none">
      <header className="h-[72px] bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-sky-500/10 text-lg shadow-[0_0_18px_rgba(34,211,238,0.25)]">
            <span className="text-cyan-300">▣</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Tamil Nadu Supply Chain Control Tower</h1>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-[0.18em]">
              <span>Interactive Map</span>
              <span className="text-slate-600">|</span>
              <span>District • Branch • Route • Transaction Focus</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={localDataInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            onChange={handleLocalDataSelection}
            className="hidden"
            aria-label="Select local operational data files"
          />
          <button
            type="button"
            onClick={() => localDataInputRef.current?.click()}
            disabled={isImportingLocalData}
            className="rounded-md border border-cyan-500/40 bg-cyan-950/50 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-cyan-200 transition hover:border-cyan-300 disabled:cursor-wait disabled:opacity-60"
          >
            {isImportingLocalData ? 'Loading Data…' : 'Load Local Data'}
          </button>
          <button
            type="button"
            onClick={() => togglePanel('stats')}
            className="mr-2 rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-300"
          >
            {collapsedPanels.stats ? 'Expand Stats' : 'Collapse Stats'}
          </button>
          {!collapsedPanels.stats && headerStats.map((stat) => (
            <div
              key={stat.label}
              className="min-w-[120px] h-[54px] rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.35)]"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                <span>{stat.label}</span>
                <span className="text-base">{stat.icon}</span>
              </div>
              <div className="mt-1 text-xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 min-h-0 p-3">
        <div className="grid h-full grid-cols-[310px_minmax(0,1fr)_300px] gap-3">
          <aside className="space-y-3">
            <div className="rounded-2xl border border-sky-500/20 bg-[#0c1b2d]/90 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.45)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Focus Cards</div>
                <button
                  type="button"
                  onClick={() => togglePanel('focusCards')}
                  className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  {collapsedPanels.focusCards ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedPanels.focusCards && (
                <div className="space-y-3">
                  {focusCards.map((card) => (
                    <div
                      key={card.number}
                      className="rounded-xl border border-sky-500/20 bg-slate-950/40 p-3"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sm font-bold text-cyan-300 border border-cyan-400/30">
                          {card.number}
                        </div>
                        <div className="text-xl font-bold text-white">{card.title}</div>
                      </div>
                      <p className="text-sm leading-6 text-slate-300">{card.subtitle}</p>
                      <ul className="mt-3 space-y-2 text-sm text-slate-200">
                        {card.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-slate-950/60 shadow-[0_20px_50px_rgba(15,23,42,0.6)]">
            <div className="absolute inset-0 z-0">
              {districtData && !isLoading && !loadError && (
                <MapScene
                  districts={districtData.features}
                  locations={filteredLocations}
                  routes={filteredConnections}
                  selectedEntity={selectedEntity}
                  hoveredEntity={hoveredEntity}
                  layerVisibility={layers}
                  interactionMode="pan"
                  panAction={panAction}
                  zoomAction={zoomAction}
                  connectionCounts={connectionCounts}
                  connectedLocationIds={connectedLocationIds}
                  connectedConnectionIds={connectedConnectionIds}
                  onSelectDistrict={(d) => {
                    selectDistrict(d);
                  }}
                  onSelectLocation={(l) => {
                    selectLocation(l);
                  }}
                  onSelectRoute={(r) => {
                    selectRoute(r);
                  }}
                  onHoverDistrict={(d) => setHovered(d ? { type: 'district', data: d } : null)}
                  onHoverLocation={(l) => setHovered(l ? { type: 'location', data: l } : null)}
                  resetViewTrigger={resetViewCounter}
                />
              )}
            </div>

            {(localDataError || !hasLoadedLocalData) && (
              <div
                role={localDataError ? 'alert' : 'status'}
                className={`absolute left-1/2 top-14 z-20 w-[min(90%,560px)] -translate-x-1/2 rounded-xl border p-3 text-center text-xs shadow-lg backdrop-blur-md ${
                  localDataError
                    ? 'border-rose-400/40 bg-rose-950/90 text-rose-100'
                    : 'border-cyan-400/30 bg-slate-950/90 text-slate-200'
                }`}
              >
                {localDataError || (
                  <>
                    <div className="font-semibold text-cyan-200">No operational data loaded</div>
                    <div className="mt-1 text-slate-300">
                      Select {LOCAL_OPERATIONS_DATA_FILES.join(', ')} using “Load Local Data”.
                      Files are read in this browser session and are not uploaded.
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/25 px-3 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <span className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-sky-300">
                  Tamil Nadu
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{mapFocusDistrict}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 text-lg text-slate-200">+</button>
                <button className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 text-lg text-slate-200">?</button>
              </div>
            </div>

            {selectedBranchLocation && sourceWarehouseForSelectedBranch ? (
              <div className="absolute left-4 top-12 z-10 w-[280px] rounded-xl border border-cyan-400/30 bg-slate-950/80 p-3 backdrop-blur-sm shadow-[0_12px_30px_rgba(15,23,42,0.5)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Warehouse → Branch Journey</div>
                  <button
                    type="button"
                    onClick={() => togglePanel('districtSummary')}
                    className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-300"
                  >
                    {collapsedPanels.districtSummary ? 'Expand' : 'Collapse'}
                  </button>
                </div>
                <div className="mt-2 text-xl font-bold text-white">{selectedBranchLocation.name}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">{selectedBranchLocation.code}</div>
                <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-xs text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Source warehouse</span>
                    <span className="font-semibold text-cyan-300">{sourceWarehouseForSelectedBranch.name}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-slate-400">Route</span>
                    <span className="font-semibold text-amber-300">Active</span>
                  </div>
                </div>
              </div>
            ) : collapsedPanels.districtSummary ? (
              <div className="absolute left-4 top-12 z-10">
                <button
                  type="button"
                  onClick={() => togglePanel('districtSummary')}
                  className="rounded-xl border border-sky-500/25 bg-slate-950/75 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-sm hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  District • Expand
                </button>
              </div>
            ) : (
              <div className="absolute left-4 top-12 z-10 flex max-w-[260px] flex-col rounded-xl border border-sky-500/25 bg-slate-950/75 p-3 backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  <span>District</span>
                  <button
                    type="button"
                    onClick={() => togglePanel('districtSummary')}
                    className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-[9px] tracking-[0.16em] text-slate-300 hover:border-cyan-400/60 hover:text-cyan-300"
                  >
                    Collapse
                  </button>
                </div>
                <div className="mt-1 text-2xl font-bold text-white">{mapFocusDistrict}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                    <div className="text-slate-400">Facilities</div>
                    <div className="mt-1 text-lg font-bold text-cyan-300">{districtFacilities.length}</div>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                    <div className="text-slate-400">Incoming</div>
                    <div className="mt-1 text-lg font-bold text-emerald-300">{districtIncomingShipments.length}</div>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                    <div className="text-slate-400">Outgoing</div>
                    <div className="mt-1 text-lg font-bold text-violet-300">{districtOutgoingShipments.length}</div>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                    <div className="text-slate-400">Open</div>
                    <div className="mt-1 text-lg font-bold text-amber-300">{districtOpenShipments.length}</div>
                  </div>
                </div>
              </div>
            )}

            {collapsedPanels.transactions ? (
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <button
                  type="button"
                  onClick={() => togglePanel('transactions')}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 text-left text-[10px] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-sm hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  Transactions • Expand
                </button>
              </div>
            ) : (
              <div className="absolute bottom-4 left-4 right-4 z-10 rounded-xl border border-slate-700/80 bg-slate-950/75 px-3 py-2 backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Transactions</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => togglePanel('transactions')}
                      className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-300 hover:border-cyan-400/60 hover:text-cyan-300"
                    >
                      Collapse
                    </button>
                  </div>
                </div>
                {filteredShipments.length > 0 ? (
                  <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr] gap-2 text-[11px] text-slate-300">
                    <div className="font-semibold text-slate-200">Shipment</div>
                    <div className="font-semibold text-slate-200">Type</div>
                    <div className="font-semibold text-slate-200">Qty</div>
                    <div className="font-semibold text-slate-200">Status</div>
                    <div className="col-span-4 h-px bg-slate-700" />
                    {filteredShipments.slice(0, 3).map((shipment) => (
                      <React.Fragment key={shipment.shipment_id}>
                        <div className="truncate">{shipment.shipment_id}</div>
                        <div className="truncate">{shipment.shipment_type.replaceAll('_', ' ')}</div>
                        <div>{shipment.total_quantity}</div>
                        <div className="truncate text-cyan-300">{shipment.shipment_status.replaceAll('_', ' ')}</div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">No shipment records in the loaded dataset.</div>
                )}
              </div>
            )}

            {collapsedPanels.interactionFlow ? (
              <div className="absolute right-4 top-12 z-10">
                <button
                  type="button"
                  onClick={() => togglePanel('interactionFlow')}
                  className="rounded-2xl border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  Interaction Flow • Expand
                </button>
              </div>
            ) : (
              <div className="absolute right-4 top-12 z-10 flex flex-col gap-3">
                <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-3 text-left shadow-[0_10px_25px_rgba(2,6,23,0.45)]">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Interaction Flow</div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-cyan-400" />
                      <button
                        type="button"
                        onClick={() => togglePanel('interactionFlow')}
                        className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-300 hover:border-cyan-400/60 hover:text-cyan-300"
                      >
                        Collapse
                      </button>
                    </div>
                  </div>
                  <ol className="space-y-2 text-sm text-slate-200">
                    <li className="flex items-start gap-2"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300">1</span><span>Select District</span></li>
                    <li className="flex items-start gap-2"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300">2</span><span>Zoom to district</span></li>
                    <li className="flex items-start gap-2"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300">3</span><span>Select Branch</span></li>
                    <li className="flex items-start gap-2"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300">4</span><span>Select Route</span></li>
                    <li className="flex items-start gap-2"><span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300">5</span><span>Select transaction</span></li>
                  </ol>
                </div>
              </div>
            )}

            {collapsedPanels.mapLegend ? (
              <div className="absolute right-4 bottom-4 z-10">
                <button
                  type="button"
                  onClick={() => togglePanel('mapLegend')}
                  className="rounded-2xl border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  Map Legend • Expand
                </button>
              </div>
            ) : (
              <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/80 p-3 shadow-[0_10px_25px_rgba(2,6,23,0.45)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Map Legend</div>
                  <button
                    type="button"
                    onClick={() => togglePanel('mapLegend')}
                    className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-300 hover:border-cyan-400/60 hover:text-cyan-300"
                  >
                    Collapse
                  </button>
                </div>
                <div className="space-y-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-cyan-400" /> Branch</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-violet-400" /> Warehouse</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" /> In transit</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" /> Delayed route</div>
                </div>
              </div>
            )}

          </section>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a2d]/90 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Key Features</div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-300">?</span>
                  <button
                    type="button"
                    onClick={() => togglePanel('keyFeatures')}
                    className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-300 hover:border-cyan-400/60 hover:text-cyan-300"
                  >
                    {collapsedPanels.keyFeatures ? 'Expand' : 'Collapse'}
                  </button>
                </div>
              </div>
              {!collapsedPanels.keyFeatures && (
                <ul className="space-y-2 text-sm text-slate-200">
                  <li>• Cinematic zoom and smooth transitions</li>
                  <li>• Isolated district/branch/route view</li>
                  <li>• Real-time shipment visibility</li>
                  <li>• Full-screen presentation mode</li>
                  <li>• Branch and route drill-down</li>
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a2d]/90 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Map Legend</div>
                <button
                  type="button"
                  onClick={() => togglePanel('mapLegend')}
                  className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-300 hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  {collapsedPanels.mapLegend ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedPanels.mapLegend && (
                <div className="space-y-2 text-sm text-slate-200">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-cyan-400" /> Branch</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-violet-400" /> Warehouse</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" /> Route active</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" /> Delayed route</div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700/70 bg-[#0d1a2d]/90 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Current Selection</div>
                <button
                  type="button"
                  onClick={() => togglePanel('selection')}
                  className="rounded border border-slate-700 bg-slate-900/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-300 hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  {collapsedPanels.selection ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {!collapsedPanels.selection && (
                selectedEntity ? (
                  <div className="space-y-2 text-sm text-slate-200">
                    <div className="font-bold text-white">
                      {selectedEntity.type === 'district'
                        ? selectedEntity.data.district
                        : selectedEntity.type === 'location'
                          ? selectedEntity.data.name
                          : selectedEntity.type === 'route'
                            ? selectedEntity.data.id
                            : selectedEntity.type === 'shipment'
                              ? selectedEntity.data.tracking_number
                              : selectedEntity.data.movement_reference}
                    </div>
                    <div className="text-slate-400">
                      {selectedEntity.type === 'location' && selectedEntity.data.type === 'branch' && sourceWarehouseForSelectedBranch
                        ? `${sourceWarehouseForSelectedBranch.name} → ${selectedEntity.data.name}`
                        : selectedEntity.type === 'shipment'
                          ? `${selectedEntity.data.source_facility_name} → ${selectedEntity.data.destination_name}`
                          : selectedEntity.type === 'route'
                            ? 'Route detail ready'
                            : 'Focus state active'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No active selection. Click a district, branch, or route to focus the network.</div>
                )
              )}
            </div>
          </aside>
        </div>
      </main>

      <footer className="h-8 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center justify-between text-[11px] text-slate-400 shrink-0 z-30 font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Facilities: {filteredLocations.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Verified Shipments: {allShipments.length}</span>
          </div>
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>SLA On-Time: {deliveryStats.onTimeDeliveryRatePct}%</span>
          </div>
        </div>
        <div className="text-slate-500 hidden md:inline">Data: browser-local selected files • source tracking method per record</div>
      </footer>

    </div>
  );
};
