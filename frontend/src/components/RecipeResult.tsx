import { useEffect, useMemo, useState } from 'react';
import {
    AlarmClock,
    ArrowRight,
    CheckCircle2,
    ChevronUp,
    ChevronDown,
    Clock3,
    ExternalLink,
    Globe,
    Maximize2,
    Minimize2,
    Pause,
    Play,
    RotateCcw,
    Scaling,
    ScanEye,
  Printer,
  Share2,
    Users,
    Utensils,
    X,
    Bookmark
} from 'lucide-react';
import { getIngredientImages } from '../api';
import type { ParsedRecipe, NormalizedIngredient, Step } from '../types';

interface RecipeResultProps {
    recipe: ParsedRecipe;
    onBack: () => void;
    onSave?: (recipe: ParsedRecipe) => void;
}



type MeasureMode = 'original' | 'home';



const INGREDIENT_CUP_DENSITY: Array<{ match: RegExp; gramsPerCup: number }> = [
    { match: /(קמח|flour)/i, gramsPerCup: 120 },
    { match: /(סוכר חום|brown sugar)/i, gramsPerCup: 220 },
    { match: /(אבקת סוכר|powdered sugar)/i, gramsPerCup: 120 },
    { match: /(סוכר|sugar)/i, gramsPerCup: 200 },
    { match: /(קקאו|cocoa)/i, gramsPerCup: 100 },
    { match: /(שיבולת|oats)/i, gramsPerCup: 90 },
    { match: /(אורז|rice)/i, gramsPerCup: 185 },
    { match: /(חמאה|butter)/i, gramsPerCup: 227 },
];

const HOME_UNITS: Record<string, { type: 'volume' | 'weight'; toBase: number }> = {
    כוס: { type: 'volume', toBase: 240 },
    כוסות: { type: 'volume', toBase: 240 },
    cup: { type: 'volume', toBase: 240 },
    cups: { type: 'volume', toBase: 240 },
    כף: { type: 'volume', toBase: 15 },
    כפות: { type: 'volume', toBase: 15 },
    tbsp: { type: 'volume', toBase: 15 },
    tablespoon: { type: 'volume', toBase: 15 },
    tablespoons: { type: 'volume', toBase: 15 },
    כפית: { type: 'volume', toBase: 5 },
    כפיות: { type: 'volume', toBase: 5 },
    tsp: { type: 'volume', toBase: 5 },
    teaspoon: { type: 'volume', toBase: 5 },
    teaspoons: { type: 'volume', toBase: 5 },
    מל: { type: 'volume', toBase: 1 },
    'מ"ל': { type: 'volume', toBase: 1 },
    ml: { type: 'volume', toBase: 1 },
    ליטר: { type: 'volume', toBase: 1000 },
    ליטרים: { type: 'volume', toBase: 1000 },
    l: { type: 'volume', toBase: 1000 },
    גרם: { type: 'weight', toBase: 1 },
    "גר'": { type: 'weight', toBase: 1 },
    g: { type: 'weight', toBase: 1 },
    קילו: { type: 'weight', toBase: 1000 },
    'ק"ג': { type: 'weight', toBase: 1000 },
    kg: { type: 'weight', toBase: 1000 },
};

const FRACTIONS: Record<string, number> = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
    '⅙': 1 / 6,
    '⅚': 5 / 6,
    '⅒': 0.1,
    '⅕': 0.2,
    '⅖': 0.4,
    '⅗': 0.6,
    '⅘': 0.8,
};

const BUTTON_PRIMARY =
    'inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#2f6d63] px-4 text-sm font-semibold text-white transition-all hover:bg-[#285c54] disabled:cursor-not-allowed disabled:opacity-35 md:h-12 md:px-5 md:text-base';
const BUTTON_SECONDARY =
    'inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 md:h-12 md:px-4';
const BUTTON_TERTIARY =
    'inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-transparent bg-slate-100 px-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 md:h-11 md:px-4';

const formatDuration = (duration?: string) => {
    if (!duration) return 'לא צוין';

    const hours = Number(duration.match(/(\d+)H/)?.[1] || 0);
    const minutes = Number(duration.match(/(\d+)M/)?.[1] || 0);
    const parts = [];

    if (hours) parts.push(hours + ' ש׳');
    if (minutes) parts.push(minutes + ' דק׳');

    return parts.join(' ') || duration;
};

const normalizeUnit = (unit: string) => unit.trim().toLowerCase().replace(/\./g, '');

const parseNumericQuantity = (value: string) => {
    let cleanValue = value.trim();
    if (!cleanValue) return null;

    // Replace Unicode fractions with their decimal value + space if attached to a number
    // E.g. "1½" -> "1 0.5"
    for (const [frac, decimal] of Object.entries(FRACTIONS)) {
        cleanValue = cleanValue.replace(new RegExp(frac, 'g'), ' ' + decimal + ' ');
    }

    const tokens = cleanValue
        .replace(/,/g, '.')
        .split(/\s+/)
        .flatMap((token) => token.split('-'));

    let total = 0;
    let found = false;

    for (const token of tokens) {
        if (!token) continue;

        if (token.includes('/')) {
            const [numerator, denominator] = token.split('/').map(Number);
            if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
                total += numerator / denominator;
                found = true;
            }
            continue;
        }

        const parsed = Number(token);
        if (Number.isFinite(parsed)) {
            total += parsed;
            found = true;
        }
    }

    return found ? total : null;
};

