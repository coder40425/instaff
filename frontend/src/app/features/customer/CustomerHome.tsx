import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import CustomerLayout from '../../layouts/CustomerLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { workerService, categoryService } from '../../services/api';
import { Star, MapPin, Search, CheckCircle2 } from 'lucide-react';
import type { Category, SubCategory, Worker, WorkerDirectoryFilters, WorkerDirectorySort } from '../../types';

export default function CustomerHome() {
  const navigate = useNavigate();

  // ── Search (debounced) ─────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // ── Sorting ─────────────────────────────────────────────────────────────
  const [sort, setSort] = useState<WorkerDirectorySort>('sequence');

  // ── Category / Work type ───────────────────────────────────────────────
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');

  // ── City / Available / Verified ────────────────────────────────────────
  const [city, setCity] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  // NOTE: All workers returned by /workers are already verified & non-suspended —
  // the backend enforces this unconditionally. This checkbox is kept purely as a
  // cosmetic filter for users who want to double-confirm; it is NOT a security
  // control and toggling it off never exposes unverified workers.
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['categories', 'sequence'],
    queryFn: () => categoryService.getAll('sequence'),
  });
  const categories: Category[] = categoriesData ?? [];
  const sortedCategoriesForFilter = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const workTypeOptions: SubCategory[] = [...(selectedCategory?.subCategories ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Reset work type whenever category changes
  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    setSubCategoryId('');
  };

  const filters: WorkerDirectoryFilters = {
    sort,
    ...(search && { search }),
    ...(categoryId && { categoryId }),
    ...(subCategoryId && { subCategoryId }),
    ...(city.trim() && { city: city.trim() }),
    ...(availableOnly && { isAvailable: true }),
  };

  const {
    data: workers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['workers', filters],
    queryFn: () => workerService.getAll(filters),
  });

  // workerService.getAll already defensively filters to verified & non-suspended.
  // The "Verified Only" checkbox here is a no-op display filter kept for UX
  // continuity — since the list is already 100% verified, this never removes anyone
  // unless a defensively-filtered anomaly somehow appeared, which it won't.
  const visibleWorkers: Worker[] = verifiedOnly ? workers.filter((w) => w.isVerified) : workers;
  const resultCount = visibleWorkers.length;

  const hasActiveFilters =
    !!search || !!categoryId || !!subCategoryId || !!city || availableOnly || verifiedOnly || sort !== 'sequence';

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategoryId('');
    setSubCategoryId('');
    setCity('');
    setAvailableOnly(false);
    setVerifiedOnly(false);
    setSort('sequence');
  };

  return (
    <CustomerLayout>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold">Worker Directory</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Find workers by category, work type, location and availability.
          </p>
        </div>

        {/* ── Search + Sort + Filters ───────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search workers, skills or work type..."
                className="pl-9"
              />
            </div>

            {/* Sort segmented control */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Sort</span>
              <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-1 bg-neutral-50 dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => setSort('sequence')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    sort === 'sequence'
                      ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  1–28 Order
                </button>
                <button
                  type="button"
                  onClick={() => setSort('name')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    sort === 'name'
                      ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  A–Z
                </button>
              </div>
            </div>

            {/* Filter row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              {/* Category — A-Z for browsing consistency with the sub-category list below */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-700 bg-input-background dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Categories</option>
                  {sortedCategoriesForFilter.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Type — A-Z */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Work Type</label>
                <select
                  value={subCategoryId}
                  onChange={(e) => setSubCategoryId(e.target.value)}
                  disabled={!categoryId}
                  className="w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-700 bg-input-background dark:bg-neutral-900 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">All Work Types</option>
                  {workTypeOptions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">City</label>
                <Input placeholder="Enter city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>

              {/* Available / Verified */}
              <div className="flex flex-col gap-2 justify-center">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="available"
                    checked={availableOnly}
                    onCheckedChange={(c) => setAvailableOnly(c as boolean)}
                  />
                  <label htmlFor="available" className="text-sm cursor-pointer">
                    Available Only
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="verified"
                    checked={verifiedOnly}
                    onCheckedChange={(c) => setVerifiedOnly(c as boolean)}
                  />
                  <label htmlFor="verified" className="text-sm cursor-pointer">
                    Verified Only
                  </label>
                </div>
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-neutral-500">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ── Result count ──────────────────────────────────────────────── */}
        {!isLoading && !isError && (
          <p className="text-sm text-neutral-500">
            {resultCount} worker{resultCount === 1 ? '' : 's'} found
          </p>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
                      <div className="h-3 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="h-3 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="h-9 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-red-500">
            Something went wrong while loading workers. Please try again later.
          </div>
        ) : !visibleWorkers || visibleWorkers.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-neutral-700 dark:text-neutral-300 font-semibold">No workers found</p>
            <p className="text-neutral-500 text-sm">Try changing your filters or search.</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleWorkers.map((worker) => {
              const skillNames = [...(worker.skills ?? [])]
                .map((s) => s.subCategory?.name)
                .filter((name): name is string => Boolean(name))
                .sort((a, b) => a.localeCompare(b));
              const categoryName = worker.skills?.[0]?.subCategory?.category?.name;
              return (
                <Card key={worker.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {worker.profilePhotoUrl ? (
                          <img
                            src={worker.profilePhotoUrl}
                            alt={worker.user?.name}
                            className="w-12 h-12 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 font-bold text-lg">
                            {(worker.user?.name || '?')[0]}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{worker.user?.name}</h3>
                          {categoryName && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-500">{categoryName}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {skillNames.slice(0, 2).map((name) => (
                              <Badge key={name} variant="secondary" className="text-xs">
                                {name}
                              </Badge>
                            ))}
                            {skillNames.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{skillNames.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {worker.isVerified && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 flex-shrink-0 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{worker.rating || 0}/5</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {worker.city ? `${worker.city}${worker.state ? `, ${worker.state}` : ''}` : 'Location not set'}
                        </span>
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">Experience: {worker.experience} years</div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            worker.isAvailable ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600'
                          }`}
                        />
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {worker.isAvailable ? 'Available' : 'Not available'}
                        </span>
                      </div>
                      <div className="font-semibold text-lg">₹{worker.expectedSalary}/month</div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => navigate(`/workers/${worker.id}`)}>
                        View Profile
                      </Button>
                      <Button className="flex-1" onClick={() => navigate('/booking/create', { state: { worker } })}>
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}