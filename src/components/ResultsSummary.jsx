import React from 'react';
import { TrendingUp, TrendingDown, Lock, Unlock, Landmark } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import InputSection from './InputSection';

const ResultsSummary = ({
    results,
    finalPosition,
    onPositionChange,
    triangleMode,
    onToggleTriangleLock,
    onTriangleDesiredFocus,
    deficitFinancing,
    onDeficitFinancingChange,
    monthlyDeficitRepayment,
}) => {

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatMonthlyRepayment = (amount) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const isSurplus = results.shortfallOrSurplus >= 0;
    const deficitAmount = Math.max(0, -results.shortfallOrSurplus);

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

            {/* Set Desired Position (same figure as surplus / shortfall from the move) */}
            <div className={`mt-2 p-5 rounded-2xl border shadow-lg ${isSurplus ? 'bg-emerald-500/10 border-emerald-500/20 ring-1 ring-emerald-500/10' : 'bg-rose-500/10 border-rose-500/20 ring-1 ring-rose-500/10'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-2 min-w-0">
                        {isSurplus ? <TrendingUp className="text-emerald-400 shrink-0 mt-0.5" size={20} /> : <TrendingDown className="text-rose-400 shrink-0 mt-0.5" size={20} />}
                        <div>
                            <label className="text-sm font-bold text-slate-200 block">Set Desired Position</label>
                            <p className="text-xs text-slate-500 mt-1">
                                {isSurplus ? 'Cash remaining after move' : 'Additional funds/mortgage needed'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onToggleTriangleLock('desired')}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${triangleMode === 'desired'
                            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-rose-500/20'
                            : 'bg-black/20 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                            }`}
                        title={triangleMode === 'desired'
                            ? 'Desired position is fixed as a target; sale or purchase adjusts to match.'
                            : 'Surplus/shortfall is computed from sale + purchase (click to fix desired position as a target)'}
                    >
                        {triangleMode === 'desired' ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                </div>

                <div className="relative">
                    <NumericFormat
                        value={triangleMode === 'forward' ? results.shortfallOrSurplus : finalPosition.desiredPosition}
                        onValueChange={(values) => onPositionChange('desiredPosition', values.floatValue ?? 0)}
                        onFocus={() => {
                            if (triangleMode !== 'forward' && onTriangleDesiredFocus) onTriangleDesiredFocus();
                        }}
                        disabled={triangleMode === 'forward'}
                        thousandSeparator={true}
                        prefix={'£'}
                        decimalScale={0}
                        allowNegative={true}
                        className={`
               w-full px-4 text-3xl font-bold tracking-tight py-3 border rounded-xl shadow-inner transition-all
               focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none
               ${triangleMode === 'forward'
                                ? 'bg-black/20 border-white/5 text-slate-400 cursor-not-allowed'
                                : `bg-black/40 border-white/20 shadow-lg ${isSurplus ? 'text-emerald-400' : 'text-rose-400'}`
                            }
             `}
                    />
                    {triangleMode === 'forward' && (
                        <p className="text-xs text-slate-500 mt-2">
                            Sale price and new purchase price are inputs; this value follows from them. Lock sale, purchase, or desired position to set a fixed value and solve for another.
                        </p>
                    )}
                </div>
            </div>

            {/* Optional: estimate monthly cost if borrowing to cover a shortfall */}
            {!isSurplus && deficitAmount > 0 && (
                <div className="space-y-4 bg-violet-500/10 p-5 rounded-2xl border border-violet-500/20 ring-1 ring-violet-500/10 shadow-inner">
                    <div className="flex items-center gap-2">
                        <Landmark className="text-violet-400 shrink-0" size={20} />
                        <div>
                            <h4 className="text-sm font-semibold text-slate-200">Borrowing the shortfall</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                If you borrow <span className="text-slate-400 font-medium">{formatCurrency(deficitAmount)}</span> at a fixed rate over the term below (capital repayment).
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <InputSection
                            label="Interest rate (per year)"
                            value={deficitFinancing.annualInterestRate}
                            onChange={(v) => onDeficitFinancingChange('annualInterestRate', v)}
                            type="number"
                            step="0.1"
                        />
                        <InputSection
                            label="Term (years)"
                            value={deficitFinancing.termYears}
                            onChange={(v) => onDeficitFinancingChange('termYears', v)}
                            type="number"
                            step="1"
                            plainInteger
                        />
                    </div>
                    <div className="pt-2 border-t border-violet-500/20 flex flex-col gap-1">
                        <span className="text-xs font-medium text-violet-300/90 uppercase tracking-wider">Estimated monthly repayment</span>
                        <span className="text-2xl font-bold text-violet-200 tabular-nums">
                            {formatMonthlyRepayment(monthlyDeficitRepayment)}
                            <span className="text-sm font-normal text-slate-500 ml-2">/ month</span>
                        </span>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ResultsSummary;
