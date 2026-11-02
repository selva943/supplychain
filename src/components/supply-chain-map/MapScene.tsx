import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type {
  DistrictFeature,
  SupplyChainLocation,
  SupplyChainRoute,
  DistrictProperties,
  SelectedEntity,
  LayerVisibility,
  InteractionMode,
} from '../../types/map';
import type { SCLocation, SCConnection, FacilityConnectionCounts } from '../../types/supplyChain';
import { TamilNaduSurface } from './TamilNaduSurface';
import { DistrictLayer } from './DistrictLayer';
import { LocationMarkers } from './LocationMarkers';
import { NetworkRoutes } from './NetworkRoutes';
import { ShipmentRoutes } from './ShipmentRoutes';
import { projectGeoToVector3 } from '../../utils/geographicProjection';
import { THEME } from '../../theme/colors';

type AnyLocation = SupplyChainLocation | SCLocation;
type AnyConnection = SupplyChainRoute | SCConnection;

interface MapSceneProps {
  districts: DistrictFeature[];
  locations: AnyLocation[];
  routes: AnyConnection[];
  selectedEntity: SelectedEntity;
  hoveredEntity: SelectedEntity;
  layerVisibility: LayerVisibility;
  interactionMode: InteractionMode;
  panAction: { dx: number; dz: number; trigger: number };
  zoomAction: { factor: number; trigger: number };
  connectionCounts?: Map<string, FacilityConnectionCounts>;
  connectedLocationIds?: Set<string>;
  connectedConnectionIds?: Set<string>;
  onSelectDistrict: (district: DistrictProperties) => void;
  onSelectLocation: (location: AnyLocation) => void;
  onSelectRoute: (route: AnyConnection) => void;
  onHoverDistrict: (district: DistrictProperties | null) => void;
  onHoverLocation: (location: AnyLocation | null) => void;
  resetViewTrigger: number;
}

