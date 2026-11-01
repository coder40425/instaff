import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ChevronDown, ChevronRight, Layers, Pencil, Plus, Search,
} from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { categoryService } from '../../services/api';
import type { Category, SubCategory } from '../../types';

type CategoryEditor =
  | { kind: 'category'; mode: 'create' }
  | { kind: 'category'; mode: 'edit'; category: Category }
  | { kind: 'subcategory'; mode: 'create'; category: Category }
  | { kind: 'subcategory'; mode: 'edit'; category: Category; subCategory: SubCategory };

type VisibilityTarget = {
  kind: 'category' | 'subcategory';
  id: string;
  name: string;
  isVisible: boolean;
  parentName?: string;
};

type SaveEditorVariables = {
  editor: CategoryEditor;
  name: string;
  slug: string;
};

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const visibleBadgeClass = 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300';
const hiddenBadgeClass = 'border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';

export default function AdminCategoryManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<CategoryEditor | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorSlug, setEditorSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [visibilityTarget, setVisibilityTarget] = useState<VisibilityTarget | null>(null);

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: categoryService.getAllForAdmin,
  });
  const categories = categoriesQuery.data ?? [];

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalizedSearch) ||
      (category.subCategories ?? []).some((subCategory) =>
        subCategory.name.toLowerCase().includes(normalizedSearch)
      )
    );
  }, [categories, search]);

  const refreshCategoryQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ]);
  };

  const saveMutation = useMutation<unknown, any, SaveEditorVariables>({
    mutationFn: ({ editor: currentEditor, name, slug }: SaveEditorVariables) => {
      if (currentEditor.kind === 'category') {
        return currentEditor.mode === 'create'
          ? categoryService.createCategory({ name, slug })
          : categoryService.updateCategory(currentEditor.category.id, { name });
      }
      return currentEditor.mode === 'create'
        ? categoryService.createSubCategory(currentEditor.category.id, { name, slug })
        : categoryService.updateSubCategory(currentEditor.subCategory.id, { name });
    },
    onSuccess: async (_result, variables) => {
      await refreshCategoryQueries();
      const label = variables.editor.kind === 'category' ? 'Category' : 'Subcategory';
      toast.success(`${label} ${variables.editor.mode === 'create' ? 'added' : 'updated'} successfully`);
      setEditor(null);
    },
    onError: (error: any) => toast.error(errorMessage(error, 'Unable to save this category item')),
  });

  const visibilityMutation = useMutation<unknown, any, VisibilityTarget>({
    mutationFn: (target: VisibilityTarget) => {
      const isVisible = !target.isVisible;
      return target.kind === 'category'
        ? categoryService.updateCategory(target.id, { isVisible })
        : categoryService.updateSubCategory(target.id, { isVisible });
    },
    onSuccess: async (_result, target) => {
      await refreshCategoryQueries();
      toast.success(`${target.kind === 'category' ? 'Category' : 'Subcategory'} ${target.isVisible ? 'hidden' : 'made visible'}`);
      setVisibilityTarget(null);
    },
    onError: (error: any) => toast.error(errorMessage(error, 'Unable to update visibility')),
  });

  const openEditor = (nextEditor: CategoryEditor) => {
    setEditor(nextEditor);
    setSlugEdited(nextEditor.mode === 'edit');
    if (nextEditor.kind === 'category') {
      setEditorName(nextEditor.mode === 'edit' ? nextEditor.category.name : '');
      setEditorSlug(nextEditor.mode === 'edit' ? nextEditor.category.slug : '');
    } else {
      setEditorName(nextEditor.mode === 'edit' ? nextEditor.subCategory.name : '');
      setEditorSlug(nextEditor.mode === 'edit' ? nextEditor.subCategory.slug : '');
    }
  };

  const closeEditor = (open: boolean) => {
    if (!open && !saveMutation.isPending) setEditor(null);
  };

  const handleEditorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || saveMutation.isPending) return;

    const name = editorName.trim();
    const slug = (editorSlug.trim() || slugify(name));
    if (!name) {
      toast.error('Enter a name before saving');
      return;
    }
    if (editor.mode === 'create' && !slug) {
      toast.error('Enter a valid name or slug');
      return;
    }

    const duplicateCategory = editor.kind === 'category' && categories.some((category) =>
      category.id !== (editor.mode === 'edit' ? editor.category.id : undefined) &&
      category.name.trim().toLowerCase() === name.toLowerCase()
    );
    const duplicateSubCategory = editor.kind === 'subcategory' &&
      (editor.category.subCategories ?? []).some((subCategory) =>
        subCategory.id !== (editor.mode === 'edit' ? editor.subCategory.id : undefined) &&
        subCategory.name.trim().toLowerCase() === name.toLowerCase()
      );
    const duplicateSlug = editor.mode === 'create' && (
      editor.kind === 'category'
        ? categories.some((category) => category.slug.toLowerCase() === slug.toLowerCase())
        : categories.some((category) => (category.subCategories ?? []).some(
            (subCategory) => subCategory.slug.toLowerCase() === slug.toLowerCase()
          ))
    );

    if (duplicateCategory || duplicateSubCategory || duplicateSlug) {
      toast.error('An item with that name or slug already exists');
      return;
    }

    saveMutation.mutate({ editor, name, slug });
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const visibilityDescription = visibilityTarget?.kind === 'category'
    ? visibilityTarget.isVisible
      ? `Hiding “${visibilityTarget.name}” also hides all of its subcategories from customer browsing, filters, bookings, and new requirements. Existing bookings and requirements remain readable.`
      : `Making “${visibilityTarget.name}” visible allows customers to browse it. Each subcategory still follows its own visibility setting.`
    : visibilityTarget?.isVisible
      ? `Hiding “${visibilityTarget.name}” removes it from customer selection under ${visibilityTarget.parentName}. Existing bookings and requirements remain readable.`
      : `Making “${visibilityTarget?.name}” visible allows customers to select it when its parent category is visible.`;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Category Management</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Manage the categories and work types customers can browse and select.
            </p>
          </div>
          <Button onClick={() => openEditor({ kind: 'category', mode: 'create' })} className="shrink-0">
            <Plus className="h-4 w-4" /> Add category
          </Button>
        </div>

        <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Hiding a category also hides all of its subcategories from customers. Historical bookings and requirements remain available in their records.
          </AlertDescription>
        </Alert>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories or subcategories…"
            aria-label="Search categories"
            className="pl-9"
          />
        </div>

        {categoriesQuery.isLoading ? (
          <Card><CardContent className="py-12 text-center text-sm text-neutral-500">Loading categories…</CardContent></Card>
        ) : categoriesQuery.isError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="font-medium">Unable to load categories</p>
              <p className="text-sm text-neutral-500">{errorMessage(categoriesQuery.error, 'Please try again.')}</p>
              <Button variant="outline" onClick={() => categoriesQuery.refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
              <p className="font-medium">{categories.length === 0 ? 'No categories yet' : 'No matching categories'}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {categories.length === 0 ? 'Add a category to start organizing services.' : 'Try a different search.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map((category) => {
              const expanded = expandedCategories.has(category.id);
              const categoryIsVisible = category.isVisible !== false;
              const subCategories = category.subCategories ?? [];
              return (
                <Card key={category.id}>
                  <CardHeader className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-2 sm:items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 h-8 w-8 shrink-0 sm:mt-0"
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${category.name}`}
                        aria-expanded={expanded}
                        onClick={() => toggleExpanded(category.id)}
                      >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="break-words text-base sm:text-lg">{category.name}</CardTitle>
                          <Badge variant="outline" className={categoryIsVisible ? visibleBadgeClass : hiddenBadgeClass}>
                            {categoryIsVisible ? 'Visible' : 'Hidden'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">
                          {subCategories.length} {subCategories.length === 1 ? 'subcategory' : 'subcategories'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pl-10 sm:justify-end sm:pl-0">
                      <Button variant="outline" size="sm" onClick={() => openEditor({ kind: 'category', mode: 'edit', category })}>
                        <Pencil className="h-3.5 w-3.5" /> Edit name
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">{categoryIsVisible ? 'Visible' : 'Hidden'}</span>
                        <Switch
                          checked={categoryIsVisible}
                          disabled={visibilityMutation.isPending}
                          aria-label={`${categoryIsVisible ? 'Hide' : 'Show'} ${category.name}`}
                          onCheckedChange={() => setVisibilityTarget({
                            kind: 'category', id: category.id, name: category.name, isVisible: categoryIsVisible,
                          })}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  {expanded && (
                    <CardContent className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">Subcategories</h3>
                          {!categoryIsVisible && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                              Hidden while the parent category is hidden, even when individually visible.
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openEditor({ kind: 'subcategory', mode: 'create', category })}>
                          <Plus className="h-3.5 w-3.5" /> Add subcategory
                        </Button>
                      </div>

                      {subCategories.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-5 text-center text-sm text-neutral-500">
                          No subcategories in this category yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          {subCategories.map((subCategory) => {
                            const subCategoryIsVisible = subCategory.isVisible !== false;
                            return (
                              <div key={subCategory.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="break-words text-sm font-medium">{subCategory.name}</span>
                                  <Badge variant="outline" className={subCategoryIsVisible ? visibleBadgeClass : hiddenBadgeClass}>
                                    {subCategoryIsVisible ? 'Visible' : 'Hidden'}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between gap-4 sm:justify-end">
                                  <Button variant="ghost" size="sm" onClick={() => openEditor({
                                    kind: 'subcategory', mode: 'edit', category, subCategory,
                                  })}>
                                    <Pencil className="h-3.5 w-3.5" /> Edit name
                                  </Button>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-neutral-500">{subCategoryIsVisible ? 'Visible' : 'Hidden'}</span>
                                    <Switch
                                      checked={subCategoryIsVisible}
                                      disabled={visibilityMutation.isPending}
                                      aria-label={`${subCategoryIsVisible ? 'Hide' : 'Show'} ${subCategory.name}`}
                                      onCheckedChange={() => setVisibilityTarget({
                                        kind: 'subcategory', id: subCategory.id, name: subCategory.name,
                                        isVisible: subCategoryIsVisible, parentName: category.name,
                                      })}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editor} onOpenChange={closeEditor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === 'create' ? 'Add' : 'Edit'} {editor?.kind === 'category' ? 'category' : 'subcategory'}
            </DialogTitle>
            <DialogDescription>
              {editor?.mode === 'edit'
                ? 'Update the display name. The existing category relationship and slug are preserved.'
                : 'Enter a name and a unique slug for this item.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditorSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-editor-name">Name</Label>
              <Input
                id="category-editor-name"
                autoFocus
                value={editorName}
                maxLength={100}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setEditorName(nextName);
                  if (editor?.mode === 'create' && !slugEdited) setEditorSlug(slugify(nextName));
                }}
                placeholder={editor?.kind === 'category' ? 'Category name' : 'Subcategory name'}
              />
            </div>
            {editor?.mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="category-editor-slug">Slug</Label>
                <Input
                  id="category-editor-slug"
                  value={editorSlug}
                  maxLength={120}
                  onChange={(event) => { setSlugEdited(true); setEditorSlug(slugify(event.target.value)); }}
                  placeholder="unique-slug"
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeEditor(false)} disabled={saveMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || !editorName.trim()}>
                {saveMutation.isPending ? 'Saving…' : editor?.mode === 'create' ? 'Add' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!visibilityTarget} onOpenChange={(open) => { if (!open && !visibilityMutation.isPending) setVisibilityTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {visibilityTarget?.isVisible ? 'Hide' : 'Show'} {visibilityTarget?.kind === 'category' ? 'category' : 'subcategory'}?
            </AlertDialogTitle>
            <AlertDialogDescription>{visibilityDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={visibilityMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={visibilityMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (visibilityTarget) visibilityMutation.mutate(visibilityTarget);
              }}
              className={visibilityTarget?.isVisible ? 'bg-neutral-900 text-white hover:bg-neutral-700' : ''}
            >
              {visibilityMutation.isPending ? 'Saving…' : visibilityTarget?.isVisible ? 'Hide' : 'Show'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
