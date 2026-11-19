import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { SurveyJob } from '../../types';
import {
  Compass,
  CheckCircle2,
  Clock,
  Layers,
  FileCheck,
  MapPin,
  AlertCircle,
  Plus
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const SurveyorPortal: React.FC = () => {
  const { currentUser, surveyJobs, submitSurveyReport, addNotification } = useApp();
  const [selectedJobId, setSelectedJobId] = useState<string>(surveyJobs[0]?.id || '');

  const selectedJob = surveyJobs.find(j => j.id === selectedJobId) || surveyJobs[0];

  const [planRef, setPlanRef] = useState('');
  const [beaconsCount, setBeaconsCount] = useState(4);
  const [fieldNotes, setFieldNotes] = useState('');
  const [isLodging, setIsLodging] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setIsLodging(true);
    setTimeout(() => {
      submitSurveyReport(selectedJob.id, fieldNotes, beaconsCount, planRef);
      setIsLodging(false);
      addNotification({
        title: 'Cadastral Plan Lodged',
        message: `Cadastral Survey Plan ${planRef} submitted and registered on-chain!`,
        type: 'success'
      });
    }, 600);
  };

  if (!selectedJob) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-xl bg-white border border-[#E5E8E5] p-8 text-center text-sm text-[#4A524D]">
          No survey jobs are assigned to this account.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[#252B28]">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E8E5]">
        <div>
          <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#245C43]" />
            Licensed Cadastral Surveyor Portal
          </h1>
          <p className="text-sm text-[#4A524D] mt-1 leading-relaxed">
            Logged in as <strong className="text-[#252B28]">{currentUser.name}</strong> (SURCON License: {currentUser.licenseNumber || 'SURV-REG-2014-0492'})
          </p>
        </div>

        <Link
          to="/portal/gis"
          className="px-4 py-2.5 rounded-lg bg-[#245C43] text-white text-xs font-semibold hover:bg-[#1B4733] transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Layers className="w-4 h-4" />
          <span>Launch GIS Spatial Plotter</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Assigned Field Jobs</div>
          <div className="text-2xl font-bold font-mono text-[#252B28] tabular-nums">{surveyJobs.length}</div>
          <div className="text-xs text-[#4A524D]">Active geodetic requisitions</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Plans Approved &amp; Lodged</div>
          <div className="text-2xl font-bold font-mono text-[#245C43] tabular-nums">
            {surveyJobs.filter(j => j.status === 'approved').length}
          </div>
          <div className="text-xs text-[#245C43] font-medium">Zero boundary overlaps detected</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Pending Field Visits</div>
          <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {surveyJobs.filter(j => j.status === 'pending' || j.status === 'in_progress').length}
          </div>
          <div className="text-xs text-amber-800">Pillar beacon establishment due</div>
        </div>
      </div>

      {/* Main Grid: Job Queue & Lodgement Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Queue */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase text-[#4A524D] font-semibold">Survey Job Queue</div>
          {surveyJobs.map(job => (
            <div
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedJob?.id === job.id
                  ? 'bg-[#F7F8F7] border-[#245C43] shadow-xs ring-1 ring-[#245C43]'
                  : 'bg-white border-[#E5E8E5] hover:bg-[#F7F8F7]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-[#252B28] text-xs">{job.jobCode}</span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded font-semibold ${
                    job.status === 'approved'
                      ? 'bg-[#245C43]/10 text-[#245C43]'
                      : job.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {job.status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-[#252B28] font-semibold">{job.applicantName}</div>
              <div className="text-xs text-[#4A524D] flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#245C43]" />
                <span className="truncate">{job.location}</span>
              </div>
              <div className="text-xs text-[#4A524D] font-mono mt-1">
                Est. Area: {job.estimatedAreaSqm.toLocaleString()} m² · Sched: {job.scheduledDate}
              </div>
            </div>
          ))}
        </div>

        {/* Plan Lodgement & Field Notes Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E8E5] p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E8E5]">
            <div>
              <div className="text-xs text-[#4A524D]">Active Job Code</div>
              <h2 className="text-xl font-bold font-mono text-[#252B28]">{selectedJob.jobCode}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#4A524D]">Target Area</span>
              <div className="text-sm font-mono font-bold text-[#245C43]">
                {selectedJob.estimatedAreaSqm.toLocaleString()} m² ({(selectedJob.estimatedAreaSqm / 10000).toFixed(3)} Ha)
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[#252B28] block mb-1 font-semibold">Cadastral Survey Plan Number</label>
                <input
                  type="text"
                  value={planRef}
                  onChange={e => setPlanRef(e.target.value)}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
                  placeholder="e.g., AN/SURV/2026/089"
                  required
                />
              </div>

              <div>
                <label className="text-[#252B28] block mb-1 font-semibold">Number of Boundary Concrete Beacons</label>
                <input
                  type="number"
                  value={beaconsCount}
                  onChange={e => setBeaconsCount(Number(e.target.value))}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[#252B28] block mb-1 font-semibold">Surveyor Field Reconnaissance Notes &amp; Invariants</label>
              <textarea
                value={fieldNotes}
                onChange={e => setFieldNotes(e.target.value)}
                rows={4}
                className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] font-medium focus:border-[#245C43] focus:outline-none"
                placeholder="Record monument conditions, pillar coordinates, and adjoining landowner consents..."
                required
              />
            </div>

            <div className="p-4 bg-[#F7F8F7] rounded-lg border border-[#E5E8E5] text-xs text-[#252B28] space-y-1">
              <div className="text-[#245C43] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pre-Lodgement Topological Check Passed</span>
              </div>
              <p className="text-xs text-[#4A524D]">
                Proposed polygon exhibits 100% boundary closure and zero collisions with adjoining titles on the state master cadastre.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLodging}
                className="px-6 py-2.5 rounded-lg bg-[#245C43] text-white font-semibold text-xs tracking-wider hover:bg-[#1B4733] transition-colors flex items-center gap-2"
              >
                {isLodging ? (
                  <span>Lodging on Ledger...</span>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Lodge &amp; Sign Cadastral Plan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
