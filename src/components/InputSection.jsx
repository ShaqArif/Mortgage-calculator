import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

const InputSection = ({
    label,
    value,
    onChange,
    type = "number",
    step = "1",
    lockable = false,
    isLocked = false,
    onToggleLock,
    onFocus,
    /** Whole numbers (e.g. years) — not currency, no % suffix */
    plainInteger = false,
}) => {

    const handleValueChange = (values) => {
        const { floatValue } = values;
        // if undefined (e.g., cleared field), return 0
        onChange(floatValue === undefined ? 0 : floatValue);
    };

    const isCurrency = type === "number" && step === "1" && !plainInteger; // Hacky check: percentages often pass step="0.1"

    return (
        <div className="flex flex-col gap-1.5 focus-within:z-10 relative">
            <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                {lockable && (
                    <button
                        onClick={onToggleLock}
                        className={`p-1 rounded-md transition-colors ${isLocked
                            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 ring-1 ring-rose-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        title={isLocked ? "Unlock value" : "Lock value"}
                    >
                        {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                )}
            </div>

            <div className="relative flex items-center">
                <NumericFormat
                    value={value}
                    onValueChange={handleValueChange}
                    onFocus={onFocus}
                    disabled={isLocked}
                    thousandSeparator={isCurrency}
                    prefix={isCurrency ? '£' : ''}
                    suffix={isCurrency ? '' : plainInteger ? '' : '%'}
                    decimalScale={isCurrency ? 0 : plainInteger ? 0 : 2}
                    allowNegative={false}
                    className={`
            w-full px-4 text-base py-2.5 rounded-xl transition-all shadow-inner
            focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none
            ${isLocked
                            ? 'bg-black/40 border-white/5 text-slate-500 cursor-not-allowed font-medium shadow-none'
                            : 'bg-black/20 border border-white/10 text-slate-200 hover:border-white/20'}
          `}
                />
            </div>
        </div>
    );
};

export default InputSection;
