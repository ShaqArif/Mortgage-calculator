import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, Home, Briefcase, PoundSterling, Lock, Unlock } from 'lucide-react';
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

const AffordabilityCalculator = () => {
    // 1. House Sale State
    const [houseSale, setHouseSale] = useState({
        askingPrice: 350000,
        salePrice: 350000,
        salePriceLocked: false,
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
        newPurchasePriceLocked: false,
        stampDuty: 0,
        legalFees: 2000,
        surveyCosts: 800,
    });

    // 4. Final Position State
    const [finalPosition, setFinalPosition] = useState({
        desiredPosition: 0,
        desiredPositionLocked: false,
        calculatedPosition: 0,
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

    const performCalculations = useCallback(() => {
        if (isCalculating) return;
        setIsCalculating(true);

        let currentSalePrice = houseSale.salePrice;
        let currentPurchasePrice = housePurchase.newPurchasePrice;

        const mortgageClearance = mortgagePayoff.outstandingMortgage + mortgagePayoff.earlyRepaymentCharges;

        // SCENARIO 1: Desired Position is locked, and Sale Price is locked -> calculate New Purchase Price
        if (finalPosition.desiredPositionLocked && houseSale.salePriceLocked && !housePurchase.newPurchasePriceLocked) {
            const saleCosts = (currentSalePrice * (houseSale.estateAgentFeePercent / 100)) + houseSale.conveyancingFees + houseSale.movingCosts;
            const netCashFromSale = currentSalePrice - saleCosts - mortgageClearance;

            // targetCashRequired = netCashFromSale - desiredPosition
            const targetCashRequired = netCashFromSale - finalPosition.desiredPosition;
            const targetPurchaseAndStamp = targetCashRequired - housePurchase.legalFees - housePurchase.surveyCosts;

            currentPurchasePrice = reverseStampDutyAndPrice(targetPurchaseAndStamp);
        }

        // SCENARIO 2: Desired Position is locked, and Purchase Price is locked -> calculate Sale Price
        else if (finalPosition.desiredPositionLocked && housePurchase.newPurchasePriceLocked && !houseSale.salePriceLocked) {
            const calculatedStampDuty = calculateStampDuty(currentPurchasePrice);
            const purchaseCosts = calculatedStampDuty + housePurchase.legalFees + housePurchase.surveyCosts;
            const totalCashRequired = currentPurchasePrice + purchaseCosts;

            // targetNetCashFromSale = totalCashRequired + desiredPosition
            const targetNetCashFromSale = totalCashRequired + finalPosition.desiredPosition;

            // targetNetCashFromSale + conveyancing + moving + mortgageClearance = salePrice * (1 - agentFee%)
            const agentMultiplier = 1 - (houseSale.estateAgentFeePercent / 100);
            currentSalePrice = (targetNetCashFromSale + houseSale.conveyancingFees + houseSale.movingCosts + mortgageClearance) / agentMultiplier;
        }

        // Standard Forward Calculation
        const saleCosts = (currentSalePrice * (houseSale.estateAgentFeePercent / 100)) + houseSale.conveyancingFees + houseSale.movingCosts;
        const netCashFromSale = currentSalePrice - saleCosts - mortgageClearance;

        const calculatedStampDuty = calculateStampDuty(currentPurchasePrice);
        const purchaseCosts = calculatedStampDuty + housePurchase.legalFees + housePurchase.surveyCosts;
        const totalCashRequired = currentPurchasePrice + purchaseCosts;

        const shortfallOrSurplus = netCashFromSale - totalCashRequired;

        // Apply state updates if they drifted
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

        if (!finalPosition.desiredPositionLocked) {
            setFinalPosition(prev => ({ ...prev, calculatedPosition: shortfallOrSurplus }));
        } else {
            setFinalPosition(prev => ({ ...prev, calculatedPosition: finalPosition.desiredPosition }));
        }

        setIsCalculating(false);
    }, [
        houseSale.salePrice, houseSale.salePriceLocked, houseSale.estateAgentFeePercent, houseSale.conveyancingFees, houseSale.movingCosts,
        mortgagePayoff.outstandingMortgage, mortgagePayoff.earlyRepaymentCharges,
        housePurchase.newPurchasePrice, housePurchase.newPurchasePriceLocked, housePurchase.legalFees, housePurchase.surveyCosts, housePurchase.stampDuty,
        finalPosition.desiredPosition, finalPosition.desiredPositionLocked,
        isCalculating
    ]);

    // Recalculate whenever inputs change
    useEffect(() => {
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
                            lockable={true}
                            isLocked={houseSale.salePriceLocked}
                            onToggleLock={() => handleSaleChange('salePriceLocked', !houseSale.salePriceLocked)}
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
                            lockable={true}
                            isLocked={housePurchase.newPurchasePriceLocked}
                            onToggleLock={() => handlePurchaseChange('newPurchasePriceLocked', !housePurchase.newPurchasePriceLocked)}
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
                <ResultsSummary results={results} finalPosition={finalPosition} onPositionChange={handlePositionChange} />
            </div>

        </div>
    );
};

export default AffordabilityCalculator;
