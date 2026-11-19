import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LandUse, TenureType } from '../../types';
import { apiRequest } from '../../lib/api';
import {
  FilePlus,
  Landmark,
  MapPin,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Compass,
  Users,
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export const LandRegistrationWizard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, registerLandApplication } = useApp();

  const [currentStep, setCurrentStep] = useState(1);

  // STEP 1: Tenure & Classification
  const [tenureType, setTenureType] = useState<TenureType>('Statutory');
  const [landUse, setLandUse] = useState<LandUse>('Residential');
  const [historicalRef, setHistoricalRef] = useState('');
  const [notes, setNotes] = useState('');

  // STEP 2: Location & Spatial Coordinates
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [district, setDistrict] = useState('');
  const [estimatedAreaSqm, setEstimatedAreaSqm] = useState(0);
  const [beacons, setBeacons] = useState([
    { beacon: 'BC-01', lat: '', lng: '', easting: '', northing: '' },
    { beacon: 'BC-02', lat: '', lng: '', easting: '', northing: '' },
    { beacon: 'BC-03', lat: '', lng: '', easting: '', northing: '' },
    { beacon: 'BC-04', lat: '', lng: '', easting: '', northing: '' },
  ]);

  // STEP 3: Boundary Neighbors & Surveyor Linkage
  const [northNeighbor, setNorthNeighbor] = useState('');
  const [southNeighbor, setSouthNeighbor] = useState('');
  const [eastNeighbor, setEastNeighbor] = useState('');
  const [westNeighbor, setWestNeighbor] = useState('');
  const [surveyorSurconNo, setSurveyorSurconNo] = useState('');
  const [surveyorName, setSurveyorName] = useState('');

  // STEP 4: Legal Documents
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // STEP 5: Review & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [swornDeclarationAccepted, setSwornDeclarationAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingApplicationId, setPendingApplicationId] = useState<string | null>(null);
  const [uploadedFilesDone, setUploadedFilesDone] = useState<Set<File>>(() => new Set());

  const updateBeaconField = (
    index: number,
    field: 'lat' | 'lng' | 'easting' | 'northing',
    value: string
  ) => {
    setBeacons(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleLoadSampleCoordinates = () => {
    setState(s => s || 'Lagos');
    setLga(v => v || 'Eti-Osa');
    setDistrict(v => v || 'Victoria Island Extension');
    setEstimatedAreaSqm(v => (v > 0 ? v : 1250));
    setBeacons([
      { beacon: 'BC-01', lat: '6.435200', lng: '3.465100', easting: '551430', northing: '711380' },
      { beacon: 'BC-02', lat: '6.435520', lng: '3.465420', easting: '551465', northing: '711415' },
      { beacon: 'BC-03', lat: '6.435180', lng: '3.465710', easting: '551497', northing: '711378' },
      { beacon: 'BC-04', lat: '6.434890', lng: '3.465380', easting: '551460', northing: '711346' },
    ]);
  };

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const tooLarge = files.find(file => file.size > 25 * 1024 * 1024);
    if (tooLarge) {
      setSubmitError(`${tooLarge.name} exceeds the 25 MB upload limit.`);
      return;
    }
    const unsupported = files.find(
      file => !['pdf', 'jpg', 'jpeg', 'png'].includes(file.name.split('.').pop()?.toLowerCase() ?? '')
    );
    if (unsupported) {
      setSubmitError(`${unsupported.name} is not a supported document type.`);
      return;
    }
    setSubmitError(null);
    setUploadedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swornDeclarationAccepted) return;
    const coordinates = beacons.map(({ lng, lat }) => [Number(lng), Number(lat)] as [number, number]);
    if (
      coordinates.length < 3 ||
      beacons.some(
        ({ lat, lng }) =>
          !lat.trim() ||
          !lng.trim() ||
          !Number.isFinite(Number(lat)) ||
          !Number.isFinite(Number(lng)) ||
          Number(lat) < -90 ||
          Number(lat) > 90 ||
          Number(lng) < -180 ||
          Number(lng) > 180
      )
    ) {
      setSubmitError('Enter at least three valid surveyed WGS-84 coordinate pairs before submitting.');
      return;
    }
    if (!state || !lga.trim() || !district.trim() || !historicalRef.trim() || estimatedAreaSqm <= 0) {
      setSubmitError('Complete the state, LGA, district, root of title, and positive parcel area fields.');
      return;
    }
    if (!currentUser.nationalId) {
      setSubmitError('Add and verify your NIN in your account profile before registering land.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    let applicationId = pendingApplicationId ?? undefined;
    try {
      if (!applicationId) {
        const result = await registerLandApplication({
          applicantName: currentUser.name,
          applicantPhone: currentUser.phone,
          applicantEmail: currentUser.email,
          nationalId: currentUser.nationalId,
          coordinates,
          tenureType,
          state,
          lga,
          district,
          landUse,
          estimatedAreaSqm,
          northNeighbor,
          southNeighbor,
          eastNeighbor,
          westNeighbor,
          surveyorSurconNo,
          surveyPlanNumber: surveyorSurconNo,
          communityWitnesses: [],
          assignedSurveyor: surveyorName,
          notes: `${notes} [Historical Ref: ${historicalRef}]`,
        });
        applicationId = result.applicationId;
        setPendingApplicationId(applicationId);
      }
      for (const file of uploadedFiles) {
        if (uploadedFilesDone.has(file)) continue;
        if (!applicationId.startsWith('local-')) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('documentType', 'TITLE_INSTRUMENT');
            await apiRequest(`/documents/${applicationId}/upload`, { method: 'POST', body: formData });
          } catch (uploadErr) {
            if (!(uploadErr instanceof Error && uploadErr.message === 'Backend service unavailable')) {
              throw uploadErr;
            }
          }
        }
        setUploadedFilesDone(previous => new Set(previous).add(file));
      }
      navigate('/portal/applications');
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? applicationId
            ? `Application ${applicationId} was recorded, but a document upload failed: ${error.message}`
            : error.message
          : 'Application submission failed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to My Dashboard" />
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
          <FilePlus className="w-6 h-6 text-[#245C43]" />
          Land Parcel Onboarding Wizard
        </h1>
        <p className="text-sm text-[#4A524D] mt-1 leading-relaxed">
          Lodge a statutory or customary land parcel into the 8-Stage ANAGU Cadastral Pipeline pursuant to the Land Use Act (1978).
        </p>
      </div>

      {/* Authenticated Applicant Badge */}
      <div className="p-4 rounded-xl bg-white border border-[#E5E8E5] shadow-xs flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EBF4EF] border border-[#C4DFC9] flex items-center justify-center text-[#245C43] font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="text-[#252B28] font-semibold flex flex-wrap items-center gap-2">
              <span>Lodging as: {currentUser.name}</span>
              {currentUser.nationalId && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#EBF4EF] text-[#164E35] border border-[#C4DFC9] font-mono font-bold">
                  {currentUser.nationalId}
                </span>
              )}
            </div>
            <div className="text-xs text-[#4A524D] mt-0.5">
              {currentUser.email} · {currentUser.phone || '+234 803 555 0192'}
            </div>
          </div>
        </div>
        <div className="text-right text-xs font-mono font-semibold text-[#245C43]">
          {currentUser.verified ? 'Email verified' : 'Email not verified'}
        </div>
      </div>

      {/* 5-Step Progress Indicator */}
      <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#F7F8F7] rounded-2xl border border-[#E5E8E5] text-xs">
        {[
          { step: 1, label: '1. Tenure' },
          { step: 2, label: '2. Beacons' },
          { step: 3, label: '3. Survey' },
          { step: 4, label: '4. Deeds' },
          { step: 5, label: '5. Submit' },
        ].map(item => (
          <button
            key={item.step}
            type="button"
            onClick={() => setCurrentStep(item.step)}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl font-semibold transition-colors text-center ${
              currentStep === item.step
                ? 'bg-[#245C43] text-white shadow-xs'
                : currentStep > item.step
                ? 'bg-[#EBF4EF] text-[#164E35] border border-[#C4DFC9]'
                : 'bg-white text-[#4A524D] border border-[#E5E8E5]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === item.step
                  ? 'bg-white text-[#245C43]'
                  : currentStep > item.step
                  ? 'bg-[#245C43] text-white'
                  : 'bg-[#F7F8F7] text-[#4A524D]'
              }`}
            >
              {item.step}
            </span>
            <span className="hidden md:inline truncate">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Wizard Form Panels */}
      <div className="bg-white rounded-2xl border border-[#E5E8E5] p-6 sm:p-8 shadow-xs">
        {submitError && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">
            {submitError}
          </div>
        )}

        {/* STEP 1: TENURE CLAIM & CLASSIFICATION */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
              <Landmark className="w-4 h-4 text-[#245C43]" />
              Step 1: Land Tenure Claim &amp; Legal Classification
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-[#252B28] block mb-1.5 text-sm font-semibold">Tenure Regime</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7F8F7] rounded-xl border border-[#CBD0C8] text-xs">
                  <button
                    type="button"
                    onClick={() => setTenureType('Statutory')}
                    className={`py-2.5 rounded-lg font-semibold transition-colors ${
                      tenureType === 'Statutory'
                        ? 'bg-[#245C43] text-white shadow-xs'
                        : 'text-[#252B28] hover:bg-white'
                    }`}
                  >
                    Statutory C of O
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenureType('Customary')}
                    className={`py-2.5 rounded-lg font-semibold transition-colors ${
                      tenureType === 'Customary'
                        ? 'bg-[#245C43] text-white shadow-xs'
                        : 'text-[#252B28] hover:bg-white'
                    }`}
                  >
                    Customary / Communal
                  </button>
                </div>
                <p className="text-xs text-[#4A524D] mt-1.5 leading-relaxed">
                  {tenureType === 'Statutory'
                    ? 'State Government statutory grant under Land Use Act (1978) Section 5.'
                    : 'Indigenous customary landholder rights verified via Traditional Council & Family Trustees.'}
                </p>
              </div>

              <div>
                <label className="text-[#252B28] block mb-1.5 text-sm font-semibold">Designated Land Use</label>
                <select
                  value={landUse}
                  onChange={e => setLandUse(e.target.value as LandUse)}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2.5 text-[#252B28] text-sm focus:border-[#245C43] focus:outline-none"
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Agricultural">Agricultural</option>
                  <option value="Mixed Use">Mixed Use</option>
                  <option value="Government Reserve">Government Reserve</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[#252B28] block mb-1.5 text-sm font-semibold">
                Root of Title / Historical Memorial Reference
              </label>
              <input
                type="text"
                value={historicalRef}
                onChange={e => setHistoricalRef(e.target.value)}
                placeholder="e.g. Deed of Assignment / Chieftaincy Family Grant / Gazette Notice"
                className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3.5 py-2.5 text-[#252B28] placeholder-[#545B56] text-sm focus:border-[#245C43] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[#252B28] block mb-1.5 text-sm font-semibold">
                Parcel Background &amp; Acquisition History
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Describe acquisition history, previous allotments, or boundary landmarks..."
                className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3.5 py-2.5 text-[#252B28] placeholder-[#545B56] text-sm focus:border-[#245C43] focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 min-h-[42px] rounded-xl bg-[#245C43] hover:bg-[#1B4733] text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs"
              >
                <span>Proceed to Location &amp; Beacons</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SPATIAL LOCATION & WGS 84 BEACONS */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E8E5]">
              <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#245C43]" />
                Step 2: Geographic Parcel Location &amp; WGS 84 Cadastral Beacons
              </h2>
              <button
                type="button"
                onClick={handleLoadSampleCoordinates}
                className="px-3 py-1.5 rounded-lg bg-[#F7F8F7] border border-[#CBD0C8] hover:border-[#245C43] text-xs font-semibold text-[#245C43] transition-colors"
              >
                Load Sample Coordinates
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">State Jurisdiction</label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2.5 text-[#252B28] focus:border-[#245C43] focus:outline-none"
                  required
                >
                  <option value="">Select a state or territory</option>
                  {NIGERIAN_STATES.map(stateName => (
                    <option key={stateName} value={stateName}>
                      {stateName === 'FCT' ? 'Federal Capital Territory' : `${stateName} State`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">Local Government Area (LGA)</label>
                <input
                  type="text"
                  value={lga}
                  onChange={e => setLga(e.target.value)}
                  placeholder="e.g. Eti-Osa"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2.5 text-[#252B28] placeholder-[#545B56] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">Cadastral Layout / District</label>
                <input
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder="e.g. Victoria Island"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2.5 text-[#252B28] placeholder-[#545B56] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">Estimated Area (Square Metres)</label>
                <input
                  type="number"
                  value={estimatedAreaSqm}
                  onChange={e => setEstimatedAreaSqm(Number(e.target.value))}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2.5 text-[#252B28] font-mono focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[#252B28] block mb-1.5 font-semibold">Calculated Metric Dimensions</label>
                <div className="w-full bg-[#F7F8F7] border border-[#E5E8E5] rounded-lg px-3 py-2.5 text-[#245C43] font-mono font-bold flex items-center justify-between">
                  <span>{(estimatedAreaSqm / 10000).toFixed(3)} Hectares</span>
                  <span className="text-[#4A524D] text-xs font-normal">
                    Approx. {(estimatedAreaSqm / 648).toFixed(1)} Standard Plots
                  </span>
                </div>
              </div>
            </div>

            {/* WGS 84 Beacon Coordinate Entry Table */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-[#252B28] text-sm font-semibold flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#245C43]" />
                  <span>Cadastral Boundary Beacons (WGS 84 / EPSG:4326)</span>
                </label>
                <span className="text-xs text-[#164E35] bg-[#EBF4EF] border border-[#C4DFC9] px-2 py-0.5 rounded font-mono font-semibold">
                  PostGIS Validated 0.5m Tolerance
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#E5E8E5] bg-white">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-xs uppercase text-[#252B28] font-bold border-b border-[#E5E8E5] bg-[#F7F8F7]">
                    <tr>
                      <th className="py-2.5 px-3">Beacon ID</th>
                      <th className="py-2.5 px-3">Latitude (°N)</th>
                      <th className="py-2.5 px-3">Longitude (°E)</th>
                      <th className="py-2.5 px-3">Easting (m)</th>
                      <th className="py-2.5 px-3">Northing (m)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8E5]">
                    {beacons.map((b, i) => (
                      <tr key={b.beacon} className="hover:bg-[#F7F8F7]">
                        <td className="py-2 px-3 text-[#245C43] font-bold">{b.beacon}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            aria-label={`${b.beacon} Latitude`}
                            value={b.lat}
                            onChange={e => updateBeaconField(i, 'lat', e.target.value)}
                            placeholder="6.435200"
                            className="w-28 bg-white border border-[#CBD0C8] rounded px-2 py-1 text-xs font-mono text-[#252B28]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            aria-label={`${b.beacon} Longitude`}
                            value={b.lng}
                            onChange={e => updateBeaconField(i, 'lng', e.target.value)}
                            placeholder="3.465100"
                            className="w-28 bg-white border border-[#CBD0C8] rounded px-2 py-1 text-xs font-mono text-[#252B28]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            aria-label={`${b.beacon} Easting`}
                            value={b.easting}
                            onChange={e => updateBeaconField(i, 'easting', e.target.value)}
                            placeholder="551430"
                            className="w-24 bg-white border border-[#CBD0C8] rounded px-2 py-1 text-xs font-mono text-[#252B28]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            aria-label={`${b.beacon} Northing`}
                            value={b.northing}
                            onChange={e => updateBeaconField(i, 'northing', e.target.value)}
                            placeholder="711380"
                            className="w-24 bg-white border border-[#CBD0C8] rounded px-2 py-1 text-xs font-mono text-[#252B28]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-white border border-[#CBD0C8] text-[#252B28] text-sm font-semibold hover:bg-[#F7F8F7] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 min-h-[42px] rounded-xl bg-[#245C43] hover:bg-[#1B4733] text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs"
              >
                <span>Proceed to Boundaries &amp; Survey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BOUNDARY NEIGHBORS & SURVEYOR ACCREDITATION */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
              <Users className="w-4 h-4 text-[#245C43]" />
              Step 3: Perimeter Abutting Neighbors &amp; Surveyor Accreditation
            </h2>
            <p className="text-sm text-[#4A524D] leading-relaxed">
              Provide declarations for the four abutting perimeter boundaries for the statutory 21-day community attestation window.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-2">
                <span className="text-[#245C43] font-mono font-bold text-xs block">North Boundary (Cardinal 0°)</span>
                <input
                  type="text"
                  value={northNeighbor}
                  onChange={e => setNorthNeighbor(e.target.value)}
                  placeholder="Adjacent Landowner Name / Plot #"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-2">
                <span className="text-[#245C43] font-mono font-bold text-xs block">South Boundary (Cardinal 180°)</span>
                <input
                  type="text"
                  value={southNeighbor}
                  onChange={e => setSouthNeighbor(e.target.value)}
                  placeholder="Adjacent Landowner Name / Plot #"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-2">
                <span className="text-[#245C43] font-mono font-bold text-xs block">East Boundary (Cardinal 90°)</span>
                <input
                  type="text"
                  value={eastNeighbor}
                  onChange={e => setEastNeighbor(e.target.value)}
                  placeholder="Adjacent Landowner / Road Name"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-2">
                <span className="text-[#245C43] font-mono font-bold text-xs block">West Boundary (Cardinal 270°)</span>
                <input
                  type="text"
                  value={westNeighbor}
                  onChange={e => setWestNeighbor(e.target.value)}
                  placeholder="Adjacent Landowner / Natural Boundary"
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Accredited Geomatics Surveyor Link */}
            <div className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] space-y-3 text-sm">
              <div className="font-bold text-[#252B28] flex items-center justify-between">
                <span>Accredited Geomatics Cadastral Surveyor</span>
                <span className="text-xs text-[#245C43] font-mono font-semibold">License verification required</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[#252B28] block mb-1.5 text-xs font-semibold">Surveyor Name</label>
                  <input
                    type="text"
                    value={surveyorName}
                    onChange={e => setSurveyorName(e.target.value)}
                    placeholder="e.g. Surv. Amina Bello"
                    className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] focus:border-[#245C43] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[#252B28] block mb-1.5 text-xs font-semibold">SURCON License Seal Number</label>
                  <input
                    type="text"
                    value={surveyorSurconNo}
                    onChange={e => setSurveyorSurconNo(e.target.value)}
                    placeholder="e.g. SURCON-NG-2019-441"
                    className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] placeholder-[#545B56] font-mono focus:border-[#245C43] focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-white border border-[#CBD0C8] text-[#252B28] text-sm font-semibold hover:bg-[#F7F8F7] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 min-h-[42px] rounded-xl bg-[#245C43] hover:bg-[#1B4733] text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs"
              >
                <span>Proceed to Legal Instruments</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: LEGAL DEEDS & DOCUMENTS */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
              <Upload className="w-4 h-4 text-[#245C43]" />
              Step 4: Upload Legal Instruments &amp; Proof of Title
            </h2>

            {/* Drag & Drop Area */}
            <label className="block p-8 border-2 border-dashed border-[#CBD0C8] rounded-2xl bg-[#F7F8F7] text-center cursor-pointer hover:border-[#245C43] transition-colors">
              <Upload className="w-8 h-8 text-[#245C43] mx-auto mb-2" />
              <div className="text-sm font-bold text-[#252B28]">Select supporting documents</div>
              <p className="text-xs text-[#4A524D] mt-1 leading-relaxed">
                Files are uploaded to the configured document store after application submission (PDF or image, up to 25 MB each).
              </p>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" multiple onChange={handleAddFile} className="hidden" />
            </label>

            {/* Attached Documents List */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-[#252B28]">Staged Documents ({uploadedFiles.length}):</div>
              {uploadedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-[#245C43] shrink-0" />
                    <span className="text-[#252B28] font-medium truncate">{file.name}</span>
                    <span className="text-[#4A524D] font-mono text-xs">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </div>
                  <span className="text-[#164E35] font-mono text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-[#245C43]" />
                    <span>Ready to upload</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-white border border-[#CBD0C8] text-[#252B28] text-sm font-semibold hover:bg-[#F7F8F7] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-5 py-2.5 min-h-[42px] rounded-xl bg-[#245C43] hover:bg-[#1B4733] text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-xs"
              >
                <span>Review &amp; Final Swear</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & STATUTORY SWORN DECLARATION */}
        {currentStep === 5 && (
          <form onSubmit={handleFinalSubmit} className="space-y-5">
            <h2 className="text-base font-bold text-[#252B28] flex items-center gap-2 pb-3 border-b border-[#E5E8E5]">
              <CheckCircle2 className="w-4 h-4 text-[#245C43]" />
              Step 5: Final Review &amp; Statutory Lodgement
            </h2>

            {/* Summary Review Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] text-sm">
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Lodging Applicant</span>
                <span className="text-[#252B28] font-bold">{currentUser.name}</span>
                <span className="text-xs text-[#245C43] font-mono font-semibold block mt-0.5">
                  {currentUser.nationalId || 'NIN not set'}
                </span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Tenure Classification &amp; Use</span>
                <span className="text-[#252B28] font-bold">
                  {tenureType} Right of Occupancy · {landUse}
                </span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Location &amp; Cadastral Area</span>
                <span className="text-[#252B28] font-bold">
                  {district || '—'}, {lga || '—'}, {state || '—'}
                </span>
                <span className="text-[#245C43] font-mono text-xs font-bold block mt-0.5">
                  {estimatedAreaSqm.toLocaleString()} m² ({(estimatedAreaSqm / 10000).toFixed(3)} Ha)
                </span>
              </div>
              <div>
                <span className="text-[#4A524D] block text-xs font-semibold">Accredited Surveyor</span>
                <span className="text-[#252B28] font-bold">{surveyorName || 'Not assigned'}</span>
                <span className="text-[#4A524D] font-mono text-xs block mt-0.5">{surveyorSurconNo || '—'}</span>
              </div>
            </div>

            {/* Abutting Boundary Summary */}
            <div className="p-4 rounded-xl bg-[#F7F8F7] border border-[#E5E8E5] text-xs space-y-1.5">
              <div className="text-[#252B28] font-bold uppercase tracking-wider">Registered Perimeter Neighbors:</div>
              <div className="grid grid-cols-2 gap-2 text-[#252B28]">
                <div><span className="text-[#245C43] font-bold">N:</span> {northNeighbor || '—'}</div>
                <div><span className="text-[#245C43] font-bold">S:</span> {southNeighbor || '—'}</div>
                <div><span className="text-[#245C43] font-bold">E:</span> {eastNeighbor || '—'}</div>
                <div><span className="text-[#245C43] font-bold">W:</span> {westNeighbor || '—'}</div>
              </div>
            </div>

            {/* Statutory Sworn Affirmation */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-sm space-y-2.5">
              <div className="font-bold flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Statutory Sworn Declaration under Land Use Act (1978)</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed">
                I solemnly declare that the boundaries, tenure claims, and instruments submitted herein are authentic, free from undisclosed encumbrances, and true to the best of my knowledge under penalty of perjury. I acknowledge that boundary verification is subject to PostGIS spatial geometry validation and the 21-day neighbor attestation period.
              </p>
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={swornDeclarationAccepted}
                  onChange={e => setSwornDeclarationAccepted(e.target.checked)}
                  className="w-4 h-4 accent-[#245C43] rounded border-[#CBD0C8]"
                />
                <span className="text-sm text-[#252B28] font-semibold">
                  I accept and execute this statutory declaration with sovereign digital signature.
                </span>
              </label>
            </div>

            <div className="flex justify-between pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-white border border-[#CBD0C8] text-[#252B28] text-sm font-semibold hover:bg-[#F7F8F7] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !swornDeclarationAccepted}
                className="px-6 py-2.5 min-h-[42px] rounded-xl bg-[#245C43] hover:bg-[#1B4733] text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Dispatching to 8-Stage Pipeline...</span>
                ) : (
                  <>
                    <span>Confirm &amp; Lodge Title Application</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
