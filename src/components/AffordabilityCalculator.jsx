import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Home, Briefcase, PoundSterling } from 'lucide-react';
import InputSection from './InputSection';
import ResultsSummary from './ResultsSummary';

// Stamp Duty calculation for UK residential property (Standard Rates)
// Values as of current general knowledge (2024/2025 bands)
const calculateStampDuty = (purchasePrice) => {
    if (purchasePrice <= 250000) return 0;

    let tax = 0;
    let remaining = purchasePrice;

    // Band: > 1,500,000 (12%)
    if (remaining > 1500000) {
        tax += (remaining - 1500000) * 0.12;
        remaining = 1500000;
    }
    // Band: 925,001 - 1,500,000 (10%)
    if (remaining > 925000) {
        tax += (remaining - 925000) * 0.10;
        remaining = 925000;
    }
    // Band: 250,001 - 925,000 (5%)
    if (remaining > 250000) {
        tax += (remaining - 250000) * 0.05;
        remaining = 250000;
    }

    return tax;
};

const reverseStampDutyAndPrice = (targetAmount) => {
    if (targetAmount <= 250000) return targetAmount;
    if (targetAmount <= 958750) return ((targetAmount - 250000) / 1.05) + 250000;
    if (targetAmount <= 1591250) return ((targetAmount - 958750) / 1.10) + 925000;
    return ((targetAmount - 1591250) / 1.12) + 1500000;
};

/** Capital repayment mortgage: fixed monthly payment (same formula as standard UK amortising loans). */
const calculateMonthlyRepayment = (principal, annualRatePercent, termYears) => {
    if (principal <= 0 || termYears <= 0) return 0;
    const n = Math.round(termYears * 12);
    if (n <= 0) return 0;
    const r = annualRatePercent / 100 / 12;
    if (r === 0) return principal / n;
    const factor = Math.pow(1 + r, n);
    return principal * (r * factor) / (factor - 1);
};

