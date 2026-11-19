import React from 'react';
import { Parcel } from '../../types';
import { X, Printer, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';

interface Props {
  parcel: Parcel;
  onClose: () => void;
}

export const NFTCertificateModal: React.FC<Props> = ({ parcel, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-2 sm:p-4 print:static print:block print:overflow-visible print:bg-white print:p-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="title-certificate-heading"
        className="relative my-auto max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#CBD0C8] bg-white text-[#252B28] shadow-xl print:my-0 print:max-h-none print:overflow-visible print:border-0 print:shadow-none"
      >
        {/* Top Control Bar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E8E5] bg-white px-4 py-3 sm:px-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#EBF4EF] p-1.5 text-[#245C43] border border-[#C4DFC9]">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-[#252B28]">Digital Title Record (Certificate of Occupancy)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-[#CBD0C8] bg-white hover:bg-[#F7F8F7] px-3.5 py-2 min-h-[40px] text-xs font-semibold text-[#252B28] transition-colors"
            >
              <Printer className="h-4 w-4 text-[#245C43]" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close certificate"
              className="p-2 min-w-[40px] min-h-[40px] rounded-lg border border-[#CBD0C8] text-[#4A524D] hover:text-[#252B28] hover:bg-[#F7F8F7] transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Canvas */}
        <div className="p-4 text-[#252B28] sm:p-8 print:p-0">
          <div className="relative overflow-hidden rounded-xl border-2 border-[#CBD0C8] bg-white p-5 sm:p-8 print:rounded-none print:border">
            {/* Header / Republic & State Emblem */}
            <div className="text-center relative z-10 space-y-2 pb-6 border-b border-[#E5E8E5]">
              <div className="mx-auto mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#C4DFC9] bg-[#EBF4EF] text-[#245C43]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="text-xs font-mono font-bold uppercase tracking-[0.16em] text-[#245C43]">
                ANAGU · Digital Land Record
              </div>
              <h1 id="title-certificate-heading" className="text-2xl font-bold tracking-tight text-[#252B28] sm:text-3xl">
                Certificate of Occupancy Record
              </h1>
              <p className="mx-auto max-w-lg text-sm text-[#4A524D] leading-relaxed">
                This record is an official registry reference. Confirm legal title with the relevant state land authority.
              </p>
            </div>

            {/* Title Number & Hash Ribbon */}
            <div className="my-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E8E5] bg-[#F7F8F7] p-4 text-sm">
              <div>
                <span className="text-[#4A524D] font-medium">Title Deed Ref: </span>
                <span className="font-mono font-bold text-[#252B28]">{parcel.titleNumber}</span>
              </div>
              <div>
                <span className="text-[#4A524D] font-medium">Token Standard: </span>
                <span className="font-mono font-semibold text-[#252B28]">ERC-721</span>
              </div>
              <div>
                <span className="text-[#4A524D] font-medium">Block Height: </span>
                <span className="font-mono font-bold text-[#245C43]">
                  {parcel.blockNumber ? `#${parcel.blockNumber}` : 'Not recorded'}
                </span>
              </div>
            </div>

            {/* Legal Statement */}
            <div className="mb-6 space-y-3 text-sm leading-relaxed text-[#252B28]">
              <p>
                Registered owner: <strong className="text-[#252B28]">{parcel.ownerName}</strong>. This application record serves as a digital cadastre instrument anchored to the state land registry.
              </p>
              <p>
                Parcel location: <strong>{parcel.district}, {parcel.lga}, {parcel.state}</strong>. Area: <strong>{parcel.sizeSqm.toLocaleString()} m²</strong>. Survey plan reference: <strong className="font-mono text-[#245C43]">{parcel.surveyPlanNumber || 'Not recorded'}</strong>.
              </p>
            </div>

            {/* Grid of Geodetic Coordinates & Token Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm">
              <div className="rounded-xl border border-[#E5E8E5] bg-[#F7F8F7] p-4">
                <div className="font-bold text-[#252B28] mb-3 flex items-center justify-between">
                  <span>Geodetic Beacon Coordinates (WGS-84)</span>
                  <span className="text-xs text-[#245C43] font-mono font-semibold">Survey Record</span>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  {parcel.coordinates.map((c, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-[#E5E8E5] last:border-b-0">
                      <span className="text-[#245C43] font-bold">{c.beaconNumber}</span>
                      <span className="text-[#252B28]">Lat: {c.lat.toFixed(6)}°</span>
                      <span className="text-[#252B28]">Lng: {c.lng.toFixed(6)}°</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-[#E5E8E5] bg-[#F7F8F7] p-4">
                <div className="font-bold text-[#252B28]">Digital Record References</div>
                <div>
                  <div className="text-xs text-[#4A524D] font-medium">Token Reference</div>
                  <div className="truncate font-mono text-xs text-[#252B28] font-semibold mt-0.5">{parcel.tokenHash}</div>
                </div>
                <div>
                  <div className="text-xs text-[#4A524D] font-medium">Document Reference (IPFS CID)</div>
                  <div className="truncate font-mono text-xs text-[#252B28] font-semibold mt-0.5">{parcel.ipfsDocumentHash || 'Not recorded'}</div>
                </div>
                <div>
                  <div className="text-xs text-[#4A524D] font-medium">Designated Land Use</div>
                  <div className="font-semibold text-[#252B28] text-sm mt-0.5">{parcel.landUse}</div>
                </div>
              </div>
            </div>

            {/* Bottom Verification Strip */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E8E5] pt-4 text-xs text-[#4A524D]">
              <div className="flex items-center gap-2 font-medium">
                <QrCode className="h-5 w-5 text-[#245C43]" />
                <span>Verify this title token on the ANAGU public verification page.</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-[#164E35] bg-[#EBF4EF] border border-[#C4DFC9] px-2.5 py-1 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-[#245C43]" />
                <span>Record status: {parcel.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