const formatScaledNumber = (value: number) => {
    if (value === 0) return '0';
    if (value >= 10) return value.toFixed(1).replace(/\.0$/, '');
    if (value >= 1) return value.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
    return value.toFixed(2).replace(/0$/, '');
};

const formatQuantity = (value: number) => {
    const whole = Math.floor(value);
    const fraction = value - whole;

    if (Math.abs(fraction) < 0.01) return whole.toString();

    // Try to find the closest Unicode fraction
    const bestFrac = Object.entries(FRACTIONS).find(([, dec]) => Math.abs(dec - fraction) < 0.01);

    if (bestFrac) {
        return whole > 0 ? whole + bestFrac[0] : bestFrac[0];
    }

    // Common fractions that might not be in Unicode or need 1/4 style
    if (Math.abs(fraction - 0.25) < 0.01) return whole > 0 ? whole + '¼' : '¼';
    if (Math.abs(fraction - 0.5) < 0.01) return whole > 0 ? whole + '½' : '½';
    if (Math.abs(fraction - 0.75) < 0.01) return whole > 0 ? whole + '¾' : '¾';

    return formatScaledNumber(value);
};

const formatServingsLabel = (value: number) => formatQuantity(value) + ' מנות';

const pickDensity = (ingredientName: string) => {
    return INGREDIENT_CUP_DENSITY.find((entry) => entry.match.test(ingredientName))?.gramsPerCup;
};

const toHomeVolumeLabel = (milliliters: number) => {
    if (milliliters >= 240) {
        const cups = milliliters / 240;
        return formatQuantity(cups) + ' כוסות';
    }
    if (milliliters >= 15) {
        const tbsp = milliliters / 15;
        return formatQuantity(tbsp) + ' כפות';
    }
    const tsp = milliliters / 5;
    return formatQuantity(tsp) + ' כפיות';
};

const scaleIngredientDisplay = (
    ingredient: NormalizedIngredient,
    scaleFactor: number,
    measureMode: MeasureMode,
) => {
    const numericQuantity = parseNumericQuantity(ingredient.quantity);
    if (!numericQuantity) {
        return {
            quantityLabel: ingredient.quantity,
            unitLabel: ingredient.unit,
            note: scaleFactor !== 1 ? 'כפול ' + formatScaledNumber(scaleFactor) : '',
        };
    }

    const scaledQuantity = numericQuantity * scaleFactor;
    const normalized = HOME_UNITS[normalizeUnit(ingredient.unit)];

    if (measureMode === 'home' && normalized) {
        if (normalized.type === 'volume') {
            return {
                quantityLabel: toHomeVolumeLabel(scaledQuantity * normalized.toBase),
                unitLabel: '',
                note: ingredient.unit ? 'במקור: ' + ingredient.quantity + ' ' + ingredient.unit : '',
            };
        }

        const density = pickDensity(ingredient.name);
        if (density) {
            return {
                quantityLabel: toHomeVolumeLabel((scaledQuantity * normalized.toBase / density) * 240),
                unitLabel: '',
                note: ingredient.unit ? 'בקירוב לפי ' + ingredient.name : '',
            };
        }
    }

    return {
        quantityLabel: formatQuantity(scaledQuantity),
        unitLabel: ingredient.unit,
        note: '',
    };
};

const formatIngredientDisplay = (
    ingredient: NormalizedIngredient,
    scaleFactor: number,
    measureMode: MeasureMode,
) => {
    const converted = scaleIngredientDisplay(ingredient, scaleFactor, measureMode);

    return {
        primary: [converted.quantityLabel, converted.unitLabel].filter(Boolean).join(' ').trim(),
        note: converted.note,
    };
};

const extractStepMinutes = (text: string) => {
    const patterns = [
        /(\d+)\s*(?:-|עד)?\s*(\d+)?\s*(דקות|דקה|דק׳|דק|minutes?|mins?)/i,
        /(\d+)\s*(שעות|שעה|ש׳|hours?|hrs?)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match) continue;

        const first = Number(match[1]);
        const second = Number(match[2]);
        const unit = match[3] || match[2];

        if (!Number.isFinite(first)) continue;

        const value = Number.isFinite(second) ? Math.max(first, second) : first;
        if (/ש/.test(String(unit)) || /hour/i.test(String(unit))) {
            return value * 60;
        }

        return value;
    }

    if (/חצי שעה/.test(text)) {
        return 30;
    }

    return null;
};

type PanShape = 'round' | 'square' | 'rectangular' | 'loaf';

