// Single-college product: the college's display name. Set NEXT_PUBLIC_COLLEGE_NAME
// on the deployment to show the real name; falls back to a neutral label.
export const COLLEGE_NAME = process.env.NEXT_PUBLIC_COLLEGE_NAME ?? "The College";
