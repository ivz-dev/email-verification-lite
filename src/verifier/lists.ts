import type {
  DisposableCheck,
  FreeProviderCheck,
  RoleCheck,
} from "../types.js";
import { DISPOSABLE_DOMAINS } from "../data/disposable-domains.js";
import { FREE_PROVIDERS } from "../data/free-providers.js";
import { ROLE_ACCOUNTS } from "../data/role-accounts.js";

export function checkDisposable(asciiDomain: string): DisposableCheck {
  return { isDisposable: DISPOSABLE_DOMAINS.has(asciiDomain) };
}

export function checkFreeProvider(asciiDomain: string): FreeProviderCheck {
  return { isFreeProvider: FREE_PROVIDERS.has(asciiDomain) };
}

export function checkRole(localPart: string): RoleCheck {
  // Compare on the bare local part, ignoring any "+tag" suffix and case.
  const base = localPart.toLowerCase().split("+")[0] ?? "";
  return { isRoleAccount: ROLE_ACCOUNTS.has(base) };
}