const PAN_SHAPES_DATA: { key: PanShape; label: string; sizes: string[] }[] = [
    { key: 'round', label: 'עגולה', sizes: ['20', '22', '24', '26', '28'] },
    { key: 'square', label: 'מרובעת', sizes: ['20', '24', '28'] },
    { key: 'rectangular', label: 'מלבנית', sizes: ['20×30', '24×33'] },
    { key: 'loaf', label: 'אינגליש קייק', sizes: ['10×25', '10×30'] },
];

const calcPanArea = (shape: PanShape, size: string): number => {
    if (shape === 'round') {
        const r = Number(size) / 2;
        return Math.PI * r * r;
    }
    if (shape === 'square') {
        const s = Number(size);
        return s * s;
    }
    const [w, h] = size.split('×').map(Number);
    return (w || 0) * (h || 0);
};

const PanShapeIcon = ({ shape, size = 48 }: { shape: PanShape; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className="shrink-0">
        {shape === 'round' && (
            <>
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
                <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
            </>
        )}
        {shape === 'square' && (
            <>
                <rect x="6" y="6" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
                <rect x="10" y="10" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
            </>
        )}
        {shape === 'rectangular' && (
            <>
                <rect x="4" y="12" width="40" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
                <rect x="8" y="16" width="32" height="16" rx="2" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
            </>
        )}
        {shape === 'loaf' && (
            <>
                <rect x="14" y="4" width="20" height="40" rx="8" stroke="currentColor" strokeWidth="2" />
                <rect x="17" y="8" width="14" height="32" rx="4" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
            </>
        )}
    </svg>
);

const IngredientItem = ({
    ing,
    completed,
    onToggle,
    scaleFactor,
    measureMode,
    isLast,
}: {
    ing: NormalizedIngredient;
    completed: boolean;
    onToggle: () => void;
    scaleFactor: number;
    measureMode: MeasureMode;
    isLast?: boolean;
}) => {
    const converted = scaleIngredientDisplay(ing, scaleFactor, measureMode);

    return (
        <button
            type="button"
            onClick={onToggle}
            className={'flex w-full items-start gap-4 py-3 md:py-4 text-right transition-all ' + (completed ? 'opacity-50' : 'hover:bg-slate-50') + ' ' + (!isLast ? 'border-b border-slate-200/60' : '')}
        >
            <div className={'mt-0.5 flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full transition-all ' + (completed ? 'text-[#236eff]' : 'border-2 border-slate-300 bg-transparent')}>
                {completed && <CheckCircle2 size={24} className="stroke-[2]" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className={'text-[15px] md:text-[17px] font-bold ' + (completed ? 'text-slate-500 line-through' : 'text-slate-900')}>
                    {ing.name}
                </div>
                <p className="mt-0.5 text-sm md:text-[15px] font-medium text-slate-500">
                    {converted.quantityLabel}{converted.unitLabel ? ' ' + converted.unitLabel : ''}
                </p>
                {converted.note && <p className="mt-0.5 text-xs text-slate-400">{converted.note}</p>}
            </div>
        </button>
    );
};

const StepTimer = ({ minutes }: { minutes: number }) => {
    const totalSeconds = minutes * 60;
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
    const [running, setRunning] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!running) return;

        const timer = window.setInterval(() => {
            setSecondsLeft((current) => {
                if (current <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }

                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [running]);

    useEffect(() => {
        if (secondsLeft === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRunning(false);
        }
    }, [secondsLeft]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSecondsLeft(totalSeconds);
        setRunning(false);
    }, [totalSeconds]);

    const minutesLabel = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const secondsLabel = String(secondsLeft % 60).padStart(2, '0');
    const isActive = running || secondsLeft < totalSeconds;
    const isDone = secondsLeft === 0;

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className={'mt-3 flex items-center gap-2 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition-colors ' + (isActive ? 'border-[#236eff]/30 bg-[#236eff]/10 text-[#236eff]' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#236eff]/30 hover:text-[#236eff]')}
            >
                <AlarmClock size={13} />
                {running ? `${minutesLabel}:${secondsLabel}` : `${minutes} דק׳`}
                {isDone && ' ✓'}
            </button>
        );
    }

    return (
        <div className="mt-3 rounded-[14px] border border-[#236eff]/14 bg-[#236eff]/[0.06] p-3">
            <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setExpanded(false)} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#236eff]">
                    <AlarmClock size={13} />טיימר לשלב
                </button>
                <div className="text-base font-mono font-semibold text-slate-900">{minutesLabel}:{secondsLabel}</div>
                <div className="flex gap-1.5">
                    <button type="button" onClick={() => setRunning((v) => !v)} className={BUTTON_SECONDARY}>
                        {running ? <Pause size={14} /> : <Play size={14} />}
                        {running ? 'עצור' : 'הפעל'}
                    </button>
                    <button type="button" onClick={() => { setSecondsLeft(totalSeconds); setRunning(false); }} className={BUTTON_TERTIARY}>
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const StepCard = ({
    step,
    completed,
    onToggleComplete,
    ingredients,
    scaleFactor,
    measureMode,
    ingredientImages = {},
}: {
    step: Step;
    completed: boolean;
    onToggleComplete: () => void;
    ingredients: NormalizedIngredient[];
    scaleFactor: number;
    measureMode: MeasureMode;
    ingredientImages?: Record<string, string>;
}) => {
    const stepMinutes = extractStepMinutes(step.text);

    return (
        <article
            onClick={onToggleComplete}
            className={'group relative cursor-pointer overflow-hidden rounded-[20px] border p-5 transition-all md:p-6 ' + (completed
                ? 'border-slate-100 bg-slate-50/50 opacity-70'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                )}
        >
            {/* Step badge with integrated checkbox */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <span className={'inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors ' + (completed ? 'bg-emerald-100 text-emerald-700' : 'bg-[#e7f3f1] text-[#2f6d63]')}>
                        <div className={'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-all ' + (completed ? 'bg-emerald-500 text-white' : 'border-2 border-current/40')}>
                            {completed && <CheckCircle2 size={12} className="stroke-[3]" />}
                        </div>
                        שלב {step.stepNumber}
                    </span>
                    {stepMinutes && (
                        <span className={'rounded-xl px-3 py-1.5 text-[13px] font-bold ' + (completed ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-700')}>
                            {stepMinutes} דק׳
                        </span>
                    )}
                </div>
            </div>

            {/* Instruction Text */}
            <div className="mt-3">
                <p className={'font-medium leading-relaxed transition-colors ' + (completed ? 'text-slate-400 line-through' : 'text-slate-900') + ' text-[15px] md:text-base'}>
                    {step.text}
                </p>
            </div>

            {/* Ingredient cubes */}
            {ingredients.length > 0 && (
                <div className={'flex gap-3 mt-4 overflow-x-auto no-scrollbar py-1 ' + (completed ? 'opacity-50' : '')}>
                    {ingredients.map((ing) => {
                        const imgUrl = ingredientImages[ing.name.toLowerCase().trim()];
                        const display = formatIngredientDisplay(ing, scaleFactor, measureMode);
                        return (
                            <div key={ing.id} className="flex flex-col items-center gap-1.5 min-w-[68px]">
                                <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden p-1">
                                    {imgUrl ? (
                                        <img
                                            src={imgUrl}
                                            alt={ing.name}
                                            className="h-full w-full object-contain"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <Utensils size={20} className="text-slate-300" />
                                    )}
                                </div>
                                <div className="text-center max-w-[68px]">
                                    <div className="text-[10px] font-bold text-slate-600 line-clamp-1">{ing.name}</div>
                                    {display.primary && (
                                        <div className="text-[9px] font-medium text-slate-400 line-clamp-1">{display.primary}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Timer if applicable */}
            {stepMinutes && !completed && <StepTimer minutes={stepMinutes} />}

        </article>
    );
};



const OriginalRecipeDrawer = ({
    open,
    onClose,
    url
}: {
    open: boolean;
    onClose: () => void;
    url: string;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:p-4">
            <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
            <aside className={'relative z-10 flex w-full max-w-[800px] flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 sm:rounded-[24px] ' + (isExpanded ? 'h-[92vh]' : 'h-[70vh] rounded-t-[24px]')}>
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 md:px-6">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200">
                            <X size={18} />
                        </button>
                        <div>
                            <h3 className="text-sm font-normal text-slate-700 md:text-base">הצצה למתכון המקורי</h3>
                            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-[#236eff] underline transition-colors hover:text-[#1d5bbf]">
                                פתח בדפדפן רגיל <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>
                    <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 rounded-[12px] bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200">
                        {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        {isExpanded ? 'כווץ' : 'הרחב'}
                    </button>
                </div>
                <div className="relative flex-1 bg-slate-50">
                    <iframe src={url} className="h-full w-full border-none bg-white" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" title="Original Recipe" />
                </div>
            </aside>
        </div>
    );
};

export const RecipeResult = ({ recipe, onBack, onSave }: RecipeResultProps) => {
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [completedIngredients, setCompletedIngredients] = useState<Set<number>>(new Set());
    const [measureMode, setMeasureMode] = useState<MeasureMode>('original');
    const [desiredServings, setDesiredServings] = useState(recipe.servings || 4);
    const [isScaleAccordionOpen, setIsScaleAccordionOpen] = useState(false);
    const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'steps' | 'ingredients' | 'original'>('steps');
    const [activeSection, setActiveSection] = useState<string>('');
    const [ingredientImages, setIngredientImages] = useState<Record<string, string>>({});
    const [panEnabled, setPanEnabled] = useState(false);
    const [basePanShape, setBasePanShape] = useState<PanShape>('round');
    const [basePanSize, setBasePanSize] = useState('24');
    const [targetPanShape, setTargetPanShape] = useState<PanShape>('round');
    const [targetPanSize, setTargetPanSize] = useState('24');
    const [showOriginal] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: recipe.title,
                    text: 'בדוק את המתכון הזה ל' + recipe.title + ' ב-Cookit!',
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('הקישור הועתק ללוח!');
        }
    };

    // Language toggle: swap between translated and original content
    const displayTitle = showOriginal && recipe.originalRecipe ? recipe.originalRecipe.title : recipe.title;
    const displayIngredients = showOriginal && recipe.originalRecipe ? recipe.originalRecipe.ingredients : recipe.ingredients;
    const displaySteps = showOriginal && recipe.originalRecipe ? recipe.originalRecipe.steps : recipe.steps;

    // Scroll to top when recipe view opens
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const names = recipe.ingredients.map(ing => ing.name.toLowerCase().trim());
                const mappings = await getIngredientImages(names);
                setIngredientImages(mappings);
            } catch (error) {
                console.error('Failed to pre-fetch ingredient images:', error);
            }
        };
        void fetchImages();
    }, [recipe.ingredients]);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let wakeLock: any = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    console.log('Wake Lock is active!');
                }
            } catch (err) {
                console.log('Wake Lock request failed:', err);
            }
        };

        void requestWakeLock();

        return () => {
            if (wakeLock) {
                wakeLock.release().catch(console.error);
            }
        };
    }, []);

    const toggleStep = (stepNumber: number) => {
        setCompletedSteps((current) => {
            const next = new Set(current);
            if (next.has(stepNumber)) next.delete(stepNumber);
            else next.add(stepNumber);
            return next;
        });
    };

    const toggleIngredient = (id: number) => {
        setCompletedIngredients((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const baseServings = recipe.servings || 4;
    const servingsScale = desiredServings / baseServings;
    const panScale = panEnabled ? calcPanArea(targetPanShape, targetPanSize) / calcPanArea(basePanShape, basePanSize) : 1;
    const totalScale = servingsScale * panScale;
    const progress = Math.round((completedSteps.size / Math.max(displaySteps.length, 1)) * 100);

    const stepsWithIngredients = useMemo(() => {
        return displaySteps.map((step) => ({
            step,
            ingredients: step.ingredientIds
                .map((id) => displayIngredients.find((ingredient) => ingredient.id === id))
                .filter(Boolean) as NormalizedIngredient[],
        }));
    }, [displayIngredients, displaySteps]);

    const groupedIngredients = useMemo(() => {
        const groups: Record<string, NormalizedIngredient[]> = { '': [] };
        displayIngredients.forEach((ing) => {
            const sec = ing.section || '';
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(ing);
        });
        return groups;
    }, [displayIngredients]);

    const groupedSteps = useMemo(() => {
        const groups: Record<string, typeof stepsWithIngredients> = {};
        stepsWithIngredients.forEach((item) => {
            const sec = item.step.section || '';
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(item);
        });
        return groups;
    }, [stepsWithIngredients]);

    // Sections with actual names (e.g. "לעוגה", "לציפוי")
    const namedSections = useMemo(
        () => Object.keys(groupedSteps).filter(s => s !== ''),
        [groupedSteps]
    );
    const hasSections = namedSections.length > 1;

    // Keep active section in sync when recipe changes
    useEffect(() => {
        setActiveSection(namedSections[0] ?? Object.keys(groupedSteps)[0] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recipe.sourceUrl]);

    return (
        <div className="min-h-screen bg-white">
            {/* HERO HEADER */}
            <header className="relative w-full h-[35vh] min-h-[300px] max-h-[480px] bg-slate-900 overflow-hidden">
                <img
                    src={recipe.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80'}
                    alt={recipe.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                    loading="lazy"
                    decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

                <div className="absolute top-4 right-4 z-10 flex gap-2 md:top-8 md:right-8">
                    <button
                        onClick={onBack}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30 border border-white/20 md:h-12 md:w-12 shadow-sm"
                    >
                        <ArrowRight size={20} />
                    </button>
                    <button
                        onClick={handleShare}
                        title="שיתוף מתכון"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30 border border-white/20 md:h-12 md:w-12 shadow-sm"
                    >
                        <Share2 size={20} />
                    </button>
                    <button
                        onClick={handlePrint}
                        title="הדפסה או שמירה כ-PDF"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30 border border-white/20 md:h-12 md:w-12 shadow-sm"
                    >
                        <Printer size={20} />
                    </button>
                    {onSave && (
                        <button
                            onClick={() => onSave(recipe)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2f6d63] transition-colors hover:bg-slate-50 md:h-12 md:w-12 shadow-sm"
                        >
                            <Bookmark size={20} />
                        </button>
                    )}
                </div>

                <div className="absolute bottom-0 w-full p-4 pb-6 md:p-8 md:pb-10">
                    <div className="mx-auto max-w-[1240px]">
                        {/* Title only */}
                        <h1 className="text-xl lg:text-2xl font-bold leading-tight text-white mb-3 drop-shadow-lg max-w-[800px]">
                            {displayTitle}
                        </h1>
                        
                        {/* Compact info row */}
                        <div className="flex items-center gap-4 text-[13px] font-medium text-white/90">
                            {recipe.totalTime && (
                                <span className="flex items-center gap-1.5">
                                    <Clock3 size={14} /> {formatDuration(recipe.totalTime)}
                                </span>
                            )}
                            {recipe.servings && (
                                <span className="flex items-center gap-1.5">
                                    <Users size={14} /> {recipe.servings} מנות
                                </span>
                            )}
                            {recipe.sourceName && (
                                <button 
                                    type="button" 
                                    onClick={() => setIsSourceDrawerOpen(true)} 
                                    className="flex items-center gap-1.5 underline underline-offset-2 hover:text-white transition-colors"
                                >
                                    <Globe size={14} /> {recipe.sourceName}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* EDGE-TO-EDGE TABS */}
            <div className="sticky top-0 z-30 flex border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                <div className="mx-auto flex w-full max-w-[1240px]">
                    <button
                        className={'flex-1 py-4 md:py-5 text-center text-[14px] md:text-[15px] font-medium border-b-[3px] transition-all ' + (activeTab === 'steps' ? 'border-[#2f6d63] text-[#2f6d63] bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/80')}
                        onClick={() => setActiveTab('steps')}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <ScanEye size={18} />
                            שלבי הכנה
                        </span>
                    </button>
                    <button
                        className={'flex-1 py-4 md:py-5 text-center text-[14px] md:text-[15px] font-medium border-b-[3px] transition-all ' + (activeTab === 'ingredients' ? 'border-[#2f6d63] text-[#2f6d63] bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/80')}
                        onClick={() => setActiveTab('ingredients')}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Utensils size={18} />
                            מצרכים <span className="opacity-60 bg-current/10 px-1.5 py-0.5 rounded-md text-[11px] font-medium">{displayIngredients.length}</span>
                        </span>
                    </button>
                    <button
                        className={'flex-1 py-4 md:py-5 text-center text-[14px] md:text-[15px] font-medium border-b-[3px] transition-all ' + (activeTab === 'original' ? 'border-[#2f6d63] text-[#2f6d63] bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/80')}
                        onClick={() => setActiveTab('original')}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Globe size={18} />
                            המתכון המקורי
                        </span>
                    </button>
                </div>
            </div>

            <div className="mx-auto max-w-[850px] px-3 py-6 md:px-8 md:py-10">
                {activeTab === 'ingredients' && (
                    <aside className="md:px-0">
                        <section className="mb-6 rounded-[24px] border border-[#236eff]/15 bg-[#f4f8fe] shadow-sm overflow-hidden">
                            <button type="button" className="flex w-full items-center justify-between gap-3 text-right p-4 md:p-5" onClick={() => setIsScaleAccordionOpen(!isScaleAccordionOpen)}>
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#236eff]">
                                        <Scaling size={15} />
                                        התאמות חכמות
                                    </div>
                                    <div className="mt-1.5 text-[14px] md:text-[15px] font-medium text-slate-900">הכמויות מחושבות לפי {formatServingsLabel(desiredServings)}</div>
                                    <div className="mt-0.5 text-sm text-slate-500">
                                        {measureMode === 'home' ? 'מוצג בכוסות וכפות' : 'תצוגה מקורית'}
                                    </div>
                                </div>
                                <div className={'mt-1 flex items-center justify-center rounded-full transition-all duration-300 ' + (isScaleAccordionOpen ? 'bg-[#236eff] text-white p-2.5' : 'bg-white text-[#236eff] p-2.5 shadow-sm border border-[#236eff]/20 hover:scale-105')}>
                                    {isScaleAccordionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </button>

                            {isScaleAccordionOpen && (
                                <div className="border-t border-[#236eff]/10 bg-white/60 p-4 md:p-5 flex flex-col gap-6">
                                    <div>
                                        <div className="mb-3 text-sm font-semibold text-slate-900">התאמת מנות (המקור: {formatServingsLabel(baseServings)})</div>
                                        <div className="flex flex-wrap gap-2">
                                            {[0.5, 1, 1.5, 2].map((m) => {
                                                const act = Math.abs(desiredServings - baseServings * m) < 0.05;
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setDesiredServings(Number((baseServings * m).toFixed(2)))}
                                                        className={act ? BUTTON_PRIMARY : BUTTON_SECONDARY}
                                                    >
                                                        ×{formatScaledNumber(m)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-4 flex items-center gap-3">
                                            <button type="button" onClick={() => setDesiredServings((v) => Math.max(1, Number((v - 1).toFixed(2))))} className={BUTTON_TERTIARY}>-</button>
                                            <div className="flex-1 rounded-[14px] bg-white border border-slate-200 px-4 py-2.5 text-center font-bold text-slate-950 shadow-sm">{formatServingsLabel(desiredServings)}</div>
                                            <button type="button" onClick={() => setDesiredServings((v) => Number((v + 1).toFixed(2)))} className={BUTTON_TERTIARY}>+</button>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-3 text-sm font-semibold text-slate-900">יחידות מידה</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setMeasureMode('original')} className={measureMode === 'original' ? BUTTON_PRIMARY : BUTTON_SECONDARY}>מקורי</button>
                                            <button type="button" onClick={() => setMeasureMode('home')} className={measureMode === 'home' ? BUTTON_PRIMARY : BUTTON_SECONDARY}>כוסות וכפות</button>
                                        </div>
                                    </div>

                                    {/* Pan Calculator - only show if recipe has pan info or user enables it */}
                                    {(recipe.panSize || recipe.panShape || panEnabled) && (
                                    <div>
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="text-sm font-semibold text-slate-900">
                                                מחשבון תבניות
                                                {recipe.panSize && (
                                                    <span className="mr-2 text-xs font-normal text-slate-500">
                                                        (מתכון לתבנית {recipe.panShape === 'round' ? 'עגולה' : recipe.panShape === 'rectangular' ? 'מלבנית' : recipe.panShape === 'square' ? 'מרובעת' : ''} {recipe.panSize} ס״מ)
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                dir="ltr"
                                                onClick={() => setPanEnabled(!panEnabled)}
                                                className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors ' + (panEnabled ? 'bg-[#2f6d63]' : 'bg-slate-200')}
                                            >
                                                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${panEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        {panEnabled && (
                                            <div className="space-y-4 rounded-[16px] border border-slate-200/80 bg-white p-4">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-500 mb-2">תבנית מקור (של המתכון)</div>
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {PAN_SHAPES_DATA.map((s) => (
                                                            <button key={s.key} type="button" onClick={() => { setBasePanShape(s.key); setBasePanSize(s.sizes[Math.min(2, s.sizes.length - 1)]); }} className={'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-all ' + (basePanShape === s.key ? 'bg-[#2f6d63] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                                                                <PanShapeIcon shape={s.key} size={16} />
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {PAN_SHAPES_DATA.find(s => s.key === basePanShape)?.sizes.map((sz) => (
                                                            <button key={sz} type="button" onClick={() => setBasePanSize(sz)} className={'rounded-lg px-3 py-1 text-[12px] font-bold transition-all ' + (basePanSize === sz ? 'bg-[#236eff] text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100')}>
                                                                {sz} ס״מ
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-center gap-6 py-2">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <PanShapeIcon shape={basePanShape} size={40} />
                                                        <span className="text-[10px] font-bold text-slate-400">{basePanSize} ס״מ</span>
                                                    </div>
                                                    <span className="text-lg font-medium text-slate-300">→</span>
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <PanShapeIcon shape={targetPanShape} size={40} />
                                                        <span className="text-[10px] font-bold text-[#2f6d63]">{targetPanSize} ס״מ</span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-xs font-bold text-slate-500 mb-2">תבנית יעד</div>
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {PAN_SHAPES_DATA.map((s) => (
                                                            <button key={s.key} type="button" onClick={() => { setTargetPanShape(s.key); setTargetPanSize(s.sizes[Math.min(2, s.sizes.length - 1)]); }} className={'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-all ' + (targetPanShape === s.key ? 'bg-[#2f6d63] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                                                                <PanShapeIcon shape={s.key} size={16} />
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {PAN_SHAPES_DATA.find(s => s.key === targetPanShape)?.sizes.map((sz) => (
                                                            <button key={sz} type="button" onClick={() => setTargetPanSize(sz)} className={'rounded-lg px-3 py-1 text-[12px] font-bold transition-all ' + (targetPanSize === sz ? 'bg-[#236eff] text-white' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100')}>
                                                                {sz} ס״מ
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {panScale !== 1 && (
                                                    <div className="text-center rounded-lg bg-[#e7f3f1] py-2 text-sm font-bold text-[#2f6d63]">
                                                        יחס שטח: ×{formatScaledNumber(panScale)} — הכמויות מותאמות
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="bg-white rounded-[28px] p-4 py-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100">
                            <div className="mb-4 px-2 flex items-baseline justify-between">
                                <h2 className="flex items-center gap-2 text-base font-normal text-slate-700">
                                    רשימת מצרכים
                                </h2>
                                <div className="flex items-center gap-2 text-[13px] font-bold text-slate-500">
                                    {completedIngredients.size} / {displayIngredients.length}
                                </div>
                            </div>
                            <section>
                                {Object.entries(groupedIngredients).map(([sectionName, ings]) => (
                                    <div key={sectionName} className="mb-6 last:mb-0 mt-6 first:mt-2">
                                        {sectionName && (
                                            <h3 className="mb-3 px-2 text-[13px] font-bold uppercase tracking-wider text-slate-400">{sectionName}</h3>
                                        )}
                                        <div className="flex flex-col">
                                            {ings.map((ing, index) => (
                                                <IngredientItem
                                                    key={ing.id}
                                                    ing={ing}
                                                    completed={completedIngredients.has(ing.id)}
                                                    onToggle={() => toggleIngredient(ing.id)}
                                                    scaleFactor={totalScale}
                                                    measureMode={measureMode}
                                                    isLast={index === ings.length - 1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        </section>
                    </aside>
                )}

                {activeTab === 'original' && (
                    <div className="flex flex-col items-center gap-4">
                        {recipe.sourceUrl && !recipe.sourceUrl.startsWith('mock://') ? (
                            <div className="w-full rounded-[20px] border border-slate-200 overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 200px)' }}>
                                <iframe
                                    src={recipe.sourceUrl}
                                    className="h-full w-full border-none"
                                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                    title="המתכון המקורי"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 py-20 text-center">
                                <Globe size={48} className="text-slate-300" />
                                <p className="text-lg font-bold text-slate-400">מתכון מובנה – אין עמוד מקור</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'steps' && (
                    <section className="relative">
                        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between px-2">
                            <div>
                                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#2f6d63] mb-1">זרימת הכנה</div>
                                <h2 className="text-base font-medium text-slate-900">אופן ההכנה</h2>
                            </div>
                        </div>

                        <div className="mb-8 px-2">
                            <div className="mb-2 text-[13px] font-bold text-slate-500">
                                {completedSteps.size} מתוך {recipe.steps.length} הושלמו
                            </div>
                            <div className="overflow-hidden rounded-full bg-slate-100 h-2.5 shadow-inner">
                                <div
                                    className="h-full rounded-full bg-[linear-gradient(90deg,#2f6d63,#6ee7b7)] transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* ── Section tabs (only when recipe has multiple named sections) ── */}
                        {hasSections && (
                            <div className="mb-5 flex items-center gap-2 overflow-x-auto no-scrollbar">
                                {/* Vertical dot timeline */}
                                <div className="flex shrink-0 flex-col items-center gap-1 self-stretch py-1">
                                    {namedSections.map((sec, i) => (
                                        <div key={sec} className="flex flex-col items-center">
                                            <button
                                                onClick={() => setActiveSection(sec)}
                                                className={`h-3 w-3 rounded-full transition-all ${activeSection === sec ? 'bg-[#2f6d63] scale-125' : 'bg-slate-200 hover:bg-slate-300'}`}
                                                aria-label={sec}
                                            />
                                            {i < namedSections.length - 1 && (
                                                <div className="w-[2px] flex-1 min-h-[6px] bg-slate-100 my-0.5" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {/* Section pill buttons */}
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    {namedSections.map(sec => {
                                        const secItems = groupedSteps[sec] ?? [];
                                        const doneCount = secItems.filter(({ step }) => completedSteps.has(step.stepNumber)).length;
                                        const isActive = activeSection === sec;
                                        return (
                                            <button
                                                key={sec}
                                                onClick={() => setActiveSection(sec)}
                                                className={`shrink-0 rounded-2xl px-4 py-2 text-[13px] font-bold transition-all border ${
                                                    isActive
                                                        ? 'bg-[#2f6d63] text-white border-[#2f6d63] shadow-sm'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                {sec}
                                                <span className={`mr-1.5 text-[11px] font-medium ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                                                    {doneCount}/{secItems.length}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 md:space-y-5">
                            {hasSections ? (
                                // Show only active section
                                (groupedSteps[activeSection] ?? []).map(({ step, ingredients }) => (
                                    <StepCard
                                        key={step.stepNumber}
                                        step={step}
                                        ingredients={ingredients}
                                        scaleFactor={totalScale}
                                        measureMode={measureMode}
                                        ingredientImages={ingredientImages}
                                        completed={completedSteps.has(step.stepNumber)}
                                        onToggleComplete={() => toggleStep(step.stepNumber)}
                                    />
                                ))
                            ) : (
                                // Single / no section — render all as before
                                Object.entries(groupedSteps).map(([sectionName, items]) => (
                                    <div key={sectionName} className="mb-8">
                                        {sectionName && (
                                            <h3 className="mb-4 px-2 text-lg font-medium text-slate-800">{sectionName}</h3>
                                        )}
                                        <div className="space-y-4">
                                            {items.map(({ step, ingredients }) => (
                                                <StepCard
                                                    key={step.stepNumber}
                                                    step={step}
                                                    ingredients={ingredients}
                                                    scaleFactor={totalScale}
                                                    measureMode={measureMode}
                                                    ingredientImages={ingredientImages}
                                                    completed={completedSteps.has(step.stepNumber)}
                                                    onToggleComplete={() => toggleStep(step.stepNumber)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {recipe.tags && recipe.tags.length > 0 && (
                            <div className="mt-12 flex flex-wrap justify-center gap-2 pt-8 border-t border-slate-100 px-2">
                                {recipe.tags.map((tag) => (
                                    <span key={tag} className="rounded-[14px] border border-slate-200/80 bg-white px-4 py-2 text-[13px] font-bold text-slate-600 shadow-sm hover:border-[#2f6d63] hover:text-[#2f6d63] transition-colors cursor-default">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>

            <OriginalRecipeDrawer
                open={isSourceDrawerOpen}
                onClose={() => setIsSourceDrawerOpen(false)}
                url={recipe.sourceUrl || ''}
            />
        </div>
    );
};