const AffordabilityCalculator = () => {
    // 1. House Sale State
    const [houseSale, setHouseSale] = useState({
        askingPrice: 350000,
        salePrice: 350000,
        estateAgentFeePercent: 1.5,
        conveyancingFees: 1500,
        movingCosts: 1000,
    });

    // 2. Mortgage Payoff State
    const [mortgagePayoff, setMortgagePayoff] = useState({
        outstandingMortgage: 200000,
        earlyRepaymentCharges: 2000,
    });

    // 3. House Purchase State
    const [housePurchase, setHousePurchase] = useState({
        newAskingPrice: 450000,
        newPurchasePrice: 450000,
        stampDuty: 0,
        legalFees: 2000,
        surveyCosts: 800,
    });

    // 4. Final Position State
    const [finalPosition, setFinalPosition] = useState({
        desiredPosition: 0,
        calculatedPosition: 0,
    });

    /**
     * Triangle mode: exactly one lock, or forward.
     * - forward: sale + purchase are inputs; surplus/shortfall (desired) is computed.
     * - sale | purchase | desired: that value is fixed; the other two are inputs and the solver adjusts one of them (see lastEditedTriangleRef).
     */
    const [triangleMode, setTriangleMode] = useState('forward');

    /**
     * Which price field the user is treating as the "free" input in triangle modes.
     * Set from focus + direct edits (not from solver-driven value updates) so programmatic
     * purchase/sale updates don't flip the solver and fight typing.
     */
    const [triangleDriver, setTriangleDriver] = useState(null);

    /** If there is a cash shortfall, optional rate/term to estimate monthly borrowing cost for that amount. */
    const [deficitFinancing, setDeficitFinancing] = useState({
        annualInterestRate: 5.5,
        termYears: 25,
    });

    // 5. Computed Output State
    const [results, setResults] = useState({
        grossSaleProceeds: 0,
        saleCosts: 0,
        mortgageClearance: 0,
        netCashFromSale: 0,
        purchaseCosts: 0,
        totalCashRequired: 0,
        shortfallOrSurplus: 0,
    });

    const [isCalculating, setIsCalculating] = useState(false);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const deficitPrincipal = Math.max(0, -results.shortfallOrSurplus);
    const monthlyDeficitRepayment = useMemo(
        () => calculateMonthlyRepayment(deficitPrincipal, deficitFinancing.annualInterestRate, deficitFinancing.termYears),
        [deficitPrincipal, deficitFinancing.annualInterestRate, deficitFinancing.termYears]
    );

    const handleDeficitFinancingChange = (field, value) => {
        setDeficitFinancing((prev) => ({ ...prev, [field]: value }));
    };

    const performCalculations = useCallback(() => {
        if (isCalculating) return;
        setIsCalculating(true);

        let currentSalePrice = houseSale.salePrice;
        let currentPurchasePrice = housePurchase.newPurchasePrice;

        const mortgageClearance = mortgagePayoff.outstandingMortgage + mortgagePayoff.earlyRepaymentCharges;

        const solvePurchaseFromSaleAndDesired = (salePrice, desiredSurplus) => {
            const sc = (salePrice * (houseSale.estateAgentFeePercent / 100)) + houseSale.conveyancingFees + houseSale.movingCosts;
            const net = salePrice - sc - mortgageClearance;
            const targetCashRequired = net - desiredSurplus;
            const targetPurchaseAndStamp = targetCashRequired - housePurchase.legalFees - housePurchase.surveyCosts;
            return reverseStampDutyAndPrice(targetPurchaseAndStamp);
        };

        const solveSaleFromPurchaseAndDesired = (purchasePrice, desiredSurplus) => {
            const sd = calculateStampDuty(purchasePrice);
            const pc = sd + housePurchase.legalFees + housePurchase.surveyCosts;
            const totalReq = purchasePrice + pc;
            const targetNetCashFromSale = totalReq + desiredSurplus;
            const agentMultiplier = 1 - (houseSale.estateAgentFeePercent / 100);
            return (targetNetCashFromSale + houseSale.conveyancingFees + houseSale.movingCosts + mortgageClearance) / agentMultiplier;
        };

        if (triangleMode === 'sale') {
            currentSalePrice = houseSale.salePrice;
            if (triangleDriver !== 'purchase') {
                currentPurchasePrice = solvePurchaseFromSaleAndDesired(currentSalePrice, finalPosition.desiredPosition);
            }
        } else if (triangleMode === 'purchase') {
            currentPurchasePrice = housePurchase.newPurchasePrice;
            if (triangleDriver !== 'sale') {
                currentSalePrice = solveSaleFromPurchaseAndDesired(currentPurchasePrice, finalPosition.desiredPosition);
            }
        } else if (triangleMode === 'desired') {
            if (triangleDriver === 'purchase') {
                currentPurchasePrice = housePurchase.newPurchasePrice;
                currentSalePrice = solveSaleFromPurchaseAndDesired(currentPurchasePrice, finalPosition.desiredPosition);
            } else {
                currentSalePrice = houseSale.salePrice;
                currentPurchasePrice = solvePurchaseFromSaleAndDesired(currentSalePrice, finalPosition.desiredPosition);
            }
        }

        const saleCosts = (currentSalePrice * (houseSale.estateAgentFeePercent / 100)) + houseSale.conveyancingFees + houseSale.movingCosts;
        const netCashFromSale = currentSalePrice - saleCosts - mortgageClearance;

        const calculatedStampDuty = calculateStampDuty(currentPurchasePrice);
        const purchaseCosts = calculatedStampDuty + housePurchase.legalFees + housePurchase.surveyCosts;
        const totalCashRequired = currentPurchasePrice + purchaseCosts;

        const shortfallOrSurplus = netCashFromSale - totalCashRequired;

        if (currentPurchasePrice !== housePurchase.newPurchasePrice || calculatedStampDuty !== housePurchase.stampDuty) {
            setHousePurchase(prev => ({ ...prev, newPurchasePrice: currentPurchasePrice, stampDuty: calculatedStampDuty }));
        }
        if (currentSalePrice !== houseSale.salePrice) {
            setHouseSale(prev => ({ ...prev, salePrice: currentSalePrice }));
        }

        setResults({
            grossSaleProceeds: currentSalePrice,
            saleCosts,
            mortgageClearance,
            netCashFromSale,
            purchaseCosts,
            totalCashRequired,
            shortfallOrSurplus,
        });

        let nextDesiredPosition = finalPosition.desiredPosition;
        if (triangleMode === 'forward') {
            nextDesiredPosition = shortfallOrSurplus;
        } else if (triangleMode === 'sale' && triangleDriver === 'purchase') {
            nextDesiredPosition = shortfallOrSurplus;
        } else if (triangleMode === 'purchase' && triangleDriver === 'sale') {
            nextDesiredPosition = shortfallOrSurplus;
        }

        setFinalPosition(prev => ({
            ...prev,
            calculatedPosition: shortfallOrSurplus,
            desiredPosition: nextDesiredPosition,
        }));

        setIsCalculating(false);
    }, [
        houseSale.salePrice, houseSale.estateAgentFeePercent, houseSale.conveyancingFees, houseSale.movingCosts,
        mortgagePayoff.outstandingMortgage, mortgagePayoff.earlyRepaymentCharges,
        housePurchase.newPurchasePrice, housePurchase.legalFees, housePurchase.surveyCosts, housePurchase.stampDuty,
        finalPosition.desiredPosition,
        triangleMode,
        triangleDriver,
        isCalculating
    ]);

    const toggleTriangleLock = (field) => {
        setTriangleDriver(null);
        setTriangleMode((prev) => {
            const next = prev === field ? 'forward' : field;
            if (next !== 'forward' && prev === 'forward') {
                queueMicrotask(() => {
                    setFinalPosition((fp) => ({ ...fp, desiredPosition: fp.calculatedPosition }));
                });
            }
            return next;
        });
    };

    // Recalculate whenever inputs change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: derive results state from inputs
        performCalculations();
    }, [performCalculations]);

    const handleSaleChange = (field, value) => {
        setHouseSale(prev => ({ ...prev, [field]: value }));
    };

    const handleMortgageChange = (field, value) => {
        setMortgagePayoff(prev => ({ ...prev, [field]: value }));
    };

    const handlePurchaseChange = (field, value) => {
        setHousePurchase(prev => ({ ...prev, [field]: value }));
    };

    const handlePositionChange = (field, value) => {
        // Only reset driver in "desired fixed" mode. In sale/purchase locked modes, clearing here
        // after editing desired would leave driver null and re-solve purchase/sale on every keystroke,
        // blocking manual edits to the other price.
        if (field === 'desiredPosition' && triangleMode === 'desired') setTriangleDriver(null);
        setFinalPosition(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="max-w-[1600px] w-full mx-auto grid grid-cols-1 xl:grid-cols-3 gap-6 relative">

            {/* Left Columns (Span 2/3): Inputs */}
            <div className="xl:col-span-2 space-y-6">

                {/* House Sale Section */}
                <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-6 ring-1 ring-white/5 relative overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shadow-inner ring-1 ring-blue-500/30">
                            <Home size={20} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100 drop-shadow-sm">1. Selling Your House</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <InputSection
                            label="Asking Price"
                            value={houseSale.askingPrice}
                            onChange={v => handleSaleChange('askingPrice', v)}
                        />
                        <InputSection
                            label="Sale Price"
                            value={houseSale.salePrice}
                            onChange={v => handleSaleChange('salePrice', v)}
                            onFocus={() => {
                                if (triangleMode === 'desired' || triangleMode === 'purchase') setTriangleDriver('sale');
                            }}
                            lockable={true}
                            isLocked={triangleMode === 'sale'}
                            onToggleLock={() => toggleTriangleLock('sale')}
                        />
                        <InputSection
                            label={`Estate Agent Fees (${formatCurrency(houseSale.salePrice * (houseSale.estateAgentFeePercent / 100))})`}
                            value={houseSale.estateAgentFeePercent}
                            onChange={v => handleSaleChange('estateAgentFeePercent', v)}
                            type="number"
                            step="0.1"
                        />
                        <InputSection
                            label="Conveyancing Fees"
                            value={houseSale.conveyancingFees}
                            onChange={v => handleSaleChange('conveyancingFees', v)}
                        />
                        <InputSection
                            label="Moving Costs"
                            value={houseSale.movingCosts}
                            onChange={v => handleSaleChange('movingCosts', v)}
                        />
                    </div>
                </div>

                {/* Mortgage Payoff Section */}
                <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-6 ring-1 ring-white/5 relative overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
                        <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl shadow-inner ring-1 ring-rose-500/30">
                            <PoundSterling size={20} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100 drop-shadow-sm">2. Mortgage Payoff</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <InputSection
                            label="Outstanding Mortgage"
                            value={mortgagePayoff.outstandingMortgage}
                            onChange={v => handleMortgageChange('outstandingMortgage', v)}
                        />
                        <InputSection
                            label="Early Repayment Charges"
                            value={mortgagePayoff.earlyRepaymentCharges}
                            onChange={v => handleMortgageChange('earlyRepaymentCharges', v)}
                        />
                    </div>
                </div>

                {/* House Purchase Section */}
                <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-6 ring-1 ring-white/5 relative overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shadow-inner ring-1 ring-emerald-500/30">
                            <Briefcase size={20} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100 drop-shadow-sm">3. Buying a New House</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <InputSection
                            label="New Asking Price"
                            value={housePurchase.newAskingPrice}
                            onChange={v => handlePurchaseChange('newAskingPrice', v)}
                        />
                        <InputSection
                            label="New Purchase Price"
                            value={housePurchase.newPurchasePrice}
                            onChange={v => handlePurchaseChange('newPurchasePrice', v)}
                            onFocus={() => {
                                if (triangleMode === 'desired' || triangleMode === 'sale') setTriangleDriver('purchase');
                            }}
                            lockable={true}
                            isLocked={triangleMode === 'purchase'}
                            onToggleLock={() => toggleTriangleLock('purchase')}
                        />
                        {/* Read only calculated field */}
                        <div className="flex flex-col gap-1.5 justify-center mt-1">
                            <label className="text-sm font-medium text-slate-300">Stamp Duty</label>
                            <input
                                type="text"
                                value={`£${housePurchase.stampDuty.toLocaleString('en-GB')}`}
                                readOnly
                                className="w-full px-4 text-base py-2.5 rounded-xl transition-all shadow-inner outline-none bg-black/40 border border-white/5 text-slate-500 cursor-not-allowed font-medium"
                            />
                        </div>
                        <InputSection
                            label="Legal Fees"
                            value={housePurchase.legalFees}
                            onChange={v => handlePurchaseChange('legalFees', v)}
                        />
                        <InputSection
                            label="Survey Costs"
                            value={housePurchase.surveyCosts}
                            onChange={v => handlePurchaseChange('surveyCosts', v)}
                        />
                    </div>
                </div>

            </div>

            {/* Right Column (Span 1/3): Sticky Summary & Final Position */}
            <div className="xl:col-span-1 self-start sticky top-6">
                <ResultsSummary
                    results={results}
                    finalPosition={finalPosition}
                    onPositionChange={handlePositionChange}
                    triangleMode={triangleMode}
                    onToggleTriangleLock={toggleTriangleLock}
                    onTriangleDesiredFocus={() => setTriangleDriver(null)}
                    deficitFinancing={deficitFinancing}
                    onDeficitFinancingChange={handleDeficitFinancingChange}
                    monthlyDeficitRepayment={monthlyDeficitRepayment}
                />
            </div>

        </div>
    );
};

export default AffordabilityCalculator;
