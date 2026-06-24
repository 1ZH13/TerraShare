import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";

type GetTokenFn = () => Promise<string | null>;
type SetTokenFn = (getter: () => string | null) => void;

async function tryGetToken(
  getToken: GetTokenFn,
  retries = 3,
  delay = 300,
): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const token = await getToken();
      if (token) return token;
    } catch {
      // ignore error
    }
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
}

export function useClerkToken(setTokenFn: SetTokenFn): boolean {
  const { user } = useUser();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user) {
      setTokenFn(() => null);
      setReady(true);
      return undefined;
    }

    // getToken lives on the auth/session resource, not UserResource; this is a
    // defensive lookup, so reach for it through a permissive cast.
    const getToken = (user as unknown as { getToken?: GetTokenFn }).getToken;
    if (typeof getToken !== "function") {
      setTokenFn(() => null);
      setReady(true);
      return undefined;
    }

    setReady(false);
    tryGetToken(getToken, 3, 300).then((token) => {
      if (active) {
        setTokenFn(() => token);
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [user, setTokenFn]);

  return ready;
}
