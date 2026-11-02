import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type {
  SupplyChainLocation,
  SelectedEntity,
  LayerVisibility,
} from '../../types/map';
import type { SCLocation, FacilityConnectionCounts } from '../../types/supplyChain';
import { projectGeoToVector3 } from '../../utils/geographicProjection';
import { LOCATION_TYPE_COLORS } from '../../theme/colors';

type AnyLocation = SupplyChainLocation | SCLocation;

interface LocationMarkersProps {
  locations: AnyLocation[];
  selectedEntity: SelectedEntity;
  hoveredEntity: SelectedEntity;
  layerVisibility: LayerVisibility;
  is3DExtruded: boolean;
  connectionCounts?: Map<string, FacilityConnectionCounts>;
  connectedLocationIds?: Set<string>;
  onSelectLocation: (location: AnyLocation) => void;
  onHoverLocation: (location: AnyLocation | null) => void;
}

interface SingleMarkerProps {
  location: AnyLocation;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  baseElevation: number;
  connectionCount?: FacilityConnectionCounts;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

// Marker Geometries
const SingleMarker: React.FC<SingleMarkerProps> = React.memo(
  ({
    location,
    isSelected,
    isHovered,
    isDimmed,
    baseElevation,
    connectionCount,
    onSelect,
    onHover,
  }) => {
    const groupRef = useRef<THREE.Group>(null);
    const pulseRingRef = useRef<THREE.Mesh>(null);

    const pos = useMemo(() => {
      return projectGeoToVector3(
        location.longitude,
        location.latitude,
        baseElevation
      );
    }, [location.longitude, location.latitude, baseElevation]);

    const type = location.type as string;
    const typeConfig = LOCATION_TYPE_COLORS[type] || LOCATION_TYPE_COLORS.branch;
    const markerColor = typeConfig.color;

    // Pulse animation for selected or central warehouse / HQ nodes
    useFrame(({ clock }) => {
      const t = clock.getElapsedTime();
      if (pulseRingRef.current) {
        if (isSelected || type === 'headquarters' || type === 'central_warehouse') {
          const s = 1 + ((Math.sin(t * 3.5) + 1) / 2) * 0.6;
          pulseRingRef.current.scale.set(s, s, s);
          const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
          if (mat) {
            mat.opacity = 0.8 - ((s - 1) / 0.6) * 0.5;
          }
        }
      }
    });

    // Determine scale and height based on type
    const { scale, height } = useMemo(() => {
      switch (type) {
        case 'headquarters':
        case 'central_warehouse':
          return { scale: 1.35, height: 0.8 };
        case 'regional_warehouse':
        case 'warehouse':
          return { scale: 1.15, height: 0.65 };
        case 'distribution_center':
          return { scale: 0.95, height: 0.5 };
        case 'supplier':
          return { scale: 0.9, height: 0.45 };
        case 'factory':
          return { scale: 0.95, height: 0.5 };
        case 'branch':
          return { scale: 0.72, height: 0.35 };
        case 'retailer':
          return { scale: 0.55, height: 0.25 };
        case 'customer':
          return { scale: 0.45, height: 0.2 };
        default:
          return { scale: 0.7, height: 0.35 };
      }
    }, [type]);

    // Active scale accounting for selection and dimming
    const currentScale = isSelected
      ? scale * 1.35
      : isHovered
      ? scale * 1.2
      : isDimmed
      ? scale * 0.65
      : scale;

    const code = (location as SCLocation).code || (location as SupplyChainLocation).code || '';
    const cluster = (location as SCLocation).cluster;
    const businessUnit = (location as SCLocation).businessUnit;
    const isOutsideTN = Boolean((location as SCLocation).metadata?.outsideTN);

    return (
      <group
        ref={groupRef}
        position={[pos.x, pos.y, pos.z]}
        scale={currentScale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
          onHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          onHover(false);
        }}
      >
        {/* Central Warehouse / HQ: Prominent Hexagonal Hub with Illumination */}
        {(type === 'central_warehouse' || type === 'headquarters') && (
          <group>
            {/* Hexagonal Base */}
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.26, 0.32, height, 6]} />
              <meshStandardMaterial
                color="#0f3d56"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.3 : 1.0}
                metalness={0.4}
                roughness={0.2}
              />
            </mesh>
            {/* Top glowing beacon sphere */}
            <mesh position={[0, height + 0.1, 0]}>
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.5 : 2.2}
              />
            </mesh>
          </group>
        )}

        {/* Regional Warehouse: Medium Hexagonal Tower */}
        {(type === 'regional_warehouse' || type === 'warehouse') && (
          <group>
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.2, 0.25, height, 6]} />
              <meshStandardMaterial
                color="#0f4838"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.3 : 0.9}
                metalness={0.3}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, height + 0.08, 0]}>
              <sphereGeometry args={[0.12, 12, 12]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.4 : 1.6}
              />
            </mesh>
          </group>
        )}

        {/* Distribution Centre: Octagonal Column */}
        {type === 'distribution_center' && (
          <group>
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.16, 0.2, height, 8]} />
              <meshStandardMaterial
                color="#0f4838"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.2 : 0.8}
                metalness={0.3}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, height + 0.06, 0]}>
              <octahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.4 : 1.5}
              />
            </mesh>
          </group>
        )}

        {/* Supplier: Diamond Octahedron */}
        {type === 'supplier' && (
          <group position={[0, height / 2 + 0.1, 0]}>
            <mesh>
              <octahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial
                color="#FF9F43"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.3 : 1.2}
                roughness={0.2}
              />
            </mesh>
          </group>
        )}

        {/* Factory: Industrial Cube */}
        {type === 'factory' && (
          <group position={[0, height / 2, 0]}>
            <mesh>
              <boxGeometry args={[0.3, height, 0.3]} />
              <meshStandardMaterial
                color="#FF6B6B"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.3 : 1.1}
                roughness={0.3}
              />
            </mesh>
          </group>
        )}

        {/* Branch: Slender Pin with Glowing Cap */}
        {type === 'branch' && (
          <group>
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.04, 0.08, height, 8]} />
              <meshStandardMaterial
                color="#144d57"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.2 : 0.7}
              />
            </mesh>
            <mesh position={[0, height + 0.06, 0]}>
              <sphereGeometry args={[0.09, 12, 12]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.3 : 1.3}
              />
            </mesh>
          </group>
        )}

        {/* Retailer / Customer */}
        {(type === 'retailer' || type === 'customer') && (
          <group position={[0, height + 0.05, 0]}>
            <mesh>
              <boxGeometry args={[0.13, 0.13, 0.13]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive={markerColor}
                emissiveIntensity={isDimmed ? 0.2 : 1.0}
              />
            </mesh>
          </group>
        )}

        {/* Pulsing ground ring for selection or Central Warehouses */}
        {(isSelected || type === 'headquarters' || type === 'central_warehouse') && (
          <mesh
            ref={pulseRingRef}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.02, 0]}
          >
            <ringGeometry args={[0.3, 0.45, 24]} />
            <meshBasicMaterial
              color={markerColor}
              transparent
              opacity={isDimmed ? 0.2 : 0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Tooltip on Hover or Selection */}
        {(isHovered || isSelected) && (
          <Html
            position={[0, height + 0.45, 0]}
            center
            distanceFactor={22}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <div
              style={{
                maxWidth: '140px',
                minWidth: '88px',
                padding: '4px 7px',
                borderRadius: '7px',
                background: isSelected ? 'rgba(7, 17, 31, 0.97)' : 'rgba(11, 23, 38, 0.9)',
                backdropFilter: 'blur(10px)',
                border: isSelected ? '1px solid #2EE6A6' : '1px solid rgba(255,255,255,0.12)',
                color: '#E0F2FE',
                fontSize: '9px',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                fontFamily: "'Inter', sans-serif",
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: markerColor,
                    display: 'inline-block',
                    boxShadow: `0 0 6px ${markerColor}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {code ? `[${code}] ` : ''}{location.name}
                </span>
                {isOutsideTN && (
                  <span
                    style={{
                      background: 'rgba(255, 159, 67, 0.2)',
                      color: '#FF9F43',
                      fontSize: '8px',
                      padding: '1px 3px',
                      borderRadius: '3px',
                      fontWeight: 600,
                    }}
                  >
                    UT
                  </span>
                )}
              </div>

              {(cluster || businessUnit || connectionCount) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: '#94A3B8', fontSize: '8px' }}>
                  {typeConfig.label}
                  {connectionCount && connectionCount.total > 0 && (
                    <span style={{ color: '#2EE6A6' }}>• {connectionCount.total}</span>
                  )}
                </div>
              )}
            </div>
          </Html>
        )}
      </group>
    );
  }
);

export const LocationMarkers: React.FC<LocationMarkersProps> = ({
  locations,
  selectedEntity,
  hoveredEntity,
  layerVisibility,
  is3DExtruded,
  connectionCounts,
  connectedLocationIds,
  onSelectLocation,
  onHoverLocation,
}) => {
  const baseElevation = is3DExtruded ? 0.28 : 0.08;

  const selectedLocId =
    selectedEntity?.type === 'location' ? selectedEntity.data.id : null;

  // Filter locations according to layer visibility toggles
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      switch (loc.type) {
        case 'headquarters':
          return layerVisibility.headquarters;
        case 'central_warehouse':
          return layerVisibility.centralWarehouses !== false && layerVisibility.warehouses;
        case 'regional_warehouse':
        case 'warehouse':
          return layerVisibility.regionalWarehouses !== false && layerVisibility.warehouses;
        case 'distribution_center':
          return layerVisibility.distributionCenters;
        case 'supplier':
          return layerVisibility.suppliers !== false;
        case 'factory':
          return layerVisibility.factories !== false;
        case 'branch':
          return layerVisibility.branches;
        case 'retailer':
          return layerVisibility.retailers;
        case 'customer':
          return layerVisibility.customers !== false;
        default:
          return true;
      }
    });
  }, [locations, layerVisibility]);

  return (
    <group name="LocationMarkers">
      {filteredLocations.map((loc) => {
        const isSelected = selectedLocId === loc.id;
        const isHovered =
          hoveredEntity?.type === 'location' && hoveredEntity.data.id === loc.id;

        // Dim if another location is selected and this one is not directly connected to it
        const isDimmed = Boolean(
          selectedLocId &&
          !isSelected &&
          connectedLocationIds &&
          !connectedLocationIds.has(loc.id)
        );

        const count = connectionCounts?.get(loc.id);

        return (
          <SingleMarker
            key={loc.id}
            location={loc}
            isSelected={isSelected}
            isHovered={isHovered}
            isDimmed={isDimmed}
            baseElevation={baseElevation}
            connectionCount={count}
            onSelect={() => onSelectLocation(loc)}
            onHover={(h) => onHoverLocation(h ? loc : null)}
          />
        );
      })}
    </group>
  );
};
