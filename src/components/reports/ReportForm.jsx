"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { IconCamera, IconSpinner } from "@/components/ui/icons";
import { useEdgeStore } from "@/lib/edgestore-client";
import { cn } from "@/lib/cn";
import { TYPE_META, TYPE_OPTIONS } from "@/lib/report-meta";
import { notifyError } from "@/lib/toast";
import { reportSchema } from "@/lib/validation/reportSchema";
import { LocationPicker } from "./LocationPicker";
import { isInsideRegion, regionForCityCorp } from "@/lib/city-corp-regions";

/**
 * Report creation form — one component for both report types; `type` is a
 * field, not a separate form (04-features-spec.md: "same form pattern").
 *
 * The photo uploads to EdgeStore as soon as it's chosen, and the returned URL
 * is what the form validates and submits — reports.photo_url is NOT NULL, so a
 * photo is required. Location comes from navigator.geolocation.
 */
export function ReportForm({
  cityCorporations = [],
  cityCorporationsLoading = false,
  defaultType = "hazard",
  onSubmit,
}) {
  const { edgestore } = useEdgeStore();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [locationLabel, setLocationLabel] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: defaultType,
      cityCorporationId: "",
      description: "",
      photoUrl: "",
      lat: "",
      lng: "",
    },
  });

  const selectedType = useWatch({ control, name: "type" });
  const photoUrl = useWatch({ control, name: "photoUrl" });
  const lat = useWatch({ control, name: "lat" });
  const lng = useWatch({ control, name: "lng" });
  const cityCorporationId = useWatch({ control, name: "cityCorporationId" });

  /* The chosen authority decides which area a valid pin can fall inside. */
  const region = useMemo(() => {
    const corp = cityCorporations.find((c) => c.id === cityCorporationId);
    return corp ? regionForCityCorp(corp) : null;
  }, [cityCorporations, cityCorporationId]);

  /* Switching authority can strand an already-picked pin outside the new area;
     clear it rather than submitting a point the server will reject. */
  useEffect(() => {
    if (!region || !lat || !lng) return undefined;
    if (isInsideRegion({ lat, lng }, region)) return undefined;

    /* Deferred a tick: React Compiler rejects a synchronous setState in an
       effect body, and clearing on the next tick is indistinguishable here. */
    const clear = setTimeout(() => {
      setValue("lat", "");
      setValue("lng", "");
      setLocationLabel("");
    }, 0);
    return () => clearTimeout(clear);
  }, [region, lat, lng, setValue]);


  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    clearErrors("photoUrl");

    try {
      const uploaded = await edgestore.reportPhotos.upload({
        file,
        onProgressChange: setUploadProgress,
      });
      setValue("photoUrl", uploaded.url, { shouldValidate: true });
    } catch (uploadError) {
      console.error("photo upload failed:", uploadError);
      const message = "Couldn't upload that photo. Please try again.";
      setError("photoUrl", { message });
      notifyError(message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(values) {
    const result = await onSubmit?.(values);
    if (result?.success) {
      reset();
      setUploadProgress(0);
      setLocationLabel("");
    }
    return result;
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6"
      noValidate
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-ink">
          What are you reporting?
        </legend>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TYPE_OPTIONS.map((option) => {
            const meta = TYPE_META[option.value];
            const Icon = meta.icon;
            const isSelected = selectedType === option.value;

            return (
              <label key={option.value} className="cursor-pointer">
                <input
                  type="radio"
                  value={option.value}
                  {...register("type")}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-primary",
                    isSelected
                      ? "border-brand-primary bg-brand-primary-soft text-brand-primary"
                      : "border-border-subtle bg-surface text-ink-muted hover:bg-surface-alt hover:text-ink",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>

        {errors.type ? (
          <p className="text-xs font-medium text-danger">
            {errors.type.message}
          </p>
        ) : null}
      </fieldset>

      <Select
        label="Responsible City Corporation"
        placeholder={
          cityCorporationsLoading ? "Loading…" : "Select one"
        }
        required
        disabled={cityCorporationsLoading}
        options={cityCorporations.map((corp) => ({
          value: corp.id,
          label: corp.name,
        }))}
        hint="This decides which authority sees the report."
        error={errors.cityCorporationId?.message}
        {...register("cityCorporationId")}
      />

      <Textarea
        label="What did you see?"
        rows={5}
        required
        placeholder={TYPE_META[selectedType]?.placeholder}
        hint="Specific details help the authority act — what, where exactly, and when."
        error={errors.description?.message}
        {...register("description")}
      />

      {/* Location ------------------------------------------------------- */}
      <LocationPicker
        lat={lat}
        lng={lng}
        label={locationLabel}
        region={region}
        error={errors.lat?.message ?? errors.lng?.message}
        onChange={({ lat: nextLat, lng: nextLng, label }) => {
          setLocationLabel(label);
          clearErrors(["lat", "lng"]);
          setValue("lat", nextLat, { shouldValidate: true });
          setValue("lng", nextLng, { shouldValidate: true });
        }}
      />

      <input type="hidden" {...register("lat")} />
      <input type="hidden" {...register("lng")} />

      {/* Photo ---------------------------------------------------------- */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">
          Photo
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        </span>

        {photoUrl ? (
          <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface p-3">
            <Image
              src={photoUrl}
              alt=""
              width={80}
              height={64}
              unoptimized
              className="h-16 w-20 rounded-sm object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">Photo uploaded</p>
              <p className="truncate font-mono text-xs text-ink-muted">
                {photoUrl}
              </p>
            </div>
            <label className="cursor-pointer">
              <span className="rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-alt">
                Replace
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handlePhotoChange}
              />
            </label>
          </div>
        ) : (
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-md border border-dashed bg-surface px-3 py-3 text-sm transition-colors",
              "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-primary",
              errors.photoUrl
                ? "border-danger"
                : "border-border-subtle hover:border-ink-muted/60 hover:bg-surface-alt",
            )}
          >
            {uploading ? (
              <IconSpinner className="size-5 shrink-0 text-brand-primary" />
            ) : (
              <IconCamera className="size-5 shrink-0 text-ink-muted" />
            )}
            <span className="text-ink-muted">
              {uploading
                ? `Uploading… ${uploadProgress}%`
                : "Choose a photo of the hazard or location"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={handlePhotoChange}
            />
          </label>
        )}

        <input type="hidden" {...register("photoUrl")} />

        {errors.photoUrl ? (
          <p className="text-xs font-medium text-danger">
            {errors.photoUrl.message}
          </p>
        ) : (
          <p className="text-xs text-ink-muted">
            A photo is required &mdash; it&apos;s what lets the authority act on
            this.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={isSubmitting} disabled={uploading}>
          Submit report
        </Button>
        <p className="text-xs text-ink-muted">
          It will be sent to the selected City Corporation as{" "}
          <span className="font-medium text-ink">under review</span>.
        </p>
      </div>
    </form>
  );
}

export default ReportForm;
