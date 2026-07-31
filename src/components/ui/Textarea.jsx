import { useId } from "react";
import { cn } from "@/lib/cn";
import { Field, controlClasses, describedBy } from "./Field";

/** Multi-line input — report descriptions and the City Corp status remark. */
export function Textarea({
  id,
  label,
  hint,
  error,
  required = false,
  rows = 4,
  className,
  fieldClassName,
  ...props
}) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <Field
      id={textareaId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id: textareaId, hint, error })}
        className={cn(controlClasses({ error }), "resize-y py-2", className)}
        {...props}
      />
    </Field>
  );
}

export default Textarea;
