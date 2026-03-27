import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Loader2, Plus, FolderHeart, ChevronRight, BookOpen } from 'lucide-react';
import { fetchCollections, createCollection, fetchCollectionDetail } from '../api';
import type { Collection } from '../types';

interface CollectionsProps {
  userId: string;
  onSelectRecipe: (recipeId: string) => void;
  onBack: () => void;
}

export const Collections = ({ userId, onSelectRecipe, onBack }: CollectionsProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCollections(userId);
      setCollections(data);
    } catch (e) {
      console.error('Failed to load collections', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    setCreatingLoading(true);
    try {
      await createCollection(userId, newCollectionName);
      setNewCollectionName('');
      setIsCreating(false);
      await loadCollections();
    } catch (e) {
      console.error('Failed to create collection', e);
    } finally {
      setCreatingLoading(false);
    }
  };

  const handleOpenCollection = async (_collectionId: string, collectionName: string) => {
    setLoading(true);
    try {
      const data = await fetchCollectionDetail(userId, collectionName);
      // Backend returns { collection: {...}, recipes: [...] }
      // Map to the shape Collections.tsx uses: { ...collection, items: recipes.map(...) }
      setSelectedCollection({
        ...data.collection,
        items: (data.recipes || []).map((r: any) => ({
          recipeId: r.id,
          recipe: r,
          collectionId: data.collection.id,
          createdAt: r.createdAt || ''
        }))
      });
    } catch (e) {
      console.error('Failed to load collection detail', e);
    } finally {
      setLoading(false);
    }
  };

  if (selectedCollection) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] pb-20">
        <header className="flex h-16 items-center justify-between bg-white px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedCollection(null)} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-slate-900">{selectedCollection.name}</h1>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {selectedCollection.items.length === 0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <BookOpen size={22} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-950">האוסף ריק</h3>
              <p className="mt-2 text-sm text-slate-500">הוסף מתכונים לאוסף זה כדי לראות אותם כאן.</p>
            </div>
          ) : (
            selectedCollection.items.map((item) => (
              <article
                key={item.recipeId}
                onClick={() => onSelectRecipe(item.recipeId)}
                className="flex gap-3 cursor-pointer hover:border-[#2f6d63]/30 hover:shadow-md transition-all rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm"
              >
                <img
                  src={item.recipe.image || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80'}
                  alt={item.recipe.title}
                  className="h-20 w-20 shrink-0 rounded-[12px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-md font-bold text-slate-950">{item.recipe.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{item.recipe.sourceName}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] pb-20">
      <header className="flex h-16 items-center justify-between bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">האוספים שלי</h1>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2f6d63] text-white"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-[#2f6d63]" size={32} />
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <FolderHeart size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-950">אין עדיין אוספים</h3>
            <p className="mt-2 text-sm text-slate-500">צור אוספים כדי לארגן את המתכונים שלך.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => handleOpenCollection(collection.id, collection.name)}
                className="flex items-center gap-4 bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm text-right transition-all hover:shadow-md"
              >
                <div className="h-14 w-14 rounded-[14px] bg-[#e6fcf6] flex items-center justify-center text-[#2f6d63]">
                  <FolderHeart size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{collection.name}</h3>
                  <p className="text-xs text-slate-500">{(collection as any).itemCount ?? collection.items?.length ?? 0} מתכונים</p>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">יצירת אוסף חדש</h3>
            <input
              autoFocus
              className="mt-4 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#2f6d63]"
              placeholder="שם האוסף..."
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreateCollection}
                disabled={creatingLoading || !newCollectionName.trim()}
                className="flex-1 rounded-full bg-[#2f6d63] py-3 font-bold text-white disabled:opacity-50"
              >
                {creatingLoading ? <Loader2 className="mx-auto animate-spin" size={20} /> : 'צור אוסף'}
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 rounded-full border border-slate-200 py-3 font-bold text-slate-600"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
