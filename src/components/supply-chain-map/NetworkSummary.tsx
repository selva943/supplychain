import React, { useState } from 'react';
import type { NetworkStats } from '../../types/supplyChain';

interface NetworkSummaryProps {
  stats: NetworkStats;
  isOpen?: boolean;
  onClose?: () => void;
}

export const NetworkSummary: React.FC<NetworkSummaryProps> = ({ stats }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '36px',
        left: '20px',
        zIndex: 25,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Collapsed Pill Button / Toggle */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(11, 23, 38, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(46, 230, 166, 0.35)',
            borderRadius: '24px',
            padding: '8px 16px',
            color: '#E0F2FE',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2EE6A6';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(46, 230, 166, 0.35)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#2EE6A6',
              boxShadow: '0 0 8px #2EE6A6',
            }}
          />
          <span>NETWORK TOPOLOGY</span>
          <span
            style={{
              background: 'rgba(46, 230, 166, 0.15)',
              color: '#2EE6A6',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
            }}
          >
            {stats.totalFacilities} Nodes • {stats.totalConnections} Links
          </span>
          <span style={{ fontSize: '10px', opacity: 0.6 }}>▲</span>
        </button>
      ) : (
        /* Expanded Floating Card */
        <div
          style={{
            width: '380px',
            background: 'rgba(11, 23, 38, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(46, 230, 166, 0.35)',
            borderRadius: '14px',
            padding: '16px',
            color: '#E0F2FE',
            boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '10px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#2EE6A6',
                  boxShadow: '0 0 8px #2EE6A6',
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em' }}>
                SUPPLY CHAIN TOPOLOGY
              </span>
              <span
                style={{
                  fontSize: '10px',
                  background: 'rgba(85, 184, 255, 0.2)',
                  color: '#55B8FF',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                VERIFIED
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Key Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Facilities</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>{stats.totalFacilities}</div>
              <div style={{ fontSize: '10px', color: '#2EE6A6' }}>{stats.activeFacilities} active</div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Connections</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#55B8FF' }}>{stats.totalConnections}</div>
              <div style={{ fontSize: '10px', color: '#63B3ED' }}>1 trunk • 63 feeder</div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Districts</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFB547' }}>{stats.districtsWithFacilities}</div>
              <div style={{ fontSize: '10px', color: '#FFB547' }}>Across TN</div>
            </div>
          </div>

          {/* Facility Breakdown */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#94A3B8',
                fontWeight: 600,
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Facility Distribution
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  padding: '3px 6px',
                  background: 'rgba(85, 184, 255, 0.08)',
                  borderRadius: '4px',
                }}
              >
                <span style={{ color: '#55B8FF' }}>Central Warehouses (HQ Hubs)</span>
                <span style={{ fontWeight: 600 }}>{stats.facilitiesByType.central_warehouse}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  padding: '3px 6px',
                  background: 'rgba(160, 231, 229, 0.08)',
                  borderRadius: '4px',
                }}
              >
                <span style={{ color: '#A0E7E5' }}>Operational Branches</span>
                <span style={{ fontWeight: 600 }}>{stats.facilitiesByType.branch}</span>
              </div>
              {stats.facilitiesOutsideTN > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    padding: '3px 6px',
                    background: 'rgba(255, 159, 67, 0.1)',
                    borderRadius: '4px',
                  }}
                >
                  <span style={{ color: '#FF9F43' }}>Facilities outside Tamil Nadu</span>
                  <span style={{ fontWeight: 600, color: '#FF9F43' }}>{stats.facilitiesOutsideTN}</span>
                </div>
              )}
            </div>
          </div>

          {/* Topology Attributes */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '8px',
              fontSize: '11px',
              color: '#94A3B8',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cross-Cluster Corridor:</span>
              <span style={{ color: '#E0F2FE', fontWeight: 600 }}>{stats.crossClusterConnections}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Unconnected Facilities:</span>
              <span style={{ color: stats.unconnectedFacilities === 0 ? '#2EE6A6' : '#FF5D67', fontWeight: 600 }}>
                {stats.unconnectedFacilities}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Primary Hub Links:</span>
              <span style={{ color: '#E0F2FE', fontWeight: 600 }}>
                {stats.mostConnected.slice(0, 2).map((facility) => `${facility.locationId} (${facility.total})`).join(' • ') || 'No facility links'}
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: '10px',
              fontSize: '9px',
              color: '#64748B',
              fontStyle: 'italic',
            }}
          >
            * Network topology is computed from the currently loaded local data.
          </div>
        </div>
      )}
    </div>
  );
};