// Camera Controller for smooth navigation, focusing, panning and zooming
const CameraController: React.FC<{
  selectedEntity: SelectedEntity;
  resetViewTrigger: number;
  interactionMode: InteractionMode;
  panAction: { dx: number; dz: number; trigger: number };
  zoomAction: { factor: number; trigger: number };
  locations: AnyLocation[];
}> = ({
  selectedEntity,
  resetViewTrigger,
  interactionMode,
  panAction,
  zoomAction,
  locations,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const targetPos = useRef(new THREE.Vector3(0, 24, 18));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isTransitioning = useRef(false);

  // Handle camera animation on selection or reset
  useEffect(() => {
    if (resetViewTrigger > 0) {
      targetPos.current.set(0, 24, 18);
      targetLookAt.current.set(0, 0, 0);
      isTransitioning.current = true;
      return;
    }

    if (selectedEntity?.type === 'district') {
      const [lon, lat] = selectedEntity.data.center;
      const pt = projectGeoToVector3(lon, lat, 0.4);
      targetLookAt.current.set(pt.x, 0.4, pt.z);
      targetPos.current.set(pt.x, 12, pt.z + 10);
      isTransitioning.current = true;
    } else if (selectedEntity?.type === 'location') {
      const { longitude, latitude } = selectedEntity.data;
      const pt = projectGeoToVector3(longitude, latitude, 0.5);
      targetLookAt.current.set(pt.x, 0.5, pt.z);
      targetPos.current.set(pt.x, 9, pt.z + 7);
      isTransitioning.current = true;
    } else if (selectedEntity?.type === 'shipment') {
      // Find source facility for camera framing
      const s = selectedEntity.data;
      const src = locations.find((l) => l.id === s.source_facility_id);
      if (src) {
        const pt = projectGeoToVector3(src.longitude, src.latitude, 0.5);
        targetLookAt.current.set(pt.x, 0.5, pt.z);
        targetPos.current.set(pt.x, 10, pt.z + 8);
        isTransitioning.current = true;
      }
    }
  }, [selectedEntity, resetViewTrigger, locations]);

  // Handle manual pan action from D-Pad (Up, Down, Left, Right)
  useEffect(() => {
    if (panAction.trigger === 0 || !controlsRef.current) return;
    isTransitioning.current = false;
    const { dx, dz } = panAction;

    // Shift camera and target in world space
    camera.position.x += dx;
    camera.position.z += dz;
    controlsRef.current.target.x += dx;
    controlsRef.current.target.z += dz;
    controlsRef.current.update();
  }, [panAction, camera]);

  // Handle manual zoom action (+ / -)
  useEffect(() => {
    if (zoomAction.trigger === 0 || !controlsRef.current) return;
    isTransitioning.current = false;
    const { factor } = zoomAction;

    const dir = new THREE.Vector3()
      .subVectors(camera.position, controlsRef.current.target)
      .multiplyScalar(factor);

    const newDist = dir.length();
    if (newDist >= 4 && newDist <= 55) {
      camera.position.copy(controlsRef.current.target).add(dir);
      controlsRef.current.update();
    }
  }, [zoomAction, camera]);

  // Smooth lerp frame updates
  useFrame((_, delta) => {
    if (isTransitioning.current && controlsRef.current) {
      const lerpSpeed = Math.min(delta * 3.5, 0.15);

      camera.position.lerp(targetPos.current, lerpSpeed);
      controlsRef.current.target.lerp(targetLookAt.current, lerpSpeed);
      controlsRef.current.update();

      const distCam = camera.position.distanceTo(targetPos.current);
      const distTarget = controlsRef.current.target.distanceTo(targetLookAt.current);
      if (distCam < 0.1 && distTarget < 0.1) {
        isTransitioning.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={55}
      maxPolarAngle={Math.PI / 2.05} // Prevent camera going below terrain horizon
      minPolarAngle={Math.PI / 12}
      mouseButtons={{
        LEFT:
          interactionMode === 'rotate'
            ? THREE.MOUSE.ROTATE
            : THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT:
          interactionMode === 'rotate'
            ? THREE.MOUSE.PAN
            : THREE.MOUSE.ROTATE,
      }}
      touches={{
        ONE:
          interactionMode === 'rotate'
            ? THREE.TOUCH.ROTATE
            : THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
};

export const MapScene: React.FC<MapSceneProps> = ({
  districts,
  locations,
  routes,
  selectedEntity,
  hoveredEntity,
  layerVisibility,
  interactionMode,
  panAction,
  zoomAction,
  connectionCounts,
  connectedLocationIds,
  connectedConnectionIds,
  onSelectDistrict,
  onSelectLocation,
  onSelectRoute,
  onHoverDistrict,
  onHoverLocation,
  resetViewTrigger,
}) => {
  return (
    <div
      className="w-full h-full relative select-none"
      onContextMenu={(e) => e.preventDefault()} // Crucial: prevents Windows context menu on right drag
    >
      <Canvas
        camera={{ position: [0, 24, 18], fov: 45, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ background: THEME.background }}
      >
        {/* Atmospheric Fog */}
        <fog attach="fog" args={[THEME.background, 22, 65]} />

        {/* Cinematic Command Center Lighting */}
        <ambientLight color="#627d98" intensity={1.4} />
        <directionalLight
          position={[15, 30, 20]}
          intensity={2.2}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Cool cyan rim light from side */}
        <pointLight position={[-20, 15, -15]} intensity={1.8} color="#2EE6A6" />
        {/* Warm amber fill from bottom-left */}
        <pointLight position={[20, 10, -20]} intensity={1.2} color="#55B8FF" />

        {/* Orbit Controls & Camera Transitions */}
        <CameraController
          selectedEntity={selectedEntity}
          resetViewTrigger={resetViewTrigger}
          interactionMode={interactionMode}
          panAction={panAction}
          zoomAction={zoomAction}
          locations={locations}
        />

        {/* 3D Map Surface Pedestal */}
        <TamilNaduSurface is3DExtruded={layerVisibility.extruded3D} />

        {/* District Boundaries & 3D Extrusions */}
        <DistrictLayer
          districts={districts}
          selectedEntity={selectedEntity}
          hoveredEntity={hoveredEntity}
          showBoundaries={layerVisibility.districtBoundaries}
          showLabels={layerVisibility.districtLabels}
          is3DExtruded={layerVisibility.extruded3D}
          onSelectDistrict={onSelectDistrict}
          onHoverDistrict={onHoverDistrict}
        />

        {/* Inter-Node Supply Chain Routes & Flow Particles */}
        <NetworkRoutes
          routes={routes}
          locations={locations}
          selectedEntity={selectedEntity}
          hoveredEntity={hoveredEntity}
          layerVisibility={layerVisibility}
          is3DExtruded={layerVisibility.extruded3D}
          connectedConnectionIds={connectedConnectionIds}
          onSelectRoute={onSelectRoute}
        />

        {/* Phase 3: Active Selected Shipment / Inventory Movement Route */}
        <ShipmentRoutes
          selectedShipment={selectedEntity?.type === 'shipment' ? selectedEntity.data : null}
          selectedMovement={selectedEntity?.type === 'movement' ? selectedEntity.data : null}
          locations={locations as SCLocation[]}
          is3DExtruded={layerVisibility.extruded3D}
        />

        {/* Supply Chain Markers */}
        <LocationMarkers
          locations={locations}
          selectedEntity={selectedEntity}
          hoveredEntity={hoveredEntity}
          layerVisibility={layerVisibility}
          is3DExtruded={layerVisibility.extruded3D}
          connectionCounts={connectionCounts}
          connectedLocationIds={connectedLocationIds}
          onSelectLocation={onSelectLocation}
          onHoverLocation={onHoverLocation}
        />
      </Canvas>
    </div>
  );
};
