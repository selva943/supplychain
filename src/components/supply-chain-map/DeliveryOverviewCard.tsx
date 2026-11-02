import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { DeliveryOverviewStats, ShipmentStatus } from '../../types/shipment';

interface DeliveryOverviewCardProps {
  stats: DeliveryOverviewStats;
  onFilterByStatus?: (status: ShipmentStatus | 'all' | 'exceptions' | 'overdue') => void;
  activeStatusFilter?: string;
}

export const DeliveryOverviewCard: React.FC<DeliveryOverviewCardProps> = ({
  stats,
  onFilterByStatus,
  activeStatusFilter = 'all',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div
      style={{
        position: 'absolute',
        top: '70px',
        left: '20px',
        zIndex: 25,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: 'rgba(11, 23, 38, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(85, 184, 255, 0.3)',
          borderRadius: '14px',
          boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
          width: '360px',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Card Header & Toggle */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#38BDF8',
                boxShadow: '0 0 8px #38BDF8',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: '#FFFFFF' }}>
              DELIVERY TELEMETRY & SLA
            </span>
            <span
              style={{
                fontSize: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              OCT'26
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#2EE6A6', fontWeight: 700 }}>
              {stats.onTimeDeliveryRatePct}% On-Time
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div style={{ padding: '12px 14px' }}>
            {/* Primary KPI Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              {/* Total Shipments */}
              <div
                onClick={() => onFilterByStatus?.('all')}
                style={{
                  background: activeStatusFilter === 'all' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: activeStatusFilter === 'all' ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.06)',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94A3B8', fontSize: '10px' }}>
                  <Truck className="w-3 h-3 text-sky-400" />
                  <span>Total</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                  {stats.totalShipments}
                </div>
                <div style={{ fontSize: '9px', color: '#94A3B8' }}>Verified orders</div>
              </div>

              {/* In Transit */}
              <div
                onClick={() => onFilterByStatus?.('in_transit')}
                style={{
                  background: activeStatusFilter === 'in_transit' ? 'rgba(85, 184, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: activeStatusFilter === 'in_transit' ? '1px solid #55B8FF' : '1px solid rgba(255,255,255,0.06)',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94A3B8', fontSize: '10px' }}>
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>In Transit</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#55B8FF', marginTop: '2px' }}>
                  {stats.inTransit}
                </div>
                <div style={{ fontSize: '9px', color: '#55B8FF' }}>Active en route</div>
              </div>

              {/* Delivered */}
              <div
                onClick={() => onFilterByStatus?.('delivered')}
                style={{
                  background: activeStatusFilter === 'delivered' ? 'rgba(46, 230, 166, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: activeStatusFilter === 'delivered' ? '1px solid #2EE6A6' : '1px solid rgba(255,255,255,0.06)',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94A3B8', fontSize: '10px' }}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Delivered</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#2EE6A6', marginTop: '2px' }}>
                  {stats.delivered}
                </div>
                <div style={{ fontSize: '9px', color: '#2EE6A6' }}>POD Confirmed</div>
              </div>
            </div>

            {/* SLA & Exception Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              {/* Delayed */}
              <div
                onClick={() => onFilterByStatus?.('delayed')}
                style={{
                  background: activeStatusFilter === 'delayed' ? 'rgba(255, 181, 71, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: activeStatusFilter === 'delayed' ? '1px solid #FFB547' : '1px solid rgba(255,255,255,0.06)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '10px', color: '#FFB547', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>Delayed</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFB547' }}>
                  {stats.delayed}
                </div>
              </div>

              {/* Failed / Returned */}
              <div
                onClick={() => onFilterByStatus?.('exceptions')}
                style={{
                  background: activeStatusFilter === 'exceptions' ? 'rgba(255, 93, 103, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: activeStatusFilter === 'exceptions' ? '1px solid #FF5D67' : '1px solid rgba(255,255,255,0.06)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '10px', color: '#FF5D67', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>SRN Returns</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FF5D67' }}>
                  {stats.deliveryAttemptFailed + stats.returned}
                </div>
              </div>

              {/* Overdue */}
              <div
                onClick={() => onFilterByStatus?.('overdue')}
                style={{
                  background: activeStatusFilter === 'overdue' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: activeStatusFilter === 'overdue' ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.06)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '10px', color: '#F87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>Overdue</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#F87171' }}>
                  {stats.overdueCount}
                </div>
              </div>
            </div>

            {/* Formula Documented Callout */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '8px',
                fontSize: '10px',
                color: '#94A3B8',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Documented SLA On-Time:</span>
                <span style={{ color: '#2EE6A6', fontWeight: 600 }}>
                  {stats.onTimeDelivered} / {stats.eligibleDelivered} eligible deliveries
                </span>
              </div>
              <div style={{ fontSize: '9px', color: '#64748B' }}>
                * Excludes cancelled orders. Calculated from the currently loaded data.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
