"use client"

import { useId, useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle } from "lucide-react"
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { cn } from "@/lib/utils"

import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-6",
        "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-3 font-medium",
        "data-[variant=legend]:text-base",
        "data-[variant=label]:text-sm",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  "group/field flex w-full gap-3 data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
        horizontal: [
          "flex-row items-center",
          "[&>[data-slot=field-label]]:flex-auto",
          "has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
        responsive: [
          "flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto",
          "@md/field-group:[&>[data-slot=field-label]]:flex-auto",
          "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  required = false,
  requiredText = "(required)",
  children,
  ...props
}: React.ComponentProps<typeof Label> & {
  /** Adds a red asterisk, and "(required)" for screen readers. */
  required?: boolean
  requiredText?: string
}) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
        "has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="-ml-1 text-destructive">*</span>
          <span className="sr-only">{requiredText}</span>
        </>
      )}
    </Label>
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-xs leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance",
        "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("flex items-start gap-1.5 text-xs font-normal text-destructive", className)}
      {...props}
    >
      <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      <div>{content}</div>
    </div>
  )
}

type FormFieldControlProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = {
  field: ControllerRenderProps<TFieldValues, TName>
  fieldState: ControllerFieldState
  /** Spread onto the input: id, aria-invalid and aria-describedby. */
  controlProps: {
    id: string
    "aria-invalid": boolean
    "aria-describedby": string | undefined
  }
  /** The label's id, for a group control that needs aria-labelledby. */
  labelId: string
}

/**
 * One react-hook-form field: label above, the control, then helper or error
 * text below. The error text is the zod message for this field.
 */
function FormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>({
  control,
  name,
  label,
  description,
  required = false,
  orientation,
  className,
  render,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches react-hook-form's own Control default
  control: Control<TFieldValues, any, TTransformedValues>
  name: TName
  label: React.ReactNode
  description?: React.ReactNode
  required?: boolean
  orientation?: VariantProps<typeof fieldVariants>["orientation"]
  className?: string
  render: (props: FormFieldControlProps<TFieldValues, TName>) => React.ReactNode
}) {
  const id = useId()
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const invalid = fieldState.invalid
        const describedBy =
          [description && descriptionId, invalid && errorId]
            .filter(Boolean)
            .join(" ") || undefined
        const controlProps = {
          id,
          // A combobox button takes its name from here: axe does not follow label[for] to it
          "aria-labelledby": labelId,
          "aria-invalid": invalid,
          "aria-describedby": describedBy,
        }
        const isHorizontal = orientation === "horizontal"
        const fieldLabel = (
          <FieldLabel id={labelId} htmlFor={id} required={required}>
            {label}
          </FieldLabel>
        )
        const messages = (
          <>
            {description && (
              <FieldDescription id={descriptionId}>{description}</FieldDescription>
            )}
            {invalid && <FieldError id={errorId} errors={[fieldState.error]} />}
          </>
        )

        return (
          <Field
            data-invalid={invalid || undefined}
            orientation={orientation}
            className={className}
          >
            {isHorizontal ? (
              <>
                {render({ field, fieldState, controlProps, labelId })}
                <FieldContent>
                  {fieldLabel}
                  {messages}
                </FieldContent>
              </>
            ) : (
              <>
                {fieldLabel}
                {render({ field, fieldState, controlProps, labelId })}
                {messages}
              </>
            )}
          </Field>
        )
      }}
    />
  )
}

export {
  FormField,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
