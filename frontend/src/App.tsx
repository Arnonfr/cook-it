import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Globe,
  Home,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Salad,
  User,
  Users,
  Wand2,
  X,
  ChevronRight,
  Pencil,
  Check,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { fetchCommunityRecipes, fetchLibrary, getIngredientImages, parseRecipe, searchUnified, searchLocalOnly, saveRecipe, fetchSettings, updateSettings, warmUpBackend, enrichRecipe } from './api';
import type { SettingsResponse, EnrichmentData } from './api';
import { ShareToast } from './components/ShareToast';
import { SkeletonHero } from './components/Skeleton';

// Lazy load heavy components
const RecipeResult = lazy(() => import('./components/RecipeResult').then(m => ({ default: m.RecipeResult })));
import type { ParsedRecipe, SearchResult } from './types';

type View = 'home' | 'search' | 'recipe' | 'fallback' | 'profile' | 'library';

const DIETARY_OPTIONS = [
  { id: 'meat',    label: 'בשר',         emoji: '🥩' },
  { id: 'chicken', label: 'עוף',         emoji: '🍗' },
  { id: 'fish',    label: 'דגים',        emoji: '🐟' },
  { id: 'dairy',   label: 'חלב/גבינה',  emoji: '🧀' },
  { id: 'eggs',    label: 'ביצים',       emoji: '🥚' },
  { id: 'gluten',  label: 'גלוטן',       emoji: '🌾' },
  { id: 'nuts',    label: 'אגוזים',      emoji: '🥜' },
  { id: 'soy',     label: 'סויה',        emoji: '🫘' },
];

const loadDietaryPrefs = (): string[] => {
  try { return JSON.parse(localStorage.getItem('dietary_prefs') || '[]'); } catch { return []; }
};
const loadDisplayName = (): string => localStorage.getItem('display_name') || '';

/* ─── Profile View ─── */
/* ─── API Key Field ─── */
const ApiKeyField = ({
  label, description, keyName, initialMasked, initialValid, initialSet
}: {
  label: string; description: string; keyName: string;
  initialMasked: string; initialValid: boolean; initialSet: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isValid, setIsValid] = useState(initialValid);
  const [isSet, setIsSet] = useState(initialSet);
  const [masked, setMasked] = useState(initialMasked);

  const save = async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await updateSettings({ [keyName]: value.trim() });
      setMasked(value.trim().slice(0, 4) + '...' + value.trim().slice(-4));
      setIsSet(true);
      setIsValid(true);
      setSaved(true);
      setEditing(false);
      setValue('');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // keep editing open on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-slate-800">{label}</span>
            {isSet && isValid && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
            {isSet && !isValid && <AlertCircle size={14} className="text-amber-500 shrink-0" />}
            {!isSet && <AlertCircle size={14} className="text-red-400 shrink-0" />}
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5">{description}</p>
          {isSet && (
            <span className="mt-1 inline-block font-mono text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">
              {masked || '•••'}
            </span>
          )}
          {saved && <span className="mr-2 text-[12px] text-emerald-600 font-bold">✓ נשמר</span>}
        </div>
        <button
          onClick={() => { setEditing(e => !e); setValue(''); }}
          className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Pencil size={12} />
          {isSet ? 'עדכן' : 'הגדר'}
        </button>
      </div>
      {editing && (
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <input
              autoFocus
              type={show ? 'text' : 'password'}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void save()}
              placeholder={`הדבק ${label}...`}
              className="w-full rounded-[12px] border border-slate-200 px-3 py-2.5 text-[13px] font-mono text-slate-800 outline-none focus:border-[#236EFF] pr-9 bg-white"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={() => void save()}
            disabled={saving || !value.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#236EFF] text-white disabled:opacity-50 hover:bg-[#0B52DB] transition-colors"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
        </div>
      )}

    </div>
  );
};

