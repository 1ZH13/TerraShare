import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";

async function tryGetToken(getToken, retries = 3, delay = 300) {
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

export function useClerkToken(setTokenFn) {
  const { user } = useUser();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    if (!user) {
      setTokenFn(() => null);
      setReady(true);
      return undefined;
    }

    const getToken = user.getToken;
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
