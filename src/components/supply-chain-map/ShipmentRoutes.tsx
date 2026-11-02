import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Shipment } from '../../types/shipment';
import type { InventoryMovement } from '../../types/movement';
import type { SCLocation } from '../../types/supplyChain';
import { projectGeoToVector3 } from '../../utils/geographicProjection';
import { createArcCurve } from '../../utils/geometry';
import { SHIPMENT_STATUS_COLORS } from '../../theme/colors';

interface ShipmentRoutesProps {
  selectedShipment: Shipment | null;
  selectedMovement: InventoryMovement | null;
  locations: SCLocation[];
  is3DExtruded: boolean;
}

export const ShipmentRoutes: React.FC<ShipmentRoutesProps> = ({
  selectedShipment,
  selectedMovement,
  locations,
  is3DExtruded,
}) => {
  const baseElevation = is3DExtruded ? 0.28 : 0.08;

  // Build location map
  const locationMap = useMemo(() => {
    const map = new Map<string, SCLocation>();
    for (const loc of locations) {
      map.set(loc.id, loc);
      map.set(loc.code.toUpperCase(), loc);
    }
    return map;
  }, [locations]);

  // Determine origin and destination points
  const routeData = useMemo(() => {
    if (!selectedShipment && !selectedMovement) return null;

    let srcLoc: SCLocation | undefined;
    let dstLoc: SCLocation | undefined;
    let title = '';
    let status = 'in_transit';
    let isCustomerDelivery = false;
    let destName = '';

    if (selectedShipment) {
      srcLoc = locationMap.get(selectedShipment.source_facility_id);
      dstLoc = locationMap.get(selectedShipment.destination_facility_id);
      title = selectedShipment.tracking_number;
      status = selectedShipment.shipment_status;
      destName = selectedShipment.destination_name;

      if (!dstLoc && srcLoc) {
        // Customer delivery point: place destination slightly offset from branch in delivery zone
        isCustomerDelivery = true;
      }
    } else if (selectedMovement) {
      srcLoc = locationMap.get(selectedMovement.source_facility_id);
      dstLoc = locationMap.get(selectedMovement.destination_facility_id);
      title = selectedMovement.movement_reference;
      status = selectedMovement.status;
      destName = selectedMovement.destination_facility_name || 'Destination Branch';
    }

    if (!srcLoc) return null;

    const startPos = projectGeoToVector3(
      srcLoc.longitude,
      srcLoc.latitude,
      baseElevation + 0.15
    );

    let endPos: THREE.Vector3;
    if (dstLoc) {
      endPos = projectGeoToVector3(
        dstLoc.longitude,
        dstLoc.latitude,
        baseElevation + 0.15
      );
    } else if (isCustomerDelivery) {
      // Deterministic small geographic offset for local retailer delivery (+/- 0.18 deg)
      const latOffset = 0.12;
      const lonOffset = 0.14;
      endPos = projectGeoToVector3(
        srcLoc.longitude + lonOffset,
        srcLoc.latitude + latOffset,
        baseElevation + 0.15
      );
    } else {
      return null;
    }

    const curve = createArcCurve(startPos, endPos, 1.6);
    const points = curve.getPoints(40);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    return {
      curve,
      points,
      geometry,
      startPos,
      endPos,
      title,
      status,
      destName,
      srcName: srcLoc.name,
      isCustomerDelivery,
    };
  }, [selectedShipment, selectedMovement, locationMap, baseElevation]);

  // Vehicle carrier mesh animation along the curve
  const courierMeshRef = useRef<THREE.Group>(null);
  const statusColor = routeData
    ? SHIPMENT_STATUS_COLORS[routeData.status]?.color || '#55B8FF'
    : '#55B8FF';

  useFrame(({ clock }) => {
    if (!courierMeshRef.current || !routeData) return;

    if (routeData.status === 'delivered') {
      // Stationed at destination upon confirmed delivery
      const end = routeData.endPos;
      courierMeshRef.current.position.set(end.x, end.y + 0.1, end.z);
    } else if (routeData.status === 'delivery_attempt_failed' || routeData.status === 'returned') {
      // Stationed at destination delivery attempt point
      const mid = routeData.curve.getPointAt(0.85);
      courierMeshRef.current.position.set(mid.x, mid.y, mid.z);
    } else {
      // Animated transit progress
      const t = (clock.getElapsedTime() * 0.15) % 1.0;
      const pt = routeData.curve.getPointAt(t);
      courierMeshRef.current.position.set(pt.x, pt.y, pt.z);
    }
  });

  if (!routeData) return null;

  return (
    <group name="SelectedShipmentRoute">
      {/* 1. Glowing High-Contrast Shipment Arc */}
      <primitive
        object={
          new THREE.Line(
            routeData.geometry,
            new THREE.LineBasicMaterial({
              color: statusColor,
              linewidth: 3,
              transparent: true,
              opacity: 0.95,
            })
          )
        }
      />

      {/* 2. Destination Anchor Point Beacon */}
      <mesh position={[routeData.endPos.x, routeData.endPos.y + 0.1, routeData.endPos.z]}>
        <cylinderGeometry args={[0.15, 0.22, 0.35, 12]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={1.8}
        />
      </mesh>

      {/* 3. Courier / Vehicle Indicator Group */}
      <group ref={courierMeshRef}>
        <mesh>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive={statusColor}
            emissiveIntensity={2.2}
          />
        </mesh>

        {/* Floating Tracking Badge */}
        <Html
          position={[0, 0.45, 0]}
          center
          distanceFactor={22}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(7, 17, 31, 0.95)',
              border: `1px solid ${statusColor}`,
              boxShadow: `0 0 12px ${statusColor}40`,
              color: '#FFFFFF',
              fontFamily: "'Inter', sans-serif",
              fontSize: '10px',
              whiteSpace: 'nowrap',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontWeight: 700, letterSpacing: '0.04em' }}>{routeData.title}</span>
            </div>
            <div style={{ color: '#94A3B8', fontSize: '9px' }}>
              {routeData.srcName} → {routeData.destName}
            </div>
            <div style={{ color: statusColor, fontSize: '9px', fontWeight: 600 }}>
              {routeData.status.toUpperCase().replace(/_/g, ' ')}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};