const ProfileView = ({ onBack, keepScreenOn, onKeepScreenOnChange }: { onBack: () => void; keepScreenOn: boolean; onKeepScreenOnChange: (v: boolean) => void }) => {
  const [restricted, setRestricted] = useState<string[]>(loadDietaryPrefs);
  const [name, setName] = useState(loadDisplayName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(name);
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // New preference states
  const [servings, setServings] = useState(() => localStorage.getItem('default_servings') || '4');
  const [cookingTime, setCookingTime] = useState(() => localStorage.getItem('preferred_time') || 'any');
  const [cuisines, setCuisines] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('preferred_cuisines') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    fetchSettings()
      .then(s => setSettings(s))
      .catch(() => setSettings(null))
      .finally(() => setSettingsLoading(false));
  }, []);

  const toggle = (id: string) => {
    setRestricted(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('dietary_prefs', JSON.stringify(next));
      return next;
    });
  };

  const saveName = () => {
    setName(nameInput);
    localStorage.setItem('display_name', nameInput);
    setEditingName(false);
  };
  
  const updateServings = (num: string) => {
    setServings(num);
    localStorage.setItem('default_servings', num);
  };
  
  const updateCookingTime = (time: string) => {
    setCookingTime(time);
    localStorage.setItem('preferred_time', time);
  };
  
  const toggleCuisine = (id: string) => {
    setCuisines(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      localStorage.setItem('preferred_cuisines', JSON.stringify(next));
      return next;
    });
  };

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200">
          <ChevronRight size={20} />
        </button>
        <h1 className="text-base font-normal text-slate-700">פרופיל</h1>
      </div>

      <div className="space-y-5 pb-24">
        {/* Avatar + Name */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5 flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#2f6d63] to-[#6ee7b7] flex items-center justify-center text-white text-3xl font-medium shadow-md">
            {name ? name.charAt(0).toUpperCase() : <User size={36} />}
          </div>
          {editingName ? (
            <div className="flex items-center gap-2 w-full max-w-[220px]">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                placeholder="השם שלך"
                className="flex-1 rounded-[12px] border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-[#2f6d63]"
              />
              <button onClick={saveName} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2f6d63] text-white">
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => { setNameInput(name); setEditingName(true); }} className="flex items-center gap-2 text-slate-700 hover:text-[#2f6d63] transition-colors">
              <span className="text-[17px] font-bold">{name || 'הוסף שם'}</span>
              <Pencil size={14} className="text-slate-400" />
            </button>
          )}
        </div>

        {/* Dietary Restrictions */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="mb-1 text-sm font-normal text-slate-700">הגבלות תזונתיות</h2>
          <p className="mb-4 text-[13px] text-slate-500">סמן את מה שאתה <span className="font-bold text-red-500">לא</span> אוכל</p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map(opt => {
              const active = restricted.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggle(opt.id)}
                  className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-[13px] font-bold transition-all ${
                    active
                      ? 'border-red-400 bg-red-50 text-red-600 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                  {active && <span className="text-[10px] font-black text-red-400">✕</span>}
                </button>
              );
            })}
          </div>
          {restricted.length > 0 && (
            <p className="mt-4 text-[12px] text-slate-400">
              {restricted.length} הגבלה{restricted.length > 1 ? 'ות' : ''} מוגדרת{restricted.length > 1 ? 'ות' : ''}
            </p>
          )}
        </div>

        {/* API Keys */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-[#236EFF]" />
            <h2 className="text-sm font-normal text-slate-700">מפתחות API</h2>
          </div>
          {settingsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : settings ? (
            <div className="space-y-4">
              <ApiKeyField
                label="Gemini API Key"
                description="חילוץ ותרגום מתכונים — נדרש מ-Google AI Studio"
                keyName="geminiApiKey"
                initialMasked={settings.geminiApiKey.masked}
                initialValid={settings.geminiApiKey.valid}
                initialSet={settings.geminiApiKey.set}
              />
              <ApiKeyField
                label="Serper API Key"
                description="חיפוש מתכונים מהאינטרנט — נדרש מ-serper.dev"
                keyName="serperApiKey"
                initialMasked={settings.serperApiKey.masked}
                initialValid={settings.serperApiKey.valid}
                initialSet={settings.serperApiKey.set}
              />
            </div>
          ) : (
            <p className="text-[13px] text-slate-400 text-center py-2">לא ניתן להתחבר לשרת</p>
          )}
        </div>

        {/* Cooking Preferences */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="mb-4 text-sm font-normal text-slate-700 flex items-center gap-2">
            <Clock3 size={16} className="text-[#2f6d63]" />
            העדפות בישול
          </h2>
          
          {/* Default Servings */}
          <div className="mb-4">
            <label className="text-[13px] text-slate-500 block mb-2">מספר מנות ברירת מחדל</label>
            <div className="flex gap-2">
              {['2', '4', '6', '8'].map(num => (
                <button
                  key={num}
                  onClick={() => updateServings(num)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    servings === num
                      ? 'bg-[#2f6d63] text-white'
                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          {/* Preferred Cooking Time */}
          <div>
            <label className="text-[13px] text-slate-500 block mb-2">זמן בישול מועדף</label>
            <div className="flex gap-2">
              {[
                { key: 'quick', label: 'מהיר', desc: 'עד 30 דקות' },
                { key: 'medium', label: 'בינוני', desc: '30-60 דקות' },
                { key: 'any', label: 'ללא הגבלה', desc: 'הכל' }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => updateCookingTime(opt.key)}
                  className={`flex-1 py-2 px-1 rounded-xl text-center transition-all ${
                    cookingTime === opt.key
                      ? 'bg-[#e6fcf6] border-2 border-[#2f6d63]'
                      : 'bg-slate-50 border-2 border-transparent'
                  }`}
                >
                  <div className={`text-sm font-bold ${cookingTime === opt.key ? 'text-[#2f6d63]' : 'text-slate-600'}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preferred Cuisines */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="mb-4 text-sm font-normal text-slate-700 flex items-center gap-2">
            <Globe size={16} className="text-[#2f6d63]" />
            סוגי מטבח מועדפים
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'israeli', label: 'ישראלי', emoji: '🇮🇱' },
              { id: 'italian', label: 'איטלקי', emoji: '🇮🇹' },
              { id: 'asian', label: 'אסייתי', emoji: '🍜' },
              { id: 'mediterranean', label: 'ים תיכוני', emoji: '🫒' },
              { id: 'mexican', label: 'מקסיקני', emoji: '🌮' },
              { id: 'indian', label: 'הודי', emoji: '🍛' },
              { id: 'french', label: 'צרפתי', emoji: '🥐' },
              { id: 'american', label: 'אמריקאי', emoji: '🍔' }
            ].map(cuisine => {
              const isSelected = cuisines.includes(cuisine.id);
              return (
                <button
                  key={cuisine.id}
                  onClick={() => toggleCuisine(cuisine.id)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-bold transition-all active:scale-95 ${
                    isSelected
                      ? 'border-[#2f6d63] bg-[#e6fcf6] text-[#2f6d63]'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <span>{cuisine.emoji}</span>
                  {cuisine.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Screen & Display */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="mb-3 text-sm font-normal text-slate-700 flex items-center gap-2">
            <span>☀️</span>תצוגה
          </h2>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <div className="text-sm text-slate-700">שמור מסך דלוק</div>
              <div className="text-xs text-slate-400 mt-0.5">מונע כיבוי מסך בזמן בישול</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={keepScreenOn}
              onClick={() => onKeepScreenOnChange(!keepScreenOn)}
              className={'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ' + (keepScreenOn ? 'bg-[#2f6d63]' : 'bg-slate-200')}
            dir="ltr"
            >
              <span className={'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ' + (keepScreenOn ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </label>
        </div>

        {/* Auto Translate Settings */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="mb-3 text-sm font-normal text-slate-700 flex items-center gap-2">
            <Globe size={16} className="text-[#2f6d63]" />
            תרגום אוטומטי
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localStorage.getItem('auto_translate') === 'true'}
                onChange={(e) => {
                  localStorage.setItem('auto_translate', e.target.checked.toString());
                  // Force re-render
                  window.location.reload();
                }}
                className="w-5 h-5 rounded border-slate-300 text-[#2f6d63] focus:ring-[#2f6d63]"
              />
              <span className="text-sm text-slate-700">תרגם מתכונים אוטומטית</span>
            </label>
            
            {localStorage.getItem('auto_translate') === 'true' && (
              <div className="pt-2">
                <label className="block text-xs text-slate-500 mb-2">שפת יעד:</label>
                <select
                  value={localStorage.getItem('target_language') || 'he'}
                  onChange={(e) => {
                    localStorage.setItem('target_language', e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="he">עברית</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* App info */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5">
          <h2 className="mb-3 text-sm font-normal text-slate-700">על האפליקציה</h2>
          <div className="space-y-2 text-[13px] text-slate-500">
            <div className="flex justify-between"><span>גרסה</span><span className="font-bold text-[#2f6d63]">1.0.3</span></div>
            <div className="flex justify-between"><span>תאריך</span><span className="font-bold text-slate-700">2025-03-22</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              שיפורים בגרסה זו:<br/>
              • שיפור אבטחה והגנת API<br/>
              • שיפור חילוץ מתכונים<br/>
              • תיקוני באגים ושיפורי ביצועים
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Library View ─── */
function LibraryView({ recipes, onOpen }: { recipes: ParsedRecipe[]; onOpen: (r: ParsedRecipe) => void; onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);

  const FILTERS = ['מהירים', 'בשרי', 'צמחוני', 'אפייה', 'מרקים'];

  const filtered = recipes.filter(r => {
    const matchSearch = !search || r.title?.includes(search) || r.sourceName?.includes(search);
    const matchFilter = !filter || (r.tags ?? []).some(t => t.includes(filter)) || r.title?.includes(filter) || r.difficulty?.includes(filter);
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-[#F0F4F8] pb-28" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#F0F4F8]/90 backdrop-blur-md pt-12 pb-3 px-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-3">הספרייה שלי</h1>
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש בספרייה..."
            className="w-full rounded-[14px] border border-slate-200 bg-white py-3 pr-9 pl-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#236EFF]/30"
          />
        </div>
        {/* Filter pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(filter === f ? null : f)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${filter === f ? 'bg-[#236EFF] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 mt-2 space-y-3">
        {filtered.length === 0 ? (
          <div className="mt-20 text-center text-slate-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
            <p>{recipes.length === 0 ? 'הספרייה ריקה — חלץ מתכון כדי להתחיל' : 'אין תוצאות לחיפוש זה'}</p>
          </div>
        ) : filtered.map((recipe, i) => (
          <article
            key={recipe.sourceUrl || i}
            onClick={() => onOpen(recipe)}
            className="flex gap-3 cursor-pointer rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-all active:scale-[0.96] active:opacity-80"
          >
            <img
              src={recipe.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=70'}
              alt={recipe.title}
              className="h-24 w-24 shrink-0 rounded-[14px] object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[1rem] font-bold leading-5 text-slate-950">{recipe.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{recipe.sourceName || ''}</p>
              <div className="mt-2 flex gap-2 text-[11px] text-slate-500 flex-wrap">
                {recipe.totalTime && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-bold">
                    <Clock3 size={10} />{recipe.totalTime}
                  </span>
                )}
                {recipe.servings && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 font-bold">
                    <Users size={10} />{recipe.servings} מ׳
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
        <p className="text-center text-xs text-slate-400 py-4">{filtered.length} מתכונים</p>
      </div>
    </div>
  );
}

const MOCK_USER_ID = 'user-123';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'אנגלית',
  fr: 'צרפתית',
  de: 'גרמנית',
  es: 'ספרדית',
  it: 'איטלקית',
  pt: 'פורטוגזית',
  ar: 'ערבית',
  ru: 'רוסית',
  tr: 'טורקית',
  ja: 'יפנית',
  zh: 'סינית',
  ko: 'קוריאנית',
  nl: 'הולנדית',
  pl: 'פולנית',
  sv: 'שוודית',
  th: 'תאילנדית',
};

const quickCategories = [
  { label: 'אפייה', emoji: '🍞' },
  { label: 'אסייתי', emoji: '🍜' },
  { label: 'מרקים', emoji: '🥣' },
  { label: 'סלטים', emoji: '🥗' },
  { label: 'עיקריות', emoji: '🍽️' },
];

const formatDuration = (duration?: string) => {
  if (!duration) return 'ללא זמן';
  const hours = Number(duration.match(/(\d+)H/)?.[1] || 0);
  const minutes = Number(duration.match(/(\d+)M/)?.[1] || 0);
  const parts = [];
  if (hours) parts.push(`${hours} ש׳`);
  if (minutes) parts.push(`${minutes} דק׳`);
  return parts.length > 0 ? parts.join(' ') : duration.replace('PT', '');
};

/* ─── Ingredient string parser ─── */
const HEBREW_UNITS = ['כוסות', 'כוס', 'כפות', 'כף', 'כפיות', 'כפית', 'ק"ג', 'גרם', 'מ"ל', 'ליטר', "יח'", 'יחידות', 'קורט', 'חבילות', 'חבילה', 'פרוסות', 'פרוסה', 'ענפים', 'ענף', 'שיני', 'שן', 'קופסאות', 'קופסה', 'מיכל'];

function parseIngredientString(str: string): { amount: string; name: string } {
  const qMatch = str.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞])\s*/);
  if (!qMatch) return { amount: '', name: str };

  let amount = qMatch[1];
  let rest = str.slice(qMatch[0].length);

  for (const unit of HEBREW_UNITS) {
    if (rest === unit || rest.startsWith(unit + ' ')) {
      amount += ' ' + unit;
      rest = rest.slice(unit.length).trimStart();
      break;
    }
  }

  return { amount, name: rest || str };
}

const INGREDIENT_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-amber-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-sky-400 to-blue-500',
  'from-lime-400 to-green-500',
  'from-fuchsia-400 to-purple-500',
  'from-yellow-400 to-orange-500',
];

/* ─── Ingredient Carousel ─── */
const IngredientCarousel = ({ ingredients }: { ingredients: string[] | { name: string }[] }) => {
  const [images, setImages] = useState<Record<string, string>>({});
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchImages = async () => {
      if (!ingredients || ingredients.length === 0) return;
      setLoading(true);
      try {
        const rawStrings = ingredients.map(ing => typeof ing === 'string' ? ing : ing.name);
        const names = rawStrings.map(s => parseIngredientString(s).name || s);
        const mappings = await getIngredientImages(names);
        setImages(mappings);
      } catch (e) {
        console.error('Failed to fetch ingredient images', e);
      } finally {
        setLoading(false);
      }
    };
    void fetchImages();
  }, [ingredients]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 px-1">
        {loading ? (
          <div className="flex gap-3 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center gap-2 w-[68px]">
                <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                <div className="h-3 w-12 rounded bg-slate-100" />
                <div className="h-2 w-8 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : ingredients.map((ing, idx) => {
          const raw = typeof ing === 'string' ? ing : ing.name;
          const { amount, name } = parseIngredientString(raw);
          const displayName = name || raw;
          const imageKey = displayName.toLowerCase().trim();
          const imageUrl = images[imageKey];
          const hasFailed = failedImages.has(imageKey);
          const colorClass = INGREDIENT_COLORS[idx % INGREDIENT_COLORS.length];
          const initial = displayName.charAt(0);

          return (
            <div key={idx} className="flex shrink-0 flex-col items-center gap-1.5 w-[68px]">
              <div className="group relative h-12 w-12 overflow-hidden rounded-2xl shadow-sm transition-all hover:scale-105">
                {imageUrl && !hasFailed ? (
                  <img
                    src={imageUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    onError={() => setFailedImages(prev => new Set([...prev, imageKey]))}
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                    {initial ? (
                      <span className="text-white font-bold text-lg leading-none">{initial}</span>
                    ) : (
                      <Salad size={20} className="text-white/80" />
                    )}
                  </div>
                )}
              </div>
              <div className="w-full text-center px-0.5">
                <div className="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-2" title={displayName}>
                  {displayName}
                </div>
                {amount && (
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">{amount}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Community Card (narrow, for horizontal scroll) ─── */
const CommunityCard = ({
  recipe,
  onOpen,
}: {
  recipe: SearchResult | ParsedRecipe;
  onOpen: () => void;
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-[calc(50vw-28px)] max-w-[190px] shrink-0 overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm text-right transition-shadow hover:shadow-md active:scale-[0.96] active:opacity-80 transition-transform duration-75"
  >
    <img
      src={recipe.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80'}
      alt={recipe.title}
      className="h-[120px] w-full object-cover"
    />
    <div className="p-2.5">
      <h4 className="line-clamp-2 text-[13px] font-bold leading-[1.25] text-slate-950">{recipe.title}</h4>
      <p className="mt-1 truncate text-[11px] text-slate-500">{recipe.sourceName || 'מקור'}</p>
    </div>
  </button>
);

/* ─── Recipe List Row ─── */
const RecipeListRow = ({
  recipe,
  onOpen,
  onSave,
  onBlock,
  showLanguage,
  enrichment,
}: {
  recipe: SearchResult;
  onOpen: () => void;
  onSave?: (recipe: SearchResult) => void;
  onBlock?: (domain: string) => void;
  showLanguage?: boolean;
  enrichment?: EnrichmentData;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(recipe.isMine ?? false);
  const [menuOpen, setMenuOpen] = useState(false);
  const langCode = recipe.originalLanguage;
  const langName = langCode && langCode !== 'he' ? LANGUAGE_NAMES[langCode] || langCode : null;

  // Merge enrichment data over base recipe data
  const displayImage = enrichment?.image || recipe.image;
  const displayTime = enrichment?.totalTime || recipe.totalTime;
  const displayServings = enrichment?.servings || recipe.servings;
  const ingredientsSource = (enrichment?.ingredientsPreview?.length ? enrichment.ingredientsPreview : recipe.ingredientsPreview) ?? [];

  // Filter out scraped snippets masquerading as ingredients (too long, no quantity pattern)
  // Allow items with numbers, measurements, or common ingredient words
  const validIngredients = ingredientsSource.filter(
    s => s.length <= 70 && /\d|כוס|כוסות|כף|כפות|כפית|כפיות|גרם|ק"ג|מ"ל|ליטר|יח|יחידה|קורט|שן|שיני|פרוס|חביל|קופס|שוקולד|בצל|שום|שמן|מלח|פלפל|סוכר|קמח|ביצ|חלב|גבינ|חמא|לימון|עשבי|תיבול|פסטה|אורז|בשר|עוף|דג|ירק|פירות|קינמון|אורגנו|בזיליקום|עגבנ|גזר|תפוח|תפו"א|בטטה|חציל|פטרי|תירס|נענע|פטרוזיליה|כוסברה|שמיר|סלרי|כרוב|חסה|מלפפון|אבוקדו|בננה|תפוז|לימון|תות|תפוח|אגס|שזיף|אפרסק|מנגו|אננס|דובדבן|אגוז|שקד|אגס|קישוא|פלפל|חלה|לחם|עוגה|בבקה|סופלה|מאפה|פשטידה|קציץ|סטייק|נתח|שניצל|כרעיים|כנף|חזה|שוק|בשר|טחון|עוף|הודו|ברווז|כבש|בקר|עגל|סלמון|אמנון|לברק|דניס|מושט|טונה|סרדין|מרלוז|קוד|פילה/i.test(s)
  );

  return (
    <div
      className="relative rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)] overflow-hidden cursor-pointer hover:border-[#2f6d63]/30 hover:shadow-md transition-all active:scale-[0.96] active:opacity-80"
      onClick={onOpen}
    >
      {/* Backdrop to close 3-dot menu */}
      {onBlock && menuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
        />
      )}
      {/* Main card row */}
      <div className="flex gap-3 p-3">
        <img
          src={displayImage || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80'}
          alt={recipe.title}
          className="h-28 w-28 shrink-0 rounded-[14px] object-cover"
        />
        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className="line-clamp-2 text-[1.05rem] font-bold leading-5 text-slate-950">{recipe.title}</h3>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {recipe.sourceName || 'מקור'} · {recipe.difficulty || 'מתכון'}
          </p>

          {showLanguage && langName && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 self-start">
              <Globe size={10} />
              מקור: {langName}
            </span>
          )}

          {/* Badges + actions row — pinned to bottom of content */}
          <div className="mt-auto pt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
              <Clock3 size={11} />
              {formatDuration(displayTime)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
              <Users size={11} />
              {displayServings || 4} מ׳
            </span>
            <div className="mr-auto flex items-center gap-1">
            {onSave && (
              <button
                type="button"
                disabled={saving || saved}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (saved) return;
                  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                  setSaving(true);
                  await onSave(recipe);
                  setSaved(true);
                  setSaving(false);
                }}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-all ${saved ? 'border-[#2f6d63] bg-[#e6fcf6] text-[#2f6d63]' : 'border-slate-200 bg-white text-slate-500 hover:text-[#2f6d63] hover:border-[#2f6d63]/30'}`}
                title={saved ? 'נשמר' : 'שמור לספרייה'}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Bookmark size={15} />}
              </button>
            )}
            {/* 3-dot block menu — inline at end of badges row */}
            {onBlock && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <MoreVertical size={15} />
                </button>
                {menuOpen && (
                  <div className="absolute bottom-9 left-0 z-30 min-w-[180px] rounded-[12px] border border-slate-200 bg-white shadow-xl py-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        try {
                          const domain = new URL(recipe.sourceUrl).hostname.replace(/^www\./, '');
                          onBlock(domain);
                        } catch {}
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#ff5a37] hover:bg-slate-50 text-right"
                    >
                      <X size={14} />
                      אל תציג יותר מאתר זה
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Ingredient preview strip — visually part of the card */}
      {validIngredients.length > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className={`w-full flex items-center justify-center gap-1.5 border-t px-3 py-2 text-[12px] font-semibold transition-colors ${isExpanded ? 'border-[#2f6d63]/20 bg-[#f0faf8] text-[#2f6d63]' : 'border-slate-100 bg-slate-50/60 text-slate-500 hover:text-[#2f6d63] hover:bg-[#f0faf8]'}`}
          >
            <Salad size={13} />
            הצצה למתכון
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {isExpanded && (
            <div className="px-3 pb-3 bg-white">
              <IngredientCarousel ingredients={validIngredients} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const pageVariants = {
  initial: (dir: number) => ({
    x: dir > 0 ? '60%' : '-60%',
    opacity: 0,
    scale: 0.95,
  }),
  animate: {
    x: 0, opacity: 1, scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.8 },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-30%' : '30%',
    opacity: 0, scale: 0.95,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  }),
};

const SkeletonRow = () => (
  <div className="rounded-[18px] border border-slate-100 bg-white p-4 animate-pulse">
    <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
    <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
    <div className="h-3 bg-slate-100 rounded w-1/3" />
  </div>
);

/* ─── Main App ─── */
export const App = () => {
  const [view, setView] = useState<View>('home');
  const [previousView, setPreviousView] = useState<View>('home');
  const [direction, setDirection] = useState(1);
  const viewHistory = useRef<string[]>(['home']);
  const [query, setQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<ParsedRecipe | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Home data
  const [communityRecipes, setCommunityRecipes] = useState<ParsedRecipe[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [libraryRecipes, setLibraryRecipes] = useState<ParsedRecipe[]>([]);

  // Search data (unified)
  const [localResults, setLocalResults] = useState<SearchResult[]>([]);
  const [webResults, setWebResults] = useState<SearchResult[]>([]);
  const [showAllWeb, setShowAllWeb] = useState(false);
  const [enrichments, setEnrichments] = useState<Record<string, EnrichmentData>>({});

  const [keepScreenOn, setKeepScreenOn] = useState(() => localStorage.getItem('keep_screen_on') !== 'false');
  const [blockedDomains, setBlockedDomains] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('blocked_domains') || '[]')); } catch { return new Set(); }
  });

  const navigateTo = (newView: View) => {
    const currentIndex = viewHistory.current.indexOf(newView);
    if (currentIndex !== -1) {
      setDirection(-1);
      viewHistory.current = viewHistory.current.slice(0, currentIndex + 1);
    } else {
      setDirection(1);
      viewHistory.current = [...viewHistory.current, newView];
    }
    setView(newView);
  };

  const handleBlockDomain = (domain: string) => {
    setBlockedDomains(prev => {
      const next = new Set(prev);
      next.add(domain);
      localStorage.setItem('blocked_domains', JSON.stringify([...next]));
      return next;
    });
  };

  // Share toast state
  const [shareToast, setShareToast] = useState<{
    show: boolean;
    url: string;
    recipe: ParsedRecipe | null;
  }>({ show: false, url: '', recipe: null });

  // Handle shared URL with toast (used by Android integration)
  // Just shows toast in background, doesn't open the app
  const handleSharedUrl = async (url: string) => {
    console.log('handleSharedUrl called:', url);
    setShareToast({ show: true, url, recipe: null });
    console.log('Toast state set to show');
    
    try {
      // Extract recipe in background - user stays in browser
      const recipe = await parseRecipe(url, MOCK_USER_ID);
      
      // Update toast with success but don't open
      setShareToast({ show: true, url, recipe });
      
      // Refresh library in background
      void loadLibrary();
      
      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setShareToast(prev => ({ ...prev, show: false }));
      }, 3000);
    } catch (error) {
      console.error('Failed to extract shared recipe:', error);
      // Still show toast but without recipe
      setShareToast({ show: true, url, recipe: null });
      
      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setShareToast(prev => ({ ...prev, show: false }));
      }, 3000);
    }
  };

  useEffect(() => {
    warmUpBackend(); // Ping backend to wake Render free-tier
    void loadLibrary();
    void loadCommunity();

    // Handle deep links
    const handleDeepLink = (urlString: string) => {
      console.log('handleDeepLink called with:', urlString);
      try {
        // Parse cookit://parse?url=... format manually
        const match = urlString.match(/^cookit:\/\/parse\?url=(.+)$/);
        if (match) {
          const recipeUrl = decodeURIComponent(match[1]);
          console.log('Recipe URL:', recipeUrl);
          if (recipeUrl) {
            handleSharedUrl(recipeUrl);
          }
        } else {
          console.log('URL does not match expected format');
        }
      } catch (e) {
        console.error('Invalid URL:', urlString, e);
      }
    };

    const setupAppEvents = async () => {
      // Listen for new deep links
      CapApp.addListener('appUrlOpen', (event: any) => {
        handleDeepLink(event.url);
      });

      // Check for pending deep link after a short delay (for when app was launched from share)
      setTimeout(async () => {
        try {
          const result = await (CapApp as any).getPendingUrl?.() || { url: null };
          if (result.url) {
            handleDeepLink(result.url);
          }
        } catch (e) {
          // Plugin not available, ignore
        }
      }, 500);
    };
    void setupAppEvents();

  }, []);

  useEffect(() => {
    if (!keepScreenOn || !('wakeLock' in navigator)) return;
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      } catch {
        // silently ignore — not supported or page not visible
      }
    };
    void requestWakeLock();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [keepScreenOn]);

  const loadLibrary = async () => {
    try {
      const data = await fetchLibrary(MOCK_USER_ID);
      setLibraryRecipes(data);
    } catch (e) {
      console.error('Failed to load library', e);
    }
  };

  const loadCommunity = async () => {
    setCommunityLoading(true);
    try {
      const data = await fetchCommunityRecipes();
      setCommunityRecipes(data);
    } catch (e) {
      console.error('Failed to load community', e);
    } finally {
      setCommunityLoading(false);
    }
  };

  const WEB_PAGE_SIZE = 20;
  const filteredWebResults = webResults.filter(r => {
    try {
      const domain = new URL(r.sourceUrl).hostname.replace(/^www\./, '');
      return !blockedDomains.has(domain);
    } catch { return true; }
  });
  const visibleWebResults = showAllWeb ? filteredWebResults : filteredWebResults.slice(0, WEB_PAGE_SIZE);

  const handleSearch = async (forcedQuery?: string) => {
    const targetQuery = (forcedQuery ?? query).trim();
    if (!targetQuery) return;

    navigateTo('search');
    setSearchError('');
    setShowAllWeb(false);
    setIsSearching(true);
    // Don't clear results immediately — keep previous results visible while new ones load

    try {
      // Fire local-only query first for instant results, web query in parallel
      const localPromise = searchLocalOnly(targetQuery).catch(() => ({ local: [], web: [], webTotal: 0 }));
      const webPromise = searchUnified(targetQuery, MOCK_USER_ID).catch(() => null);

      // Show local results immediately as they arrive
      const localData = await localPromise;
      if (localData.local?.length) {
        setLocalResults(localData.local);
        setWebResults([]); // clear stale web results while new web results load
      }

      // Then update with full results when web arrives
      const fullData = await webPromise;
      if (fullData) {
        setLocalResults(fullData.local ?? []);
        setWebResults(fullData.web ?? []);

        // Background enrichment — fire for all web results, update cards as each resolves
        const toEnrich = fullData.web?.slice(0, 15) ?? [];
        toEnrich.forEach((result: SearchResult) => {
          enrichRecipe(result.sourceUrl)
            .then(enrichment => {
              if (enrichment.image || enrichment.ingredientsPreview?.length) {
                setEnrichments(prev => ({ ...prev, [result.sourceUrl]: enrichment }));
              }
            })
            .catch(() => {}); // silent — never block the UI
        });
      }
    } catch (error) {
      console.error('Search failed', error);
      setSearchError('לא הצלחתי להביא תוצאות כרגע. נסה שוב בעוד רגע או חפש ניסוח אחר.');
      setLocalResults([]);
      setWebResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (newQuery.trim().length < 2) return;
    searchDebounceRef.current = setTimeout(() => {
      void handleSearch(newQuery);
    }, 350);
  };

  const handleExtractRecipe = async (url?: string) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const targetUrl = (url || importUrl).trim();
    if (!targetUrl) return;

    // Show live page immediately while parsing in background
    setFallbackUrl(targetUrl);
    setPreviousView(view);
    setIsExtracting(true);
    setIsImportModalOpen(false);
    setImportUrl('');
    navigateTo('fallback');

    // Try up to 2 times (Render free tier cold start can cause first request to fail)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const recipe = await parseRecipe(targetUrl, MOCK_USER_ID);
        setSelectedRecipe(recipe);
        void loadLibrary();
        void loadCommunity();
        setIsExtracting(false);
        navigateTo('recipe');
        return;
      } catch (error) {
        console.error(`Extraction attempt ${attempt + 1} failed`, error);
        if (attempt === 0) {
          // First failure — wait briefly and retry (backend may be waking up)
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        // Second failure — stay on fallback (live page) with error state
        setIsExtracting(false);
      }
    }
  };

  const handleOpenParsedRecipe = async (recipe: ParsedRecipe) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const isHebrew = /[\u0590-\u05FF]/.test(recipe.title || '');
    // If not Hebrew and we have a URL, re-fetch to get translated version
    if (!isHebrew && recipe.sourceUrl) {
      setIsExtracting(true);
      try {
        const translated = await parseRecipe(recipe.sourceUrl, MOCK_USER_ID);
        setSelectedRecipe(translated);
      } catch {
        setSelectedRecipe(recipe);  // Fall back to original on error
      } finally {
        setIsExtracting(false);
      }
    } else {
      setSelectedRecipe(recipe);
    }
    setPreviousView(view);
    navigateTo('recipe');
  };

  /* ── Full-screen views ── */


  const handleSaveRecipe = async (recipe: ParsedRecipe) => {
    if (!recipe.id) {
      alert('לא ניתן לשמור מתכון ללא מזהה');
      return;
    }
    try {
      await saveRecipe(MOCK_USER_ID, recipe.id);
      const refreshed = await fetchLibrary(MOCK_USER_ID);
      setLibraryRecipes(refreshed);
    } catch (e) {
      console.error('Failed to save recipe', e);
    }
  };

  const handleSaveSearchResult = async (result: SearchResult) => {
    try {
      const parsed = await parseRecipe(result.sourceUrl, MOCK_USER_ID);
      if (parsed?.id) {
        await saveRecipe(MOCK_USER_ID, parsed.id);
        const refreshed = await fetchLibrary(MOCK_USER_ID);
        setLibraryRecipes(refreshed);
      }
    } catch (e) {
      console.error('Failed to save recipe from search', e);
    }
  };

  // Profile view is now rendered inside the main layout (see below)

  if (view === 'recipe' && selectedRecipe) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-[#F0F4F8]">
        <div className="mx-auto h-full w-full max-w-[430px]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <AnimatePresence mode="wait">
            <motion.div key="recipe-view" initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} style={{ position: 'absolute', inset: 0 }}>
              <Suspense fallback={<SkeletonHero />}>
                <RecipeResult
                  recipe={selectedRecipe}
                  onBack={() => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); navigateTo(previousView); }}
                  onSave={handleSaveRecipe}
                />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (view === 'fallback' && fallbackUrl) {
    return (
      <div className="fixed inset-0 overflow-hidden bg-[#f3f2f1]">
      <AnimatePresence mode="wait">
      <motion.div key="fallback-view" initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} style={{ position: 'absolute', inset: 0 }}>
      <div className="flex h-full flex-col bg-[#f3f2f1]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header className="flex h-16 shrink-0 items-center justify-between bg-white px-4 shadow-sm md:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => { setIsExtracting(false); navigateTo(previousView); }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 md:text-lg">עמוד מקורי</h1>
              {isExtracting ? (
                <p className="text-[11px] font-medium text-[#2f6d63] md:text-xs flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> מחלץ מתכון אוטומטית...
                </p>
              ) : (
                <p className="text-[11px] font-medium text-[#ff5a37] md:text-xs">לא הצלחתי לחלץ אוטומטית</p>
              )}
            </div>
          </div>
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">פתח בדפדפן</span>
          </a>
        </header>
        {/* Animated loading bar */}
        <div className="h-1 shrink-0 bg-slate-100 overflow-hidden">
          {isExtracting && (
            <div className="h-full bg-[#2f6d63] animate-pulse" style={{ width: '100%', animationDuration: '1.5s' }} />
          )}
        </div>
        <div className="relative flex-1">
          <iframe src={fallbackUrl} className="h-full w-full border-none bg-white" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" title="Fallback Recipe" />
          {/* Floating extraction status badge */}
          {isExtracting && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#2f6d63] px-5 py-2.5 text-white text-sm font-bold shadow-xl">
              <Loader2 size={15} className="animate-spin" />
              מחלץ מתכון...
            </div>
          )}
        </div>
      </div>
      </motion.div>
      </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#F0F4F8]">
      <div className="mx-auto h-full w-full max-w-[430px] flex flex-col" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* ─── Search Bar ─── */}
        <section className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-13 flex-1 items-center rounded-[18px] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).blur();
                  void handleSearch();
                }}
                className="flex h-full items-center justify-center pl-2 pr-4 text-slate-950 transition-colors hover:text-[#2f6d63]"
              >
                <Search size={21} />
              </button>
              <input
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    void handleSearch();
                  }
                }}
                placeholder="סוג אוכל, שם מתכון..."
                className="h-full flex-1 bg-transparent px-2 text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />
              {/* Inline status indicators — spinner while searching, clear button when query not empty */}
              <div className="flex items-center gap-1 pl-3">
                {isSearching ? (
                  <Loader2 size={16} className="animate-spin text-[#2f6d63] shrink-0" />
                ) : query.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors shrink-0"
                    aria-label="נקה חיפוש"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Animated Views Container ─── */}
        <div style={{ position: 'relative', overflow: 'hidden', flex: 1 }}>
        <AnimatePresence mode="wait" custom={direction}>

        {/* ─── HOME VIEW ─── */}
        {view === 'home' && (
          <motion.div key="home" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '96px', paddingLeft: '16px', paddingRight: '16px' }}>
          <>
            {/* ─── Quick Category Chips - Only on Home ─── */}
            <section className="mt-7">
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {quickCategories.map((category) => (
                  <button
                    key={category.label}
                    type="button"
                    onClick={() => {
                      // Search in local library only
                      setQuery(category.label);
                      navigateTo('search');
                      // TODO: Implement local library search
                    }}
                    className="min-w-[88px] shrink-0"
                  >
                    <div className="flex h-[92px] w-[88px] items-center justify-center rounded-[16px] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                      <div className="text-[2.2rem]">{category.emoji}</div>
                    </div>
                    <div className="mt-3 text-center text-sm font-normal text-slate-700">{category.label}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-9">
            {/* Community Horizontal Scroll */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-normal leading-none text-slate-700">מתכונים אחרונים מהקהילה</h2>
            </div>

            {communityLoading ? (
              <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-[22px] border border-slate-200 bg-white">
                <Loader2 className="animate-spin text-[#2f6d63]" size={28} />
              </div>
            ) : communityRecipes.length === 0 ? (
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-5 py-10 text-center">
                <p className="text-sm text-slate-500">אין עדיין מתכונים מהקהילה</p>
              </div>
            ) : (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {communityRecipes.slice(0, 10).map((recipe) => (
                  <CommunityCard
                    key={recipe.sourceUrl || recipe.title}
                    recipe={recipe}
                    onOpen={() => handleOpenParsedRecipe(recipe)}
                  />
                ))}
              </div>
            )}

            {/* My Recipes */}
            <div className="mt-10 flex items-center justify-between">
              <h2 className="text-base font-normal leading-none text-slate-700">המתכונים שלי</h2>
            </div>

            {libraryRecipes.length === 0 ? (
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-5 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <BookOpen size={22} />
                </div>
                <h3 className="mt-4 text-sm font-normal text-slate-500">אין כרגע מתכונים</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">המתכונים שתחלץ יופיעו כאן באופן אוטומטי.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {libraryRecipes.map((recipe) => (
                  <article
                    key={recipe.sourceUrl || recipe.title}
                    onClick={() => handleOpenParsedRecipe(recipe)}
                    className="flex gap-3 cursor-pointer hover:border-[#2f6d63]/30 hover:shadow-md transition-all rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)] active:scale-[0.96] active:opacity-80"
                  >
                    <img
                      src={recipe.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80'}
                      alt={recipe.title}
                      className="h-24 w-24 shrink-0 rounded-[14px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-[1.05rem] font-bold leading-5 text-slate-950">{recipe.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">{recipe.sourceName || 'מקור'}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1">
                          <Clock3 size={11} />
                          {formatDuration(recipe.totalTime)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          </>
          </motion.div>
        )}

        {/* ─── SEARCH VIEW ─── */}
        {view === 'search' && (
          <motion.div key="search" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '96px', paddingLeft: '16px', paddingRight: '16px' }}>
          <section className="relative mt-9">
            {/* Loading overlay when extracting a recipe */}
            {isExtracting && (
              <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4 rounded-[24px] bg-white px-10 py-8 shadow-2xl">
                  <Loader2 className="animate-spin text-[#2f6d63]" size={40} />
                  <p className="text-base font-bold text-slate-900">מחלץ מתכון...</p>
                  <p className="text-sm text-slate-500">זה עשוי לקחת כמה שניות</p>
                </div>
              </div>
            )}
            {searchError && (
              <div className="mb-4 rounded-[22px] border border-[#ff5a37]/20 bg-[#fff1ed] px-4 py-3 text-sm font-medium text-[#9a3412]">
                {searchError}
              </div>
            )}

            {(!isSearching && localResults.length === 0 && webResults.length === 0) ? (
              <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <BookOpen size={22} />
                </div>
                <h3 className="mt-4 text-sm font-normal text-slate-500">אין כרגע תוצאות</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">נסה חיפוש אחר או ייבוא מ־URL.</p>
              </div>
            ) : (isSearching && localResults.length === 0 && webResults.length === 0) ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : (
              <>
                {/* Local Results (darker bg) */}
                {localResults.length > 0 && (
                  <div className="rounded-[22px] bg-[#E8EDEB] p-4">
                    <h3 className="mb-3 text-[15px] font-bold text-slate-800">מהספרייה ומהקהילה</h3>
                    <div className="space-y-3">
                      {localResults.map((recipe) => (
                        <RecipeListRow
                          key={recipe.sourceUrl}
                          recipe={recipe}
                          onOpen={() => handleExtractRecipe(recipe.sourceUrl)}
                          onSave={handleSaveSearchResult}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Web Results */}
                {filteredWebResults.length > 0 && (
                  <div className={localResults.length > 0 ? 'mt-6' : ''}>
                    <h3 className="mb-3 text-[15px] font-bold text-slate-800">תוצאות מהאינטרנט</h3>
                    <div className="space-y-4">
                      {visibleWebResults.map((recipe) => (
                        <RecipeListRow
                          key={recipe.sourceUrl}
                          recipe={recipe}
                          onOpen={() => handleExtractRecipe(recipe.sourceUrl)}
                          onSave={handleSaveSearchResult}
                          onBlock={handleBlockDomain}
                          showLanguage
                          enrichment={enrichments[recipe.sourceUrl]}
                        />
                      ))}
                    </div>

                    {!showAllWeb && filteredWebResults.length > WEB_PAGE_SIZE && (
                      <button
                        type="button"
                        onClick={() => setShowAllWeb(true)}
                        className="mt-5 w-full inline-flex h-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        הצג עוד ({filteredWebResults.length - WEB_PAGE_SIZE})
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
          </motion.div>
        )}

        {/* ─── LIBRARY VIEW ─── */}
        {view === 'library' && (
          <motion.div key="library" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '96px', paddingLeft: '16px', paddingRight: '16px' }}>
          <LibraryView
            recipes={libraryRecipes}
            onOpen={handleOpenParsedRecipe}
            onBack={() => navigateTo('home')}
          />
          </motion.div>
        )}

        {/* ─── PROFILE VIEW ─── */}
        {view === 'profile' && (
          <motion.div key="profile" custom={direction} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '96px', paddingLeft: '16px', paddingRight: '16px' }}>
          <section className="mt-9">
            <ProfileView
                onBack={() => navigateTo('home')}
                keepScreenOn={keepScreenOn}
                onKeepScreenOnChange={(v) => { setKeepScreenOn(v); localStorage.setItem('keep_screen_on', v.toString()); }}
              />
          </section>
          </motion.div>
        )}

        </AnimatePresence>
        </div>

        {/* ─── Bottom Navigation (flipped: Home leftmost, Search middle, Profile rightmost) ─── */}
        <nav className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 items-center justify-around rounded-[24px] border border-white/70 bg-white/80 px-6 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <button
            className={`relative flex items-center justify-center h-12 w-12 rounded-[16px] transition-colors active:scale-[0.96] active:opacity-80 transition-transform duration-75 ${view === 'home' ? 'text-[#2f6d63]' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => {
              if (view === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
              else { navigateTo('home'); void loadCommunity(); void loadLibrary(); }
            }}
            title="בית"
          >
            {view === 'home' && (
              <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-blue-50" style={{ zIndex: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
            )}
            <span className="relative z-10"><Home size={24} /></span>
          </button>
          <button
            className={`relative flex items-center justify-center h-12 w-12 rounded-[16px] transition-colors active:scale-[0.96] active:opacity-80 transition-transform duration-75 ${view === 'search' ? 'text-[#2f6d63]' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => {
              if (view !== 'search') navigateTo('search');
            }}
            title="חיפוש"
          >
            {view === 'search' && (
              <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-blue-50" style={{ zIndex: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
            )}
            <span className="relative z-10"><Search size={24} /></span>
          </button>
          <button
            className={`relative flex items-center justify-center h-12 w-12 rounded-[16px] transition-colors active:scale-[0.96] active:opacity-80 transition-transform duration-75 ${view === 'library' ? 'text-[#2f6d63]' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => navigateTo('library')}
            title="ספרייה"
          >
            {view === 'library' && (
              <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-blue-50" style={{ zIndex: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
            )}
            <span className="relative z-10"><BookOpen size={24} /></span>
          </button>
          <button
            className={`relative flex items-center justify-center h-12 w-12 rounded-[16px] transition-colors active:scale-[0.96] active:opacity-80 transition-transform duration-75 ${view === 'profile' ? 'text-[#2f6d63]' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => { setPreviousView(view); navigateTo('profile'); }}
            title="פרופיל"
          >
            {view === 'profile' && (
              <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-2xl bg-blue-50" style={{ zIndex: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
            )}
            <span className="relative z-10"><User size={24} /></span>
          </button>
        </nav>

        {/* Floating Add Button */}
        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="fixed bottom-[95px] left-5 z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#2f6d63] text-white shadow-[0_8px_20px_rgba(47,109,99,0.4)] transition-transform hover:scale-105 active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="w-full max-w-[430px] rounded-[22px] border border-white/10 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Import URL</div>
                <h3 className="mt-2 text-xl font-black text-slate-950">חילוץ מתכון מכתובת</h3>
              </div>
              <button type="button" onClick={() => setIsImportModalOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-[22px] bg-slate-50 p-3">
              <label className="flex items-center gap-3 rounded-[18px] bg-white px-4 py-4 shadow-sm">
                <Wand2 size={18} className="text-[#2f6d63]" />
                <input
                  value={importUrl}
                  onChange={(event) => setImportUrl(event.target.value)}
                  placeholder="הדבק כאן URL של דף מתכון"
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void handleExtractRecipe()}
                disabled={isExtracting}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-70"
              >
                {isExtracting ? 'מחלץ...' : 'חלץ מתכון'}
              </button>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-bold text-slate-600"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Toast */}
      {shareToast.show && (
        <ShareToast
          recipeUrl={shareToast.url}
          recipeTitle={shareToast.recipe?.title}
          isExtracting={!shareToast.recipe}
          onDismiss={() => setShareToast({ show: false, url: '', recipe: null })}
        />
      )}
    </div>
  );
};

export default App;
