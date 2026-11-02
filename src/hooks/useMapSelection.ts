import { useState, useCallback } from 'react';
import type {
  DistrictProperties,
  SupplyChainLocation,
  SupplyChainRoute,
  SelectedEntity,
} from '../types/map';
import type { SCLocation, SCConnection } from '../types/supplyChain';
import type { Shipment } from '../types/shipment';
import type { InventoryMovement } from '../types/movement';

export function useMapSelection() {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [hoveredEntity, setHoveredEntity] = useState<SelectedEntity>(null);

  const selectDistrict = useCallback((district: DistrictProperties) => {
    setSelectedEntity((prev) => {
      if (prev?.type === 'district' && prev.data.district === district.district) {
        return null; // Toggle off if already selected
      }
      return { type: 'district', data: district };
    });
  }, []);

  const selectLocation = useCallback((location: SupplyChainLocation | SCLocation) => {
    setSelectedEntity((prev) => {
      if (prev?.type === 'location' && prev.data.id === location.id) {
        return null;
      }
      return { type: 'location', data: location };
    });
  }, []);

  const selectRoute = useCallback((route: SupplyChainRoute | SCConnection) => {
    setSelectedEntity((prev) => {
      if (prev?.type === 'route' && prev.data.id === route.id) {
        return null;
      }
      return { type: 'route', data: route };
    });
  }, []);

  const selectShipment = useCallback((shipment: Shipment) => {
    setSelectedEntity((prev) => {
      if (prev?.type === 'shipment' && prev.data.shipment_id === shipment.shipment_id) {
        return null;
      }
      return { type: 'shipment', data: shipment };
    });
  }, []);

  const selectMovement = useCallback((movement: InventoryMovement) => {
    setSelectedEntity((prev) => {
      if (prev?.type === 'movement' && prev.data.movement_id === movement.movement_id) {
        return null;
      }
      return { type: 'movement', data: movement };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  const setHovered = useCallback((entity: SelectedEntity) => {
    setHoveredEntity(entity);
  }, []);

  return {
    selectedEntity,
    hoveredEntity,
    selectDistrict,
    selectLocation,
    selectRoute,
    selectShipment,
    selectMovement,
    clearSelection,
    setHovered,
  };
}
