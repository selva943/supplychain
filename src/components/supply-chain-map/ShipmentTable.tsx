import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Truck,
} from 'lucide-react';
import type { Shipment } from '../../types/shipment';
import { SHIPMENT_STATUS_COLORS } from '../../theme/colors';

interface ShipmentTableProps {
  shipments: Shipment[];
  selectedShipmentId?: string;
  onSelectShipment: (shipment: Shipment) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

export const ShipmentTable: React.FC<ShipmentTableProps> = ({
  shipments,
  selectedShipmentId,
  onSelectShipment,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  // Filter shipments
  const filtered = useMemo(() => {
    let result = shipments;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.shipment_reference.toLowerCase().includes(q) ||
          s.tracking_number.toLowerCase().includes(q) ||
          s.destination_name.toLowerCase().includes(q) ||
          s.source_facility_name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'exceptions') {
        result = result.filter((s) => s.exception !== null && s.exception !== undefined);
      } else {
        result = result.filter((s) => s.shipment_status === statusFilter);
      }
    }

    return result;
  }, [shipments, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '36px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        width: 'calc(100% - 760px)',
        minWidth: '540px',
        maxWidth: '920px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Collapsed Pill Button */}
      {!isExpanded ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setIsExpanded(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(11, 23, 38, 0.94)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(85, 184, 255, 0.4)',
              borderRadius: '24px',
              padding: '8px 18px',
              color: '#E0F2FE',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#38BDF8';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(85, 184, 255, 0.4)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Truck className="w-3.5 h-3.5 text-sky-400" />
            <span>ACTIVE SHIPMENTS & DISPATCHES</span>
            <span
              style={{
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38BDF8',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {shipments.length} Orders
            </span>
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      ) : (
        /* Expanded Bottom Drawer */
        <div
          style={{
            background: 'rgba(11, 23, 38, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(85, 184, 255, 0.35)',
            borderRadius: '14px',
            boxShadow: '0 20px 48px rgba(0,0,0,0.8)',
            overflow: 'hidden',
          }}
        >
          {/* Top Bar: Search, Status Filter Pills & Close */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '4px 10px',
                width: '260px',
              }}
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search tracking, order, customer..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  width: '100%',
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'in_transit', label: 'In Transit' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'delayed', label: 'Delayed' },
                { id: 'exceptions', label: 'Exceptions' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setStatusFilter(pill.id);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background:
                      statusFilter === pill.id
                        ? 'rgba(56, 189, 248, 0.25)'
                        : 'rgba(255,255,255,0.04)',
                    color: statusFilter === pill.id ? '#38BDF8' : '#94A3B8',
                    border:
                      statusFilter === pill.id
                        ? '1px solid #38BDF8'
                        : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Minimize button */}
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Collapse"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Table Contents */}
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#64748B',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '8px 12px' }}>Shipment / Tracking</th>
                  <th style={{ padding: '8px 12px' }}>Origin Facility</th>
                  <th style={{ padding: '8px 12px' }}>Destination</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Dispatch / ETA</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Quantity / Value</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShipments.length > 0 ? (
                  paginatedShipments.map((s) => {
                    const isSelected = selectedShipmentId === s.shipment_id;
                    const statusCfg =
                      SHIPMENT_STATUS_COLORS[s.shipment_status] ||
                      SHIPMENT_STATUS_COLORS.in_transit;

                    return (
                      <tr
                        key={s.shipment_id}
                        onClick={() => onSelectShipment(s)}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          cursor: 'pointer',
                          background: isSelected
                            ? 'rgba(56, 189, 248, 0.15)'
                            : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {/* Reference */}
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: statusCfg.color,
                              }}
                            />
                            <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
                              {s.tracking_number}
                            </span>
                          </div>
                          <div style={{ fontSize: '9px', color: '#64748B' }}>
                            Doc: {s.shipment_reference}
                          </div>
                        </td>

                        {/* Origin */}
                        <td style={{ padding: '8px 12px', color: '#CBD5E1' }}>
                          <div>{s.source_facility_name}</div>
                          <div style={{ fontSize: '9px', color: '#64748B' }}>
                            {s.business_unit} BU
                          </div>
                        </td>

                        {/* Destination */}
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ color: '#E2E8F0', fontWeight: 500 }}>
                            {s.destination_name}
                          </div>
                          <div style={{ fontSize: '9px', color: '#94A3B8' }}>
                            {s.destination_channel || 'Retail Partner'}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              background: `${statusCfg.color}15`,
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.color}30`,
                            }}
                          >
                            {s.exception && <AlertCircle className="w-2.5 h-2.5" />}
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Dates */}
                        <td style={{ padding: '8px 12px', color: '#94A3B8', fontSize: '10px' }}>
                          <div>{s.dispatch_datetime.slice(0, 10)}</div>
                          <div style={{ fontSize: '9px', color: '#64748B' }}>
                            ETA: {s.expected_delivery_datetime.slice(0, 10)}
                          </div>
                        </td>

                        {/* Qty & Value */}
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <div style={{ color: '#FFFFFF', fontWeight: 600 }}>
                            {s.total_quantity} pcs
                          </div>
                          <div style={{ fontSize: '9px', color: '#2EE6A6' }}>
                            ₹{s.total_value_rs.toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#64748B',
                        fontStyle: 'italic',
                      }}
                    >
                      No shipments found matching active filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div
            style={{
              padding: '6px 14px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#94A3B8',
            }}
          >
            <span>
              Showing {filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} orders
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: currentPage <= 1 ? '#475569' : '#CBD5E1',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: currentPage >= totalPages ? '#475569' : '#CBD5E1',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
