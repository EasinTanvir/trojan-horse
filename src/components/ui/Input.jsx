import { useId } from "react";
import { cn } from "@/lib/cn";
import { Field, controlClasses, describedBy } from "./Field";

/**
 * Text input. React 19 passes `ref` through props, so spreading
 * `{...register("email")}` from React Hook Form onto this component works
 * without forwardRef.
 */
export function Input({
  id,
  label,
  hint,
  error,
  required = false,
  type = "text",
  className,
  fieldClassName,
  ...props
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      <input
        id={inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id: inputId, hint, error })}
        className={cn(controlClasses({ error }), "h-10", className)}
        {...props}
      />
    </Field>
  );
}

export default Input;
