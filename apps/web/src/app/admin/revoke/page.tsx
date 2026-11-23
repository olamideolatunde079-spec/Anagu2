"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { titlesApi } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const schema = z.object({
  tokenId:            z.string().min(1, "Enter a token ID"),
  ground:             z.enum(["0", "1"]),
  governorPrivateKey: z.string().min(64, "Enter the Governor wallet private key (64+ hex chars)"),
});
type FormData = z.infer<typeof schema>;

export default function AdminRevokePage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ground: "0" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await titlesApi.revoke(
        data.tokenId,
        parseInt(data.ground) as 0 | 1,
        data.governorPrivateKey,
      );
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Revocation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statutory Revocation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Governor-role action only. Basis: Nigeria Land Use Act (1978), Section 28.
            The revocation is recorded as a distinct, immutable on-chain event.
          </p>
        </div>

        {/* Legal notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm space-y-2">
          <p className="font-semibold">⚖️ Legal grounds for revocation (LUA 1978, s.28):</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Ground 0</strong> — Overriding Public Interest</li>
            <li><strong>Ground 1</strong> — Breach of a Statutory Condition</li>
          </ul>
          <p className="text-xs text-amber-700 mt-2">
            A judicial dispute-resolution mechanism does NOT satisfy this requirement,
            even if it results in a title change. This must be a distinct executive act.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Token ID (ERC-721)</label>
              <input {...register("tokenId")} className="input-field" placeholder="1" />
              {errors.tokenId && <p className="text-red-500 text-xs mt-1">{errors.tokenId.message}</p>}
            </div>

            <div>
              <label className="label">Revocation Ground</label>
              <select {...register("ground")} className="input-field">
                <option value="0">0 — Overriding Public Interest</option>
                <option value="1">1 — Breach of Statutory Condition</option>
              </select>
            </div>

            <div>
              <label className="label">Governor Wallet Private Key</label>
              <input
                {...register("governorPrivateKey")}
                type="password"
                className="input-field font-mono"
                placeholder="0x… (must hold GOVERNOR_ROLE on LandTitleNFT contract)"
              />
              {errors.governorPrivateKey && (
                <p className="text-red-500 text-xs mt-1">{errors.governorPrivateKey.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                This key is used server-side only and never stored.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                ❌ {error}
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm space-y-1">
                <p className="font-semibold">✓ Revocation recorded on blockchain</p>
                <p>Tx Hash: <span className="font-mono text-xs break-all">{result.txHash}</span></p>
                <p>Block: {result.blockNumber}</p>
                <p>Gas used: {result.gasUsed}</p>
                <p>Confirmation time: {result.confirmationMs}ms</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-danger w-full flex items-center justify-center gap-2 py-3"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? "Revoking…" : "⚠️ Revoke Land Title"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
