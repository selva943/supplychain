import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type {
  SupplyChainRoute,
  SupplyChainLocation,
  SelectedEntity,
  LayerVisibility,
} from '../../types/map';
import type { SCLocation, SCConnection } from '../../types/supplyChain';
import { projectGeoToVector3 } from '../../utils/geographicProjection';
import { createArcCurve } from '../../utils/geometry';
import { ROUTE_STATUS_COLORS, CONNECTION_TYPE_COLORS } from '../../theme/colors';

type AnyLocation = SupplyChainLocation | SCLocation;
type AnyConnection = SupplyChainRoute | SCConnection;

interface NetworkRoutesProps {
  routes: AnyConnection[];
  locations: AnyLocation[];
  selectedEntity: SelectedEntity;
  hoveredEntity: SelectedEntity;
  layerVisibility: LayerVisibility;
  is3DExtruded: boolean;
  connectedConnectionIds?: Set<string>;
  onSelectRoute: (route: AnyConnection) => void;
}

interface SingleRouteCurveProps {
  route: AnyConnection;
  sourceLoc: AnyLocation;
  destLoc: AnyLocation;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  baseElevation: number;
  onSelect: () => void;
}

const SingleRouteCurve: React.FC<SingleRouteCurveProps> = React.memo(
  ({
    route,
    sourceLoc,
    destLoc,
    isSelected,
    isHovered,
    isDimmed,
    baseElevation,
    onSelect,
  }) => {
    const { curve, points, midpoint, tangent } = useMemo(() => {
      const start = projectGeoToVector3(
        sourceLoc.longitude,
        sourceLoc.latitude,
        baseElevation + 0.15
      );
      const end = projectGeoToVector3(
        destLoc.longitude,
        destLoc.latitude,
        baseElevation + 0.15
      );
      const c = createArcCurve(start, end, 1.4);
      const pts = c.getPoints(32);
      const mid = c.getPointAt(0.55);
      const tan = c.getTangentAt(0.55).normalize();
      return { curve: c, points: pts, midpoint: mid, tangent: tan };
    }, [sourceLoc, destLoc, baseElevation]);

    const geometry = useMemo(() => {
      return new THREE.BufferGeometry().setFromPoints(points);
    }, [points]);

    // Thicker invisible hit tube for easy clicking and hover
    const hitTubeGeometry = useMemo(() => {
      return new THREE.TubeGeometry(curve, 24, 0.12, 6, false);
    }, [curve]);

    const status = (route as SCConnection).status || (route as SupplyChainRoute).status || 'active';
    const isBidirectional = (route as SCConnection).direction === 'bidirectional';
    const connType = (route as SCConnection).connectionType;

    const baseColor = isBidirectional
      ? '#55B8FF'
      : connType && CONNECTION_TYPE_COLORS[connType]
      ? CONNECTION_TYPE_COLORS[connType].color
      : ROUTE_STATUS_COLORS[status]?.color || '#2EE6A6';

    const color = isSelected ? '#ffffff' : baseColor;

    const opacity = isSelected
      ? 1.0
      : isHovered
      ? 0.95
      : isDimmed
      ? 0.12
      : isBidirectional
      ? 0.85
      : 0.55;

    // Direction arrow rotation towards curve tangent
    const arrowQuaternion = useMemo(() => {
      const quat = new THREE.Quaternion();
      const defaultDir = new THREE.Vector3(0, 1, 0); // cone points along Y by default
      quat.setFromUnitVectors(defaultDir, tangent);
      return quat;
    }, [tangent]);

    return (
      <group>
        {/* Visible line */}
        <primitive
          object={
            new THREE.Line(
              geometry,
              new THREE.LineBasicMaterial({
                color,
                linewidth: isSelected ? 3 : isHovered ? 2 : 1,
                transparent: true,
                opacity,
              })
            )
          }
        />

        {/* Direction Indicator Cone at 55% of curve */}
        {!isDimmed && (
          <mesh
            position={[midpoint.x, midpoint.y, midpoint.z]}
            quaternion={arrowQuaternion}
            scale={isSelected ? [1.4, 1.4, 1.4] : [1, 1, 1]}
          >
            <coneGeometry args={[0.07, 0.22, 8]} />
            <meshBasicMaterial
              color={isSelected ? '#ffffff' : color}
              transparent
              opacity={opacity}
            />
          </mesh>
        )}

        {/* Invisible hit tube for pointer events */}
        <mesh
          geometry={hitTubeGeometry}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            document.body.style.cursor = 'auto';
          }}
        >
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
    );
  }
);

