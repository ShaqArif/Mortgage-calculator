import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Lock, Unlock } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

const ResultsSummary = ({ results, finalPosition, onPositionChange }) => {

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const isSurplus = results.shortfallOrSurplus >= 0;

    return (
        <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-6 text-white flex flex-col gap-6 relative overflow-hidden ring-1 ring-white/5">

            <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                    Financial Breakdown
                </h3>
                <p className="text-slate-400 text-sm mt-1">Summary of your move</p>
            </div>

            {/* Sale Breakdown */}
            <div className="space-y-3 bg-black/20 p-5 rounded-2xl border border-white/5 shadow-inner">
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Selling Side</h4>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Gross Proceeds</span>
                    <span className="font-medium">{formatCurrency(results.grossSaleProceeds)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-rose-400">
                    <span>Sale Costs</span>
                    <span>-{formatCurrency(results.saleCosts)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-rose-400">
                    <span>Mortgage Clearance</span>
                    <span>-{formatCurrency(results.mortgageClearance)}</span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-center font-semibold text-emerald-400">
                    <span>Net Cash From Sale</span>
                    <span>{formatCurrency(results.netCashFromSale)}</span>
                </div>
            </div>

            {/* Purchase Breakdown */}
            <div className="space-y-3 bg-black/20 p-5 rounded-2xl border border-white/5 shadow-inner">
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">Buying Side</h4>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">New House Price</span>
                    <span className="font-medium">{formatCurrency(results.totalCashRequired - results.purchaseCosts)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-rose-400">
                    <span>Purchase Costs & Taxes</span>
                    <span>+{formatCurrency(results.purchaseCosts)}</span>
                </div>
                <div className="pt-3 border-t border-white/10 flex justify-between items-center font-semibold text-blue-400">
                    <span>Total Cash Required</span>
                    <span>{formatCurrency(results.totalCashRequired)}</span>
                </div>
            </div>

            {/* Final Calculated Position */}
            <div className={`mt-2 p-5 rounded-2xl border shadow-lg ${isSurplus ? 'bg-emerald-500/10 border-emerald-500/20 ring-1 ring-emerald-500/10' : 'bg-rose-500/10 border-rose-500/20 ring-1 ring-rose-500/10'}`}>
                <div className="flex items-center gap-2 mb-2">
                    {isSurplus ? <TrendingUp className="text-emerald-400" size={20} /> : <TrendingDown className="text-rose-400" size={20} />}
                    <h4 className="text-sm font-bold text-slate-200">
                        Calculated Position
                    </h4>
                </div>
                <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className={`text-3xl font-bold tracking-tight ${isSurplus ? 'text-emerald-400' : 'text-rose-400'} drop-shadow-sm`}>
                            {formatCurrency(Math.abs(results.shortfallOrSurplus))}
                        </span>
                        <span className="text-sm text-slate-400 mt-1">
                            {isSurplus ? 'Cash remaining after move' : 'Additional funds/mortgage needed'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Desired Final Position Input */}
            <div className="mt-4 border-t border-white/10 pt-6">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-slate-300">Set Desired Position</label>
                    <button
                        onClick={() => onPositionChange('desiredPositionLocked', !finalPosition.desiredPositionLocked)}
                        className={`p-1.5 rounded-lg transition-colors ${finalPosition.desiredPositionLocked
                            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-rose-500/20'
                            : 'bg-black/20 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                            }`}
                        title={finalPosition.desiredPositionLocked ? "Unlock desired position" : "Lock desired position"}
                    >
                        {finalPosition.desiredPositionLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                </div>

                <div className="relative">
                    <NumericFormat
                        value={finalPosition.desiredPositionLocked ? finalPosition.desiredPosition : results.shortfallOrSurplus}
                        onValueChange={(values) => onPositionChange('desiredPosition', values.floatValue || 0)}
                        disabled={!finalPosition.desiredPositionLocked}
                        thousandSeparator={true}
                        prefix={'£'}
                        decimalScale={0}
                        allowNegative={true}
                        className={`
               w-full px-4 text-lg font-semibold py-3 border rounded-xl shadow-inner transition-all
               focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none
               ${finalPosition.desiredPositionLocked
                                ? 'bg-black/40 border-white/20 text-white shadow-lg'
                                : 'bg-black/20 border-white/5 text-slate-500 cursor-not-allowed'
                            }
             `}
                    />
                    {!finalPosition.desiredPositionLocked && (
                        <p className="text-xs text-slate-500 mt-2">
                            Lock this field to set a target position and auto-calculate other fields.
                        </p>
                    )}
                </div>
            </div>

        </div>
    );
};

export default ResultsSummary;
