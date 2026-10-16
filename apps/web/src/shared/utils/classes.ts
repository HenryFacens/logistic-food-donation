export const classes = (
  ...values: Array<false | null | string | undefined>
) => values.filter(Boolean).join(' ')

