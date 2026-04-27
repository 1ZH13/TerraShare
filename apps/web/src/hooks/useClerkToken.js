import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";

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
    getToken().then((token) => {
      if (active) {
        setTokenFn(() => token);
        setReady(true);
      }
    }).catch(() => {
      if (active) {
        setTokenFn(() => null);
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [user, setTokenFn]);

  return ready;
}
