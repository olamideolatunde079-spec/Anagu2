import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F7] text-[#252B28] py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <BackButton to="/" label="Back to Overview" />
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#252B28]">Contact the Cadastre Bureau</h1>
          <p className="text-sm text-[#4A524D] max-w-xl mx-auto">
            Inquiries regarding state deployment, institutional integration, or survey council onboarding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-2">
            <Mail className="w-5 h-5 text-[#245C43]" />
            <h3 className="text-sm font-bold text-[#252B28]">Email Inquiries</h3>
            <p className="text-xs text-[#4A524D] font-mono">cadastre@anagu.gov.ng</p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-2">
            <Phone className="w-5 h-5 text-emerald-700" />
            <h3 className="text-sm font-bold text-[#252B28]">Registry Hotline</h3>
            <p className="text-xs text-[#4A524D] font-mono">+234 (0) 1 800-ANAGU</p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-[#E5E8E5] shadow-sm space-y-2">
            <MapPin className="w-5 h-5 text-amber-700" />
            <h3 className="text-sm font-bold text-[#252B28]">Central Cadastre Office</h3>
            <p className="text-xs text-[#4A524D]">Central Business District, FCT Abuja</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="p-6 sm:p-8 rounded-xl bg-white border border-[#E5E8E5] shadow-sm">
          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-700 mx-auto" />
              <h3 className="text-xl font-bold text-[#252B28]">Message Lodged Successfully</h3>
              <p className="text-xs text-[#4A524D]">
                A land registry desk officer will review your enquiry and respond to {email} within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[#252B28] block mb-1 font-medium">Full Legal Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] focus:border-[#245C43] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[#252B28] block mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] focus:border-[#245C43] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[#252B28] block mb-1 font-medium">Organization / Agency / Surveyor Firm</label>
                <input
                  type="text"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] focus:border-[#245C43] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#252B28] block mb-1 font-medium">Cadastral Enquiry Details</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-[#CBD0C8] rounded-lg px-3 py-2 text-[#252B28] focus:border-[#245C43] focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-[#245C43] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#1B4733] flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Enquiry</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
