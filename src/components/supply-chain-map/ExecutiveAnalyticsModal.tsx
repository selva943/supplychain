import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Layers,
  MapPin,
  ChevronRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  getExecutiveAnalyticsSnapshot,
  exportAnalyticsToCsv,
} from '../../services/analyticsService';

interface ExecutiveAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFacility: (facilityId: string) => void;
  onSelectShipment?: (shipmentId: string) => void;
  onOpenAlertCenter: () => void;
}

export const ExecutiveAnalyticsModal: React.FC<ExecutiveAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onSelectFacility,
  onOpenAlertCenter,
}) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'facilities' | 'bottlenecks'>('trends');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [searchFacility, setSearchFacility] = useState<string>('');

  const snapshot = useMemo(() => {
    if (!isOpen) return null;
    return getExecutiveAnalyticsSnapshot();
  }, [isOpen]);

  if (!isOpen || !snapshot) return null;

  const {
    kpis,
    trends,
    periodComparisons,
    facilityPerformance,
    districtPerformance,
    bottlenecks,
    recommendations,
    dataFreshness,
  } = snapshot;

  // Filter facilities
  const filteredFacilities = facilityPerformance.filter((f) => {
    const matchesDistrict = districtFilter === 'ALL' || f.district === districtFilter;
    const matchesSearch =
      searchFacility === '' ||
      f.facilityName.toLowerCase().includes(searchFacility.toLowerCase()) ||
      (f.district && f.district.toLowerCase().includes(searchFacility.toLowerCase()));
    return matchesDistrict && matchesSearch;
  });

  const uniqueDistricts = Array.from(
    new Set(facilityPerformance.map((f) => f.district).filter((d): d is string => Boolean(d)))
  ).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  Supply Chain Executive Analytics
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                    Phase 4 • Live
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Analytics are based on the locally selected operational data.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* CSV Export Button */}
            <button
              onClick={() => exportAnalyticsToCsv()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors"
              title="Download Executive Analytics Summary CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Alert Center Trigger */}
            <button
              onClick={() => {
                onClose();
                onOpenAlertCenter();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Alert Center</span>
              {kpis.criticalAlertsCount.value > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {kpis.criticalAlertsCount.value}
                </span>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DATA FRESHNESS & AUDIT STRIP */}
        <div className="px-6 py-2 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Freshness: <strong className="text-slate-200">Evaluated 31-Oct-2026 23:59:59 UTC</strong>
            </span>
            <span>
              Source Dataset: <strong className="text-slate-200">{dataFreshness.sourceDataset}</strong>
            </span>
          </div>
          <div>
            <span>
              Records Evaluated:{' '}
              <strong className="text-emerald-400">
                {dataFreshness.totalRecordsEvaluated.toLocaleString()} rows
              </strong>
            </span>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. EXECUTIVE KPI SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Shipment Volume */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 relative overflow-hidden group hover:border-sky-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Shipment Volume
                </span>
                <Truck className="w-4 h-4 text-sky-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white font-mono">
                  {kpis.totalShipments.formattedValue}
                </span>
                <span className="text-[11px] text-slate-400">Total orders</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-700/50 grid grid-cols-3 gap-1 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Delivered</span>
                  <span className="font-semibold text-emerald-400">
                    {kpis.deliveredShipments.formattedValue}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">In Transit</span>
                  <span className="font-semibold text-sky-400">
                    {kpis.inTransitShipments.formattedValue}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Overdue</span>
                  <span className="font-semibold text-rose-400">
                    {kpis.overdueShipments.formattedValue}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: On-Time Delivery Rate */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  On-Time Delivery (OTD)
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-400 font-mono">
                  {kpis.onTimeDeliveryRate.formattedValue}
                </span>
                <span className="text-[11px] text-slate-400">
                  ({kpis.onTimeDeliveryRate.numerator} / {kpis.onTimeDeliveryRate.denominator})
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Late Deliveries:</span>
                <span className="font-semibold text-amber-400">
                  {kpis.lateDeliveryRate.formattedValue} ({kpis.lateDeliveryRate.numerator})
                </span>
              </div>
            </div>

            {/* Card 3: SLA Delays & Exceptions */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 relative overflow-hidden group hover:border-amber-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Avg Delivery Delay
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-400 font-mono">
                  {kpis.averageDeliveryDelayHours.formattedValue}
                </span>
                <span className="text-[11px] text-slate-400">all completed</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Avg Late Delay:</span>
                <span className="font-semibold text-rose-400">
                  {kpis.averageLatenessAmongLateHours.formattedValue}
                </span>
              </div>
            </div>

            {/* Card 4: Inventory & Operational Risk */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 relative overflow-hidden group hover:border-rose-500/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Operational Alerts
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-400 font-mono">
                  {kpis.criticalAlertsCount.formattedValue}
                </span>
                <span className="text-[11px] text-slate-400">Critical open</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">High Risk Alerts:</span>
                <span className="font-semibold text-amber-400">
                  {kpis.highAlertsCount.formattedValue}
                </span>
              </div>
            </div>
          </div>

          {/* 2. NAVIGATION TABS */}
          <div className="border-b border-slate-800 flex items-center gap-6">
            <button
              onClick={() => setActiveTab('trends')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative flex items-center gap-2 ${
                activeTab === 'trends'
                  ? 'text-sky-400 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Trends & Period Comparison
            </button>
            <button
              onClick={() => setActiveTab('facilities')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative flex items-center gap-2 ${
                activeTab === 'facilities'
                  ? 'text-sky-400 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Facility & District Performance ({facilityPerformance.length})
            </button>
            <button
              onClick={() => setActiveTab('bottlenecks')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors relative flex items-center gap-2 ${
                activeTab === 'bottlenecks'
                  ? 'text-sky-400 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Bottleneck Intelligence & Recommendations ({bottlenecks.length})
            </button>
          </div>

          {/* 3. TAB CONTENT */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* PERIOD COMPARISON TABLE */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Current Metrics vs Configured Baseline
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Baseline comparisons use only values explicitly supplied to the analytics engine.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                        <th className="py-2 px-3">Metric</th>
                        <th className="py-2 px-3">Baseline</th>
                        <th className="py-2 px-3">Current</th>
                        <th className="py-2 px-3">Change</th>
                        <th className="py-2 px-3">Operational Assessment</th>
                        <th className="py-2 px-3">Management Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {periodComparisons.map((c) => (
                        <tr key={c.metricId} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                            {c.metricName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {c.previousValue.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-slate-100 font-bold">
                            {c.currentValue.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`flex items-center gap-1 font-semibold ${
                                c.direction === 'up'
                                  ? c.assessment === 'favourable'
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                  : c.direction === 'down'
                                  ? c.assessment === 'favourable'
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {c.direction === 'up' ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : c.direction === 'down' ? (
                                <TrendingDown className="w-3.5 h-3.5" />
                              ) : null}
                              {c.percentageChange !== null
                                ? `${c.percentageChange > 0 ? '+' : ''}${c.percentageChange.toFixed(1)}%`
                                : `${c.absoluteChange > 0 ? '+' : ''}${c.absoluteChange}`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-wider ${
                                c.assessment === 'favourable'
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                                  : c.assessment === 'unfavourable'
                                  ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {c.assessment}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-xs text-slate-300">
                            {c.explanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DAILY TIME SERIES SUMMARY */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Daily Activity Breakdown
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Daily dispatched volume, delivered shipments, and SLA exception counts.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold font-sans">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Dispatched</th>
                        <th className="py-2 px-3">Delivered</th>
                        <th className="py-2 px-3">On-Time</th>
                        <th className="py-2 px-3">Delayed</th>
                        <th className="py-2 px-3">SRN Exceptions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {trends.slice(0, 15).map((t) => (
                        <tr key={t.date} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-300 font-sans">{t.date}</td>
                          <td className="py-2 px-3 text-sky-400">{t.dispatched}</td>
                          <td className="py-2 px-3 text-emerald-400 font-bold">{t.delivered}</td>
                          <td className="py-2 px-3 text-emerald-300">{t.onTime}</td>
                          <td className="py-2 px-3 text-amber-400">
                            {t.delayed > 0 ? t.delayed : '-'}
                          </td>
                          <td className="py-2 px-3 text-rose-400">
                            {t.failedOrReturned > 0 ? t.failedOrReturned : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'facilities' && (
            <div className="space-y-6">
              {/* FILTERS & SEARCH */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    District:
                  </span>
                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
                  >
                    <option value="ALL">All Districts ({uniqueDistricts.length})</option>
                    {uniqueDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search facility name or district..."
                    value={searchFacility}
                    onChange={(e) => setSearchFacility(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 w-64 focus:outline-none focus:border-sky-500"
                  />
                  {(districtFilter !== 'ALL' || searchFacility !== '') && (
                    <button
                      onClick={() => {
                        setDistrictFilter('ALL');
                        setSearchFacility('');
                      }}
                      className="text-xs text-sky-400 hover:underline px-2"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* DISTRICT ROLLUP SUMMARY */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {districtPerformance.slice(0, 4).map((dp) => (
                  <div
                    key={dp.districtName}
                    className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{dp.districtName}</span>
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <div className="mt-2 text-[11px] space-y-1 font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Facilities:</span>
                        <span className="text-slate-200 font-bold">{dp.facilityCount}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Shipments:</span>
                        <span className="text-slate-200">{dp.totalShipments}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>OTD Rate:</span>
                        <span className="text-emerald-400 font-bold">
                          {dp.onTimeRatePct !== null ? `${dp.onTimeRatePct}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* FACILITY PERFORMANCE TABLE */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Facility Performance Rankings ({filteredFacilities.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Calculated from actual completed shipments, in-transit movements, and SRN return rates
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800 text-slate-400 text-[11px] font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Facility</th>
                        <th className="py-2.5 px-3">Type & District</th>
                        <th className="py-2.5 px-3 text-right">Outgoing / In</th>
                        <th className="py-2.5 px-3 text-right">OTD %</th>
                        <th className="py-2.5 px-3 text-right">Overdue</th>
                        <th className="py-2.5 px-3 text-right">Exceptions</th>
                        <th className="py-2.5 px-3 text-center">Score</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredFacilities.map((f) => (
                        <tr key={f.facilityId} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-100">
                            {f.facilityName}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-400">
                            <span className="capitalize">{f.facilityType.replace('_', ' ')}</span>
                            {f.district && ` • ${f.district}`}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {f.outboundShipmentCount} / {f.inboundMovementsCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {f.onTimeDeliveryRatePct !== null ? `${f.onTimeDeliveryRatePct}%` : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-rose-400">
                            {f.overdueCount > 0 ? f.overdueCount : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-amber-400">
                            {f.failedAttemptCount > 0 ? f.failedAttemptCount : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-bold text-slate-100">{f.performanceScore}</span>
                            <span className="text-slate-500 text-[10px]">/100</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                f.statusTag === 'optimal'
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                                  : f.statusTag === 'attention_needed'
                                  ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {f.statusTag.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <button
                              onClick={() => {
                                onSelectFacility(f.facilityId);
                                onClose();
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1 mx-auto"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>View Map</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bottlenecks' && (
            <div className="space-y-6">
              {/* BOTTLENECK INTELLIGENCE LIST */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Identified Potential Bottlenecks ({bottlenecks.length})
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Explicit rule-based bottleneck flags derived from high SRN rejection rates and aged STN gate-ins.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {bottlenecks.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              b.severity === 'critical'
                                ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {b.severity}
                          </span>
                          <span className="text-xs font-bold text-slate-100">
                            {b.entityName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            [{b.entityType}]
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {b.supportingRecords.length || b.supportingEvidenceCount} records affected
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-2">{b.metricObserved} • Baseline: {b.baselineComparison}</p>

                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                          <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
                          <span>Action: {b.suggestedAction}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (b.entityType === 'facility') {
                              onSelectFacility(b.entityId);
                              onClose();
                            }
                          }}
                          className="text-[11px] text-slate-400 hover:text-white underline"
                        >
                          Locate Entity
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* OPERATIONAL RECOMMENDATIONS */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <Info className="w-4 h-4 text-sky-400" />
                      Rule-Based Operational Recommendations ({recommendations.length})
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Evidence-backed next steps for operations managers without black-box AI fabrication.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {recommendations.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            r.priority === 'urgent'
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                              : 'bg-sky-950/80 text-sky-400 border border-sky-500/30'
                          }`}
                        >
                          {r.priority}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          Rule: {r.ruleTriggered}
                        </span>
                      </div>

                      <div className="mt-2">
                        <span className="text-xs font-semibold text-slate-400 block mb-0.5">
                          Observed Condition:
                        </span>
                        <p className="text-xs text-slate-300">{r.observedCondition}</p>
                      </div>

                      <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <span className="text-xs font-bold text-sky-400 block mb-0.5">
                          Action Recommendation:
                        </span>
                        <p className="text-xs text-slate-200">{r.concreteAction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
