import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Search,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import {
  getActiveAlerts,
  updateAlertStatus,
  getFilteredAlerts,
} from '../../services/analyticsService';
import type {
  OperationalAlert,
  AlertSeverity,
  AlertCategory,
  AlertStatus,
} from '../../types/analytics';

interface AlertCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFacility: (facilityId: string) => void;
  onSelectShipment?: (shipmentId: string) => void;
}

export const AlertCenterModal: React.FC<AlertCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectFacility,
  onSelectShipment,
}) => {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Local refresh counter to re-render when alerts are transitioned
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const allAlerts = useMemo(() => {
    if (!isOpen) return [];
    return getActiveAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, refreshKey]);

  const filteredAlerts = useMemo(() => {
    return getFilteredAlerts({
      severity: severityFilter,
      category: categoryFilter,
      status: statusFilter,
      searchTerm,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAlerts, severityFilter, categoryFilter, statusFilter, searchTerm, refreshKey]);

  if (!isOpen) return null;

  // Counts
  const criticalCount = allAlerts.filter(
    (a) => a.severity === 'critical' && a.status !== 'resolved'
  ).length;
  const highCount = allAlerts.filter(
    (a) => a.severity === 'high' && a.status !== 'resolved'
  ).length;
  const mediumCount = allAlerts.filter(
    (a) => a.severity === 'medium' && a.status !== 'resolved'
  ).length;
  const resolvedCount = allAlerts.filter((a) => a.status === 'resolved').length;

  const handleStatusChange = (
    alertId: string,
    newStatus: AlertStatus,
    notes?: string
  ) => {
    updateAlertStatus(alertId, newStatus, 'Operations Command', notes);
    setResolvingAlertId(null);
    setResolutionNotes('');
    setRefreshKey((k) => k + 1);
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-400 border border-amber-500/30">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-950/80 text-yellow-400 border border-yellow-500/30">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-950/80 text-sky-400 border border-sky-500/30">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: AlertStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-900/40 text-rose-300 border border-rose-800">
            Open
          </span>
        );
      case 'acknowledged':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-900/40 text-sky-300 border border-sky-800">
            Acknowledged
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-900/40 text-amber-300 border border-amber-800">
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/40 text-emerald-300 border border-emerald-800">
            Resolved
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Operational Alert Center
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {filteredAlerts.length} Active / Filtered
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time rule evaluations for delivery exceptions, overdue orders, and aged stock transfers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                getActiveAlerts(true);
                setRefreshKey((k) => k + 1);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              title="Re-evaluate Rules"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-evaluate</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATUS COUNTERS BAR */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                severityFilter === 'critical'
                  ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Critical:</span>
              <strong className="text-rose-400 font-mono">{criticalCount}</strong>
            </button>

            <button
              onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                severityFilter === 'high'
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>High:</span>
              <strong className="text-amber-400 font-mono">{highCount}</strong>
            </button>

            <button
              onClick={() => setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                severityFilter === 'medium'
                  ? 'bg-yellow-950/90 border-yellow-500 text-yellow-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Medium:</span>
              <strong className="text-yellow-400 font-mono">{mediumCount}</strong>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Resolved:</span>
              <strong className="text-emerald-400 font-mono">{resolvedCount}</strong>
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            Deduplication: <strong className="text-slate-300">Deterministic ID Keying</strong>
          </div>
        </div>

        {/* FILTERS TOOLBAR */}
        <div className="p-4 bg-slate-950/20 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 text-xs"
            >
              <option value="all">All Categories</option>
              <option value="shipment">Shipment SLA</option>
              <option value="inventory_movement">Inventory Movement</option>
              <option value="facility">Facility Exceptions</option>
              <option value="data_quality">Data Telemetry</option>
            </select>

            {/* Lifecycle Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 text-xs"
            >
              <option value="all">All Lifecycle States</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rule, entity, or evidence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg pl-8 pr-3 py-1.5 w-60 focus:outline-none focus:border-sky-500"
              />
            </div>
            {(severityFilter !== 'all' ||
              categoryFilter !== 'all' ||
              statusFilter !== 'all' ||
              searchTerm !== '') && (
              <button
                onClick={() => {
                  setSeverityFilter('all');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="text-xs text-sky-400 hover:underline px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ALERTS LIST */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-300 text-sm">No Matching Alerts Found</p>
              <p className="text-xs mt-1">
                All operational metrics are within configured thresholds for the selected filters.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert: OperationalAlert) => (
              <div
                key={alert.alertId}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                {/* Alert Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(alert.severity)}
                    <h3 className="text-xs font-bold text-slate-100">{alert.title}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {alert.ruleId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(alert.status)}
                    <span className="text-[11px] font-mono text-slate-500">
                      Detected: {new Date(alert.evidence.detectedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Evidence Message */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-200">Evidence: </strong>
                      <span>
                        {typeof alert.evidence === 'string'
                          ? alert.evidence
                          : `${alert.evidence.metricName}: ${alert.evidence.actualValue}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Entity Details & Recommended Action */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>
                      Entity:{' '}
                      <strong className="text-slate-200 font-medium">
                        {alert.relatedEntityName}
                      </strong>{' '}
                      <span className="text-slate-500 font-mono">[{alert.relatedEntityType}]</span>
                    </span>
                  </div>

                  {/* Actions & Map Locate */}
                  <div className="flex items-center gap-2">
                    {/* View Map Action */}
                    <button
                      onClick={() => {
                        if (alert.relatedEntityType === 'facility') {
                          onSelectFacility(alert.relatedEntityId);
                          onClose();
                        } else if (
                          alert.relatedEntityType === 'shipment' &&
                          onSelectShipment
                        ) {
                          onSelectShipment(alert.relatedEntityId);
                          onClose();
                        }
                      }}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Locate on Map</span>
                    </button>

                    {/* Transition Status Buttons */}
                    {alert.status === 'open' && (
                      <button
                        onClick={() => handleStatusChange(alert.alertId, 'acknowledged')}
                        className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {alert.status === 'acknowledged' && (
                      <button
                        onClick={() => handleStatusChange(alert.alertId, 'in_progress')}
                        className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold transition-colors"
                      >
                        Start Investigation
                      </button>
                    )}

                    {alert.status !== 'resolved' && (
                      <button
                        onClick={() => {
                          setResolvingAlertId(
                            resolvingAlertId === alert.alertId ? null : alert.alertId
                          );
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors"
                      >
                        Resolve
                      </button>
                    )}

                    {/* Toggle Audit History */}
                    <button
                      onClick={() =>
                        setExpandedAuditId(
                          expandedAuditId === alert.alertId ? null : alert.alertId
                        )
                      }
                      className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                      title="View Lifecycle Audit Trail"
                    >
                      {expandedAuditId === alert.alertId ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Inline Resolution Box */}
                {resolvingAlertId === alert.alertId && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-emerald-500/40 text-xs space-y-2">
                    <span className="font-bold text-emerald-400 block">
                      Confirm Alert Resolution
                    </span>
                    <input
                      type="text"
                      placeholder="Add resolution explanation or action taken (required)..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setResolvingAlertId(null)}
                        className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(
                            alert.alertId,
                            'resolved',
                            resolutionNotes || 'Operational issue reconciled'
                          )
                        }
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                      >
                        Confirm Resolution
                      </button>
                    </div>
                  </div>
                )}

                {/* Audit Trail Drawer */}
                {expandedAuditId === alert.alertId && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] space-y-1.5 font-mono">
                    <span className="font-sans font-bold text-slate-400 block mb-1">
                      Lifecycle Audit History:
                    </span>
                    {(alert.auditTrail || alert.auditLog || []).map((entry: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-slate-400 bg-slate-900/40 px-2 py-1 rounded"
                      >
                        <span>
                          <strong className="text-slate-200">{entry.action}</strong> by{' '}
                          <span className="text-sky-400">{entry.actor}</span>
                          {entry.notes && ` — "${entry.notes}"`}
                        </span>
                        <span className="text-slate-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
