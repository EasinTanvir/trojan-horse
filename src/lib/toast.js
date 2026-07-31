"use client";

import toast from "react-hot-toast";

/**
 * Thin wrapper over react-hot-toast so every panel reports outcomes the same
 * way, and so no component ever passes a raw Error or a stack trace to a user.
 *
 * Rule for messages: say what happened in plain language, and if it failed, say
 * what to do next. "Couldn't submit your report. Please try again." — never
 * "Error: 500" or a serialised exception.
 */
export function notifySuccess(message) {
  return toast.success(message);
}

export function notifyError(message) {
  return toast.error(message ?? "Something went wrong. Please try again.");
}

export function notifyInfo(message) {
  return toast(message);
}

export function notifyLoading(message) {
  return toast.loading(message);
}

export function dismissToast(id) {
  toast.dismiss(id);
}

/**
 * Takes the { success, error, data } shape every Server Action returns and
 * toasts the right side of it. Returns the result so callers can branch.
 */
export function notifyActionResult(result, { success, error } = {}) {
  if (result?.success) {
    notifySuccess(success ?? "Done.");
  } else {
    notifyError(result?.error ?? error);
  }
  return result;
}

export { toast };
