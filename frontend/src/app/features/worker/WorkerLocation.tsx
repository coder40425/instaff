import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import WorkerLayout from '../../layouts/WorkerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';

import { workerService, profileService } from '../../services/api';

import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Star,
  Loader2,
} from 'lucide-react';

interface LocationForm {
  latitude: string;
  longitude: string;
  city: string;
  state: string;
}

interface WorkerLocationData {
  id: string;
  city: string;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary?: boolean;
}

const EMPTY_FORM: LocationForm = {
  latitude: '',
  longitude: '',
  city: '',
  state: '',
};

export default function WorkerLocation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [gettingLocation, setGettingLocation] = useState(false);
  const [form, setForm] = useState<LocationForm>(EMPTY_FORM);

  // ------------------------------------------------------------
  // Check worker profile completion
  // ------------------------------------------------------------

  const {
    data: existingProfile,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ['worker-profile'],
    queryFn: profileService.getWorkerProfile,
    retry: false,
    throwOnError: false,
  });

  const profileComplete = !!(
    existingProfile?.aadhaarNumber &&
    existingProfile?.skillCategory &&
    existingProfile?.experience != null &&
    existingProfile?.expectedSalary != null
  );

  // ------------------------------------------------------------
  // Multiple worker locations
  // ------------------------------------------------------------

  const {
    data: locations = [],
    isLoading: locationsLoading,
    isError: locationsError,
  } = useQuery<WorkerLocationData[]>({
    queryKey: ['worker-locations'],
    queryFn: workerService.getLocations,
    enabled: profileComplete,
  });

  // ------------------------------------------------------------
  // Add location
  // ------------------------------------------------------------

  const addLocationMutation = useMutation({
    mutationFn: () =>
      workerService.addLocation({
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        latitude: form.latitude
          ? Number(form.latitude)
          : undefined,
        longitude: form.longitude
          ? Number(form.longitude)
          : undefined,
        isPrimary: locations.length === 0,
      }),

    onSuccess: () => {
      toast.success('Location added successfully');

      setForm(EMPTY_FORM);

      queryClient.invalidateQueries({
        queryKey: ['worker-locations'],
      });
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          'Failed to add location'
      );
    },
  });

  // ------------------------------------------------------------
  // Delete location
  // ------------------------------------------------------------

  const deleteLocationMutation = useMutation({
    mutationFn: (locationId: string) =>
      workerService.deleteLocation(locationId),

    onSuccess: () => {
      toast.success('Location deleted');

      queryClient.invalidateQueries({
        queryKey: ['worker-locations'],
      });
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          'Failed to delete location'
      );
    },
  });

  // ------------------------------------------------------------
  // Make primary
  // ------------------------------------------------------------

  const primaryLocationMutation = useMutation({
    mutationFn: (locationId: string) =>
      workerService.setPrimaryLocation(locationId),

    onSuccess: () => {
      toast.success('Primary location updated');

      queryClient.invalidateQueries({
        queryKey: ['worker-locations'],
      });
    },

    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          'Failed to update primary location'
      );
    },
  });

  // ------------------------------------------------------------
  // Get current GPS location
  // ------------------------------------------------------------

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error(
        'Geolocation is not supported by your browser'
      );
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((previous) => ({
          ...previous,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));

        toast.success(
          'GPS coordinates retrieved successfully'
        );

        setGettingLocation(false);
      },

      (error) => {
        toast.error(
          'Failed to get location: ' + error.message
        );

        setGettingLocation(false);
      }
    );
  };

  // ------------------------------------------------------------
  // Form helpers
  // ------------------------------------------------------------

  const updateField = (
    field: keyof LocationForm,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleAddLocation = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!profileComplete) {
      toast.error(
        'Please complete your profile first before adding a location.'
      );

      navigate('/worker/profile');
      return;
    }

    if (!form.city.trim()) {
      toast.error('City is required');
      return;
    }

    if (!form.state.trim()) {
      toast.error('State is required');
      return;
    }

    if (
      (form.latitude && !form.longitude) ||
      (!form.latitude && form.longitude)
    ) {
      toast.error(
        'Please provide both latitude and longitude'
      );
      return;
    }

    if (form.latitude && Number.isNaN(Number(form.latitude))) {
      toast.error('Latitude must be a valid number');
      return;
    }

    if (form.longitude && Number.isNaN(Number(form.longitude))) {
      toast.error('Longitude must be a valid number');
      return;
    }

    addLocationMutation.mutate();
  };

  // ------------------------------------------------------------
  // Loading / profile state
  // ------------------------------------------------------------

  if (profileLoading) {
    return (
      <WorkerLayout>
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              Loading profile...
            </CardContent>
          </Card>
        </div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ---------------------------------------------------- */}
        {/* Header */}
        {/* ---------------------------------------------------- */}

        <div>
          <h1 className="text-3xl font-bold">
            Work Locations
          </h1>

          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Add multiple cities where you are available for work.
          </p>
        </div>

        {/* ---------------------------------------------------- */}
        {/* Profile incomplete warning */}
        {/* ---------------------------------------------------- */}

        {!profileComplete && (
          <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-6 flex items-center justify-between gap-4">

              <div>
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  ⚠ Complete your profile first
                </p>

                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  You must save your Aadhaar number, skill,
                  experience and salary before managing locations.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-orange-400 text-orange-700 dark:text-orange-300"
                onClick={() => navigate('/worker/profile')}
              >
                Go to Profile
              </Button>

            </CardContent>
          </Card>
        )}

        {/* ---------------------------------------------------- */}
        {/* Existing locations */}
        {/* ---------------------------------------------------- */}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>
                  My Work Locations
                </CardTitle>

                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  You can work from multiple locations.
                </p>
              </div>

              {locations.length > 0 && (
                <Badge variant="secondary">
                  {locations.length}{' '}
                  {locations.length === 1
                    ? 'location'
                    : 'locations'}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>

            {!profileComplete ? (
              <div className="text-sm text-neutral-500 text-center py-8">
                Complete your profile to manage locations.
              </div>
            ) : locationsLoading ? (
              <div className="text-center py-8 text-neutral-500">
                Loading locations...
              </div>
            ) : locationsError ? (
              <div className="text-center py-8 text-red-500">
                Failed to load your locations.
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-10">

                <MapPin className="w-10 h-10 mx-auto text-neutral-400 mb-3" />

                <p className="font-medium text-neutral-700 dark:text-neutral-300">
                  No work locations added yet
                </p>

                <p className="text-sm text-neutral-500 mt-1">
                  Add your first work location below.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex gap-3 min-w-0">

                        <div className="mt-1 shrink-0">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>

                        <div className="min-w-0">

                          <div className="flex items-center gap-2 flex-wrap">

                            <p className="font-semibold">
                              {location.city}
                              {location.state
                                ? `, ${location.state}`
                                : ''}
                            </p>

                            {location.isPrimary && (
                              <Badge
                                variant="secondary"
                                className="gap-1"
                              >
                                <Star className="w-3 h-3 fill-current" />
                                Primary
                              </Badge>
                            )}

                          </div>

                          {location.latitude != null &&
                            location.longitude != null && (
                              <p className="text-xs text-neutral-500 mt-1">
                                Coordinates:{' '}
                                {location.latitude.toFixed(6)},{' '}
                                {location.longitude.toFixed(6)}
                              </p>
                            )}

                        </div>

                      </div>

                      <div className="flex items-center gap-2 shrink-0">

                        {!location.isPrimary && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              primaryLocationMutation.isPending
                            }
                            onClick={() =>
                              primaryLocationMutation.mutate(
                                location.id
                              )
                            }
                          >
                            {primaryLocationMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Star className="w-4 h-4 mr-1" />
                            )}

                            Make Primary
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          disabled={
                            deleteLocationMutation.isPending
                          }
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete ${location.city}${
                                location.state
                                  ? `, ${location.state}`
                                  : ''
                              } from your work locations?`
                            );

                            if (confirmed) {
                              deleteLocationMutation.mutate(
                                location.id
                              );
                            }
                          }}
                        >
                          {deleteLocationMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-1" />
                          )}

                          Delete
                        </Button>

                      </div>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </CardContent>
        </Card>

        {/* ---------------------------------------------------- */}
        {/* Add location */}
        {/* ---------------------------------------------------- */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Work Location
            </CardTitle>
          </CardHeader>

          <CardContent>

            <form
              onSubmit={handleAddLocation}
              className="space-y-5"
            >

              {/* GPS */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Use your current location
                    </p>

                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Automatically fill your latitude and longitude
                      using your device GPS.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      gettingLocation || !profileComplete
                    }
                    onClick={getCurrentLocation}
                  >
                    {gettingLocation ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4 mr-2" />
                    )}

                    {gettingLocation
                      ? 'Getting location...'
                      : 'Use Current Location'}
                  </Button>

                </div>

              </div>

              {/* City / State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>

                  <Input
                    id="city"
                    placeholder="e.g. Kolkata"
                    value={form.city}
                    disabled={!profileComplete}
                    onChange={(event) =>
                      updateField(
                        'city',
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">
                    State <span className="text-red-500">*</span>
                  </Label>

                  <Input
                    id="state"
                    placeholder="e.g. West Bengal"
                    value={form.state}
                    disabled={!profileComplete}
                    onChange={(event) =>
                      updateField(
                        'state',
                        event.target.value
                      )
                    }
                  />
                </div>

              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label htmlFor="latitude">
                    Latitude
                  </Label>

                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 22.5726"
                    value={form.latitude}
                    disabled={!profileComplete}
                    onChange={(event) =>
                      updateField(
                        'latitude',
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">
                    Longitude
                  </Label>

                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g. 88.3639"
                    value={form.longitude}
                    disabled={!profileComplete}
                    onChange={(event) =>
                      updateField(
                        'longitude',
                        event.target.value
                      )
                    }
                  />
                </div>

              </div>

              <p className="text-xs text-neutral-500">
                Latitude and longitude are optional, but if you
                provide one, provide both.
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  !profileComplete ||
                  addLocationMutation.isPending
                }
              >
                {addLocationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Location...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </>
                )}
              </Button>

            </form>

          </CardContent>
        </Card>

        {/* ---------------------------------------------------- */}
        {/* Explanation */}
        {/* ---------------------------------------------------- */}

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">

            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Why add multiple locations?
            </h3>

            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>
                • Get matched with jobs in different cities
              </li>
              <li>
                • Keep one location as your primary location
              </li>
              <li>
                • Improve nearby-worker matching
              </li>
              <li>
                • Update or remove locations whenever your
                availability changes
              </li>
            </ul>

          </CardContent>
        </Card>

      </div>
    </WorkerLayout>
  );
}