export const NetworkRoutes: React.FC<NetworkRoutesProps> = ({
  routes,
  locations,
  selectedEntity,
  hoveredEntity,
  layerVisibility,
  is3DExtruded,
  connectedConnectionIds,
  onSelectRoute,
}) => {
  const baseElevation = is3DExtruded ? 0.28 : 0.08;

  // Build location fast lookup map
  const locationMap = useMemo(() => {
    const map = new Map<string, AnyLocation>();
    for (const loc of locations) {
      map.set(loc.id, loc);
    }
    return map;
  }, [locations]);

  // Valid routes whose endpoints exist
  const validRoutes = useMemo(() => {
    if (!layerVisibility.routes) return [];
    return routes.filter((r) => {
      const srcId = (r as SCConnection).sourceLocationId || (r as SupplyChainRoute).sourceId;
      const dstId = (r as SCConnection).destinationLocationId || (r as SupplyChainRoute).destinationId;
      const src = locationMap.get(srcId);
      const dst = locationMap.get(dstId);
      return src && dst;
    });
  }, [routes, locationMap, layerVisibility.routes]);

  const hasLocationSelection = selectedEntity?.type === 'location';

  // Active routes with curves for animated particles
  const activeRouteCurves = useMemo(() => {
    if (!layerVisibility.routeParticles) return [];
    return validRoutes
      .filter((r) => {
        const s = (r as SCConnection).status || (r as SupplyChainRoute).status;
        return s === 'active' || s === 'delayed';
      })
      .map((route, i) => {
        const srcId = (route as SCConnection).sourceLocationId || (route as SupplyChainRoute).sourceId;
        const dstId = (route as SCConnection).destinationLocationId || (route as SupplyChainRoute).destinationId;
        const src = locationMap.get(srcId)!;
        const dst = locationMap.get(dstId)!;
        const start = projectGeoToVector3(src.longitude, src.latitude, baseElevation + 0.15);
        const end = projectGeoToVector3(dst.longitude, dst.latitude, baseElevation + 0.15);
        const curve = createArcCurve(start, end, 1.4);
        return {
          route,
          curve,
          speed: 0.18 + (i % 5) * 0.04,
          offset: (i * 0.17) % 1.0,
        };
      });
  }, [validRoutes, locationMap, layerVisibility.routeParticles, baseElevation]);

  // InstancedMesh for animated flow particles
  const particleCount = activeRouteCurves.length;
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);

  useFrame(({ clock }) => {
    if (!instancedMeshRef.current || particleCount === 0) return;

    const elapsedTime = clock.getElapsedTime();

    for (let i = 0; i < particleCount; i++) {
      const item = activeRouteCurves[i];
      const progress = (elapsedTime * item.speed + item.offset) % 1.0;
      const pt = item.curve.getPointAt(progress);

      dummyMatrix.setPosition(pt.x, pt.y, pt.z);
      instancedMeshRef.current.setMatrixAt(i, dummyMatrix);
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="NetworkRoutes">
      {/* Route lines */}
      {validRoutes.map((route) => {
        const srcId = (route as SCConnection).sourceLocationId || (route as SupplyChainRoute).sourceId;
        const dstId = (route as SCConnection).destinationLocationId || (route as SupplyChainRoute).destinationId;
        const src = locationMap.get(srcId)!;
        const dst = locationMap.get(dstId)!;

        const isSelected =
          selectedEntity?.type === 'route' && selectedEntity.data.id === route.id;
        const isHovered =
          hoveredEntity?.type === 'route' && hoveredEntity.data.id === route.id;

        const isDimmed = Boolean(
          hasLocationSelection &&
          connectedConnectionIds &&
          !connectedConnectionIds.has(route.id)
        );

        return (
          <SingleRouteCurve
            key={route.id}
            route={route}
            sourceLoc={src}
            destLoc={dst}
            isSelected={isSelected}
            isHovered={isHovered}
            isDimmed={isDimmed}
            baseElevation={baseElevation}
            onSelect={() => onSelectRoute(route)}
          />
        );
      })}

      {/* Animated Flow Particles */}
      {layerVisibility.routeParticles && particleCount > 0 && !hasLocationSelection && (
        <instancedMesh
          ref={instancedMeshRef}
          args={[undefined, undefined, particleCount]}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#2EE6A6" />
        </instancedMesh>
      )}
    </group>
  );
};
