import { useId } from "react";
import { cn } from "@/lib/cn";
import { Field, controlClasses, describedBy } from "./Field";
import { IconChevronDown } from "./icons";

/**
 * Native <select> — deliberately not a custom dropdown. On a phone in the
 * field, the OS picker is faster and more reliable than anything we'd build,
 * and it gets keyboard and screen-reader support for free.
 *
 * Pass `options` as [{ value, label }] or supply <option> children directly.
 */
export function Select({
  id,
  label,
  hint,
  error,
  required = false,
  options,
  placeholder,
  className,
  fieldClassName,
  children,
  ...props
}) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <Field
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy({ id: selectId, hint, error })}
          className={cn(
            controlClasses({ error }),
            "h-10 appearance-none pr-9",
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="">{placeholder}</option>
          ) : null}
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
      </div>
    </Field>
  );
}

export default Select;